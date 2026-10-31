import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const gate = fileURLToPath(new URL('./security-gate.mjs', import.meta.url));
function fixture(body) {
  const folder = mkdtempSync(path.join(tmpdir(), 'security-gate-test-'));
  const git = (...args) => {
    const result = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', ...args], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    git('init', '-q');
    body({ folder, git, check: (options = {}) => spawnSync(process.execPath, [gate], { cwd: folder, encoding: 'utf8', ...options }) });
  } finally { rmSync(folder, { recursive: true, force: true }); }
}
test('scans staged content even when the working copy was cleaned', () => fixture(({ folder, git, check }) => {
  // A synthetic, unusable token tests the scanner without containing a real secret.
  const token = ['ghp', '6mD9qX2cV8bN1aS5fG7hJ3kL0pQ4rT9uW2yZ'].join('_');
  writeFileSync(path.join(folder, 'fixture.txt'), `token=${token}\n`);
  git('add', 'fixture.txt');
  writeFileSync(path.join(folder, 'fixture.txt'), 'clean working copy\n');
  const result = check();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Secret scan failed/);
  assert.ok(!result.stderr.includes(token) && !result.stdout.includes(token));
}));
test('ignores an unstaged synthetic secret', () => fixture(({ folder, git, check }) => {
  writeFileSync(path.join(folder, 'fixture.txt'), 'clean staged content\n');
  git('add', 'fixture.txt');
  writeFileSync(path.join(folder, 'fixture.txt'), ['ghp', '6mD9qX2cV8bN1aS5fG7hJ3kL0pQ4rT9uW2yZ'].join('_'));
  assert.equal(check().status, 0);
}));
test('blocks environment files and dependency trees', () => fixture(({ folder, git, check }) => {
  mkdirSync(path.join(folder, 'node_modules'));
  writeFileSync(path.join(folder, 'node_modules/vendor.js'), '// dummy\n');
  writeFileSync(path.join(folder, '.env'), 'DUMMY=true\n');
  git('add', '.env', 'node_modules/vendor.js');
  assert.match(check().stderr, /Credential\/runtime\/dependency files/);
}));
test('requires a lockfile when staged dependencies change', () => fixture(({ folder, git, check }) => {
  writeFileSync(path.join(folder, 'package.json'), JSON.stringify({ dependencies: { example: '1.0.0' } }));
  git('add', 'package.json');
  assert.match(check().stderr, /Stage the updated package-lock/);
}));
for (const [label, output, status] of [
  ['known vulnerability', {metadata:{vulnerabilities:{total:1}}}, 1],
  ['unavailable advisory service', {error:{code:'OFFLINE'}}, 1],
]) {
  test(`fails closed for ${label}`, () => fixture(({folder, git, check}) => {
    const manifest={name:'synthetic-fixture',version:'1.0.0'};
    writeFileSync(path.join(folder,'package.json'),JSON.stringify(manifest));
    writeFileSync(path.join(folder,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':manifest}}));
    git('add','package.json','package-lock.json');
    const bin=path.join(folder,'bin');mkdirSync(bin);
    writeFileSync(path.join(bin,'npm'),`#!/bin/sh\nprintf '%s' '${JSON.stringify(output)}'\nexit ${status}\n`,{mode:0o755});
    const result=check({env:{...process.env,PATH:bin+path.delimiter+process.env.PATH}});
    assert.equal(result.status,1);assert.match(result.stderr,/Dependency audit (blocked|incomplete)/);
  }));
}
test('suppresses malformed dependency content in diagnostics', () => fixture(({folder,git,check})=>{
  const dummy='synthetic-private-value';
  writeFileSync(path.join(folder,'package.json'),`{invalid: ${dummy}}`);git('add','package.json');
  const result=check();assert.equal(result.status,1);assert.match(result.stderr,/Invalid dependency JSON/);
  assert.ok(!result.stdout.includes(dummy)&&!result.stderr.includes(dummy));
}));
test('blocks a manifest that disagrees with its staged lock', () => fixture(({folder,git,check})=>{
  writeFileSync(path.join(folder,'package.json'),JSON.stringify({dependencies:{example:'2.0.0'}}));
  writeFileSync(path.join(folder,'package-lock.json'),JSON.stringify({lockfileVersion:3,packages:{'':{dependencies:{example:'1.0.0'}}}}));
  git('add','package.json','package-lock.json');
  const result=check();assert.equal(result.status,1);assert.match(result.stderr,/Manifest and lock disagree/);
}));
