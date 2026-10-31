#!/usr/bin/env node
// Scan the Git index, not unstaged files. Never print matching secret values.
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error) throw new Error(`${command} could not run (${result.error.code || 'error'})`);
  return result;
}
function git(args) {
  const result = run('git', args);
  if (result.status !== 0) throw new Error('Cannot inspect the Git index');
  return result.stdout;
}
const all = process.argv.includes('--all');
const secretsOnly = process.argv.includes('--secrets-only');
try {
  const root = git(['rev-parse', '--show-toplevel']).trim();
  process.chdir(root);
  const submodules = new Set(git(['ls-files', '--stage', '-z']).split('\0').filter(entry => entry.startsWith('160000 ')).map(entry => entry.slice(entry.indexOf('\t') + 1)));
  const files = git(all ? ['ls-files', '-z'] : ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']).split('\0').filter(file => file && !submodules.has(file));
  const forbidden = files.filter(file => /(^|\/)(node_modules|\.auth|\.aws|\.ssh|\.runtime)(\/|$)/.test(file)
    || /(^|\/)\.env(?:$|\.)/.test(file) && !/\.env\.(example|sample|template)$/.test(file)
    || /(^|\/)(id_rsa|id_ed25519|credentials\.json|service-account[^/]*\.json)$/.test(file)
    || /(^|\/)(auth|storage-state|storageState)\.json$/.test(file)
    || /\.(p12|pfx|key)$/.test(file));
  if (forbidden.length) throw new Error('Credential/runtime/dependency files are tracked or staged:\n' + forbidden.join('\n'));
  const verifier = path.join(home, 'scripts/security_verify.py');
  if (existsSync(verifier) && run('python3', [verifier, '--root', root, '--staged']).status !== 0) throw new Error('Local security package archive verification failed');
  const embedded = new Map();
  for (const receipt of git(['ls-files', '-z']).split('\0').filter(file => /(^|\/)scripts\/security\/local-security-packages\.json$/.test(file))) {
    if (!existsSync(verifier)) throw new Error('Local security package verifier is missing');
    for (const entry of JSON.parse(git(['show', ':' + receipt]))) {
      const base = path.posix.dirname(receipt);
      embedded.set(path.posix.join(base, entry.source, 'package.json'), {
        lock: path.posix.join(base, '../..', 'package-lock.json'),
        archive: path.posix.join(base, entry.archive)
      });
    }
  }
  for (const manifest of files.filter(file => path.basename(file) === 'package.json')) {
    const staged = JSON.parse(git(['show', ':' + manifest]));
    const prior = run('git', ['show', 'HEAD:' + manifest]);
    const before = prior.status === 0 ? JSON.parse(prior.stdout) : {};
    const fields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'overrides'];
    const dependenciesChanged = fields.some(field => JSON.stringify(staged[field] || {}) !== JSON.stringify(before[field] || {}));
    const packaged = embedded.get(manifest);
    const lock = packaged?.lock || path.posix.join(path.posix.dirname(manifest), 'package-lock.json');
    if (dependenciesChanged && !files.includes(lock)) throw new Error(`Stage the updated package-lock.json with dependency changes: ${manifest}`);
    if (packaged) {
      const consumer = JSON.parse(git(['show', ':' + lock]));
      const relative = path.posix.relative(path.posix.dirname(lock), packaged.archive);
      if (!Object.values(consumer.packages || {}).some(value => value.resolved === 'file:' + relative || value.resolved === relative)) throw new Error(`Consumer lock does not include the verified local package: ${manifest}`);
    }
  }
  const bundled = path.join(home, 'artifacts/tools/gitleaks-8.30.1/gitleaks');
  const scanner = process.env.SECURITY_GITLEAKS || (existsSync(bundled) ? bundled : 'gitleaks');
  const version = run(scanner, ['version']);
  if (version.status !== 0 || version.stdout.trim() !== '8.30.1') throw new Error('Install the verified Gitleaks 8.30.1 scanner (see docs/security-maintenance.md)');
  let snapshot;
  try {
    if (all) {
      snapshot = mkdtempSync(path.join(tmpdir(), 'security-index-'));
      for (const file of files) {
        const destination = path.join(snapshot, file);
        mkdirSync(path.dirname(destination), { recursive: true });
        // Git symlinks become plain text; the scanner never follows links outside
        // the repository or reads an unstaged working copy.
        const descriptor = openSync(destination, 'w');
        try {
          const content = run('git', ['show', ':' + file], { stdio: ['ignore', descriptor, 'pipe'] });
          if (content.status !== 0) throw new Error('Cannot read the Git index');
        } finally { closeSync(descriptor); }
      }
    }
    const scan = run(scanner, [all ? 'dir' : 'git', '--redact=100', '--no-banner', '--no-color', '--ignore-gitleaks-allow',
      '--config', path.join(home, '.gitleaks.toml'), ...(!all ? ['--pre-commit', '--staged'] : []), snapshot || root]);
    if (scan.status !== 0) throw new Error('Secret scan failed or detected a potential secret. Review locally with Gitleaks --redact=100; no secret values were printed by this task.');
  } finally { if (snapshot) rmSync(snapshot, { recursive: true, force: true }); }
  let audited = 0;
  for (const lock of files.filter(file => path.basename(file) === 'package-lock.json')) {
    const folder = mkdtempSync(path.join(tmpdir(), 'security-lock-'));
    try {
      const manifest = path.posix.join(path.posix.dirname(lock), 'package.json');
      const locked = JSON.parse(git(['show', ':' + lock]));
      const declared = JSON.parse(git(['show', ':' + manifest]));
      if (locked.packages?.['']) {
        for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
          const names = new Set([...Object.keys(declared[field] || {}), ...Object.keys(locked.packages[''][field] || {})]);
          if ([...names].some(name => declared[field]?.[name] !== locked.packages[''][field]?.[name])) throw new Error(`Manifest and lock disagree: ${manifest}`);
        }
      }
      if (secretsOnly) continue;
      writeFileSync(path.join(folder, 'package-lock.json'), JSON.stringify(locked));
      writeFileSync(path.join(folder, 'package.json'), JSON.stringify(declared));
      const audit = run('npm', ['audit', '--package-lock-only', '--ignore-scripts', '--json', '--userconfig=/dev/null',
        '--registry=https://registry.npmjs.org', '--fetch-retries=0', '--fetch-timeout=45000'], { cwd: folder });
      let data;
      try { data = JSON.parse(audit.stdout); } catch { throw new Error(`Dependency audit incomplete: ${lock}`); }
      if (![0, 1].includes(audit.status) || !data.metadata?.vulnerabilities) throw new Error(`Dependency audit incomplete: ${lock}`);
      if (data.metadata.vulnerabilities.total) throw new Error(`Dependency audit blocked ${lock}: ${data.metadata.vulnerabilities.total} affected packages. Run npm audit locally to review.`);
      audited++;
    } finally { rmSync(folder, { recursive: true, force: true }); }
  }
  console.log(`Security gate passed: ${all ? 'tracked' : 'staged'} files, secret scan, ${audited} npm lock audit(s).`);
  if (submodules.size) console.log(`${submodules.size} submodule pointer(s) require checks in their own repositories; their content was not scanned here.`);
} catch (error) {
  console.error('Security gate blocked: ' + (error instanceof SyntaxError ? 'Invalid dependency JSON; content suppressed' : error.message));
  process.exitCode = 1;
}
