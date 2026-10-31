#!/usr/bin/env python3
"""Audit this repository's locked npm/Python and resolved Maven dependencies.

No npm installations or lifecycle scripts. Resolution/network errors fail closed.
Reports retain raw advisory matches; no blanket severity or package exclusions.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import urllib.request
from security_verify import verify

ROOT = Path(__file__).resolve().parents[1]
PRUNE = {'.git', 'node_modules', '.venv', 'venv', 'artifacts', 'resources', 'target',
         'dist', 'build', '.runtime', '__pycache__', '.next', '.cache'}


def command(args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, timeout=180, **kwargs)
    if result.returncode not in (0, 1):
        raise RuntimeError('Command failed: ' + args[0])
    return result


def main():
    local_packages = verify(ROOT, details=True)
    output = ROOT / 'artifacts/security-audit'
    output.mkdir(parents=True, exist_ok=True)
    coordinates = {}
    audits = []
    poms = []

    def add(eco, name, version, source):
        if name and version and not version.startswith(('file:', 'link:')):
            coordinates.setdefault((eco, name, version), set()).add(source)

    for package in local_packages:
        if package.get('upstream'):
            upstream = package['upstream']
            add(upstream['ecosystem'], upstream['name'], upstream['version'], 'local backport: ' + package['receipt'])

    for folder, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in PRUNE and not Path(folder, d).is_symlink()]
        base = Path(folder)
        if 'pom.xml' in files:
            poms.append(base / 'pom.xml')
        if 'deno.lock' in files:
            source = str((base / 'deno.lock').relative_to(ROOT))
            locked = json.loads((base / 'deno.lock').read_text())
            for coordinate in locked.get('npm', {}):
                name, version = coordinate.rsplit('@', 1)
                add('npm', name, version, source)
        if 'package-lock.json' in files:
            source = str((base / 'package-lock.json').relative_to(ROOT))
            lock = json.loads((base / 'package-lock.json').read_text())
            if lock.get('packages') is None:
                raise RuntimeError('Regenerate the legacy npm lock before auditing: ' + source)
            for location, package in lock['packages'].items():
                if location and not package.get('link'):
                    add('npm', package.get('name') or location.rsplit('node_modules/', 1)[-1], package.get('version'), source)
            audit = command(['npm', 'audit', '--package-lock-only', '--ignore-scripts', '--json',
                             '--userconfig=/dev/null', '--registry=https://registry.npmjs.org',
                             '--fetch-retries=0', '--fetch-timeout=45000'], cwd=base)
            data = json.loads(audit.stdout)
            if 'metadata' not in data:
                raise RuntimeError('npm audit incomplete: ' + source)
            (output / ('npm-' + str(len(audits)) + '.json')).write_text(json.dumps(data, indent=2))
            audits.append({'source': source, 'vulnerabilities': data['metadata']['vulnerabilities']})
        for name in files:
            if name.startswith('requirements') and name.endswith(('.txt', '.lock')):
                source = str((base / name).relative_to(ROOT))
                for line in (base / name).read_text().splitlines():
                    match = re.match(r'^([A-Za-z0-9_.-]+)==([^\s\\;]+)', line)
                    if match:
                        add('PyPI', *match.groups(), source)

    # Resolve only root POMs; Maven includes each root's child modules.
    roots = [p for p in poms if not any(parent / 'pom.xml' in poms for parent in p.parents if parent != p.parent)]
    for stale in output.glob('maven-*.txt'):
        stale.unlink()
    for number, pom in enumerate(roots):
        tree = output / ('maven-' + str(number) + '.txt')
        tree.unlink(missing_ok=True)
        result = command(['mvn', '-B', '-ntp', 'org.apache.maven.plugins:maven-dependency-plugin:3.8.1:tree',
                          '-DoutputType=text', '-DoutputFile=' + str(tree), '-DappendOutput=true'], cwd=pom.parent)
        (output / ('maven-' + str(number) + '.log')).write_text(result.stdout + result.stderr)
        if result.returncode or not tree.is_file():
            raise RuntimeError('Maven dependency resolution incomplete: ' + str(pom.relative_to(ROOT)))
        for line in tree.read_text().splitlines():
            fields = re.sub(r'^[| +\\-]+', '', line).strip().split(':')
            if len(fields) in (5, 6):
                add('Maven', ':'.join(fields[:2]), fields[-2], str(pom.relative_to(ROOT)))

    entries = [{'ecosystem': eco, 'name': name, 'version': version, 'sources': sorted(sources)}
               for (eco, name, version), sources in sorted(coordinates.items())]
    results = []
    for start in range(0, len(entries), 300):
        batch = entries[start:start + 300]
        request = urllib.request.Request('https://api.osv.dev/v1/querybatch',
            data=json.dumps({'queries': [{'package': {'ecosystem': p['ecosystem'], 'name': p['name']}, 'version': p['version']} for p in batch]}).encode(),
            headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=60) as response:
            data = json.load(response)
        if len(data.get('results', [])) != len(batch):
            raise RuntimeError('Incomplete OSV response')
        results.extend({**package, 'advisories': result.get('vulns', [])} for package, result in zip(batch, data['results']))
    raw_matches = [p for p in results if p['advisories']]
    findings = []
    backports = []
    for match in raw_matches:
        allowed = set()
        # One reviewed backport only. A generic receipt cannot suppress arbitrary
        # packages/advisories, and any new advisory remains a failure.
        receipts = [p for p in local_packages if p.get('upstream') == {
            'ecosystem': 'npm', 'name': 'deepmerge', 'version': '4.3.1', 'advisory': 'GHSA-gcqx-w48m-w2h4'}
            and p['sourceDigest'] == '8f2c3e224dedbcd6acd88ba1cad28f45bf6bcc2d30f900fe01930896718c7c08']
        if (match['ecosystem'], match['name'], match['version']) == ('npm', 'deepmerge', '4.3.1') and receipts:
            sources = {'local backport: ' + p['receipt'] for p in receipts}
            if all(source in sources for source in match['sources']):
                allowed.add('GHSA-gcqx-w48m-w2h4')
        remaining = [a for a in match['advisories'] if a['id'] not in allowed]
        verified = [a for a in match['advisories'] if a['id'] in allowed]
        if remaining:
            findings.append({**match, 'advisories': remaining})
        if verified:
            backports.append({**match, 'advisories': verified})
    summary = {'coordinatesChecked': len(entries), 'matchedCoordinates': len(raw_matches),
               'unaddressedCoordinates': len(findings), 'verifiedLocalBackports': backports, 'npmAudits': audits,
               'mavenRoots': len(roots)}
    (output / 'osv-results.json').write_text(json.dumps(results, indent=2))
    (output / 'summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))
    for finding in findings:
        print(f"{finding['ecosystem']} {finding['name']}@{finding['version']}: " + ', '.join(a['id'] for a in finding['advisories']))
    return int(bool(findings) or any(a['vulnerabilities']['total'] for a in audits))


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.SubprocessError) as error:
        print('Security audit incomplete: ' + (str(error) if isinstance(error, RuntimeError) else type(error).__name__), file=sys.stderr)
        sys.exit(2)
