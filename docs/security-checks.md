# Security checks

Run `npm run security:staged` (or `node scripts/security-gate.mjs`) before a commit.
`npm run security:hooks` enables the local pre-commit hook; it refuses to replace
existing hooks. Git does not distribute local hook settings. New clones must opt
in with that command. No global or automatic installation hooks are installed.

The gate scans the Git index with Gitleaks 8.30.1, blocks tracked credential files,
runtime state and node_modules, checks local security archives against their source,
and audits staged npm locks. It fails if the scanner or registry check is unavailable.
Use the official checksum-verified Gitleaks 8.30.1 binary on PATH or set
SECURITY_GITLEAKS to it. npm dependency edits must include their updated lock.

Run `npm run security:check` for the complete dependency inventory in this repository.
It queries npm audit and OSV for exact npm/Python/Deno locks and Maven-resolved
versions. The source files and raw matches are retained in ignored artifacts.
No severity filter or generic advisory waiver is used. One narrowly pinned
prototype-key deepmerge backport, when present, is reported explicitly with the
original advisory and exact source/archive verification. A new advisory still fails.

PR/push CI repeats the secret and dependency checks; Monday scans catch newly
published advisories. Public repositories also get CodeQL. Required branch checks
must be configured on GitHub after the workflow registers its job names. Git hooks
can be bypassed; they are not a server-side enforcement boundary. Secret history
and container/host scans are separate from the current-file/dependency checks.

Dependency installation defaults to no lifecycle scripts, exact saves, and a
seven-day release-age gate. Keep npm locks in version control; use npm ci. Review
source, provenance and compatibility before deliberately rebuilding a package or
accepting an urgent fresh release. Existing exact reviewed locks are intentional.
No check certifies unknown vulnerabilities or a newly published package as benign.

Local security compatibility packages, if present under scripts/security, include
reviewable source, upstream attribution, packed inputs and checksum receipts. They
preserve the actual legacy caller interfaces and are temporary until upstream tools
support patched dependencies directly. Their use is not a claim that upstream was
fixed. Review those small patches when updating the toolchain.
