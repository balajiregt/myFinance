#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import path from 'node:path';
const run = (...args) => spawnSync('git', args, { encoding: 'utf8' });
const root = run('rev-parse', '--show-toplevel');
if (root.status) throw new Error('Run this inside the repository');
process.chdir(root.stdout.trim());
const current = run('config', '--get', 'core.hooksPath').stdout.trim();
if (current && current !== '.githooks') throw new Error('An existing hooksPath is configured; integrate the security task into it manually. Nothing was replaced.');
const existing = run('rev-parse', '--git-path', 'hooks/pre-commit').stdout.trim();
if (!current && existsSync(existing)) throw new Error('An existing pre-commit hook is installed; integrate the security task manually. Nothing was replaced.');
chmodSync(path.resolve('.githooks/pre-commit'), 0o755);
if (run('config', '--local', 'core.hooksPath', '.githooks').status) throw new Error('Could not enable the local hook');
console.log('Security pre-commit hook enabled for this checkout only.');
