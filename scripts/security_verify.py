#!/usr/bin/env python3
"""Verify local security-package archives against their reviewable source."""
import hashlib
import argparse
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import tarfile


def verify(root, staged=False, details=False):
    root = Path(root)
    def read(path):
        if staged:
            result = subprocess.run(['git', 'show', ':' + path.as_posix()], cwd=root, capture_output=True, check=True)
            return result.stdout
        return (root / path).read_bytes()
    if staged:
        names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
        receipts = [Path(p) for p in names if p.endswith('/scripts/security/local-security-packages.json') or p == 'scripts/security/local-security-packages.json']
    else:
        receipts = []
        import os
        for folder, dirs, files in os.walk(root):
            dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', 'artifacts', 'resources', '.venv', 'target', '.next'}]
            if 'local-security-packages.json' in files:
                receipts.append((Path(folder) / 'local-security-packages.json').relative_to(root))
    count = 0
    verified = []
    for receipt in receipts:
        for package in json.loads(read(receipt)):
            for field in ('archive', 'source'):
                value = PurePosixPath(package[field])
                if value.is_absolute() or '..' in value.parts:
                    raise ValueError('Unsafe local security package path')
            archive = read(receipt.parent / package['archive'])
            if hashlib.sha256(archive).hexdigest() != package['sha256']:
                raise ValueError('Security archive checksum mismatch: ' + str(receipt))
            with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as packed:
                for member in packed.getmembers():
                    path = PurePosixPath(member.name)
                    if not member.isfile() or path.parts[0] != 'package' or '..' in path.parts:
                        raise ValueError('Unexpected security archive member')
                    source = receipt.parent / package['source'] / Path(*path.parts[1:])
                    if packed.extractfile(member).read() != read(source):
                        raise ValueError('Security archive differs from source: ' + str(source))
            count += 1
            verified.append({**package, 'receipt': str(receipt),
                             'sourceDigest': hashlib.sha256(read(receipt.parent / package['source'] / 'index.cjs')).hexdigest()})
    return verified if details else count


if __name__ == '__main__':
    try:
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
        parser.add_argument('--staged', action='store_true')
        args = parser.parse_args()
        count = verify(args.root, args.staged)
        print(f'Verified {count} local security package archive(s).')
    except Exception as error:
        print('Local security package verification failed: ' + type(error).__name__, file=sys.stderr)
        sys.exit(1)
