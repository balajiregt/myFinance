# Security remediation: 31 October 2026

Update affected locks and add staged secret checks, lock consistency checks, read-only security CI, weekly advisory scans and Dependabot configuration.

Validation: npm/OSV dependency inventory, staged-source secret gate and workflow syntax checks.

Known advisory check: 0 exact/resolved dependency coordinates; 0 npm lock audit(s); 0 npm findings; 0 unaddressed OSV coordinates. Verified local backport coordinates retained explicitly: 0. This is a dated advisory result, not a security certification.

Application-specific browser, external API, deployment and container reachability tests were not run unless recorded separately.

The commit hook is enabled per checkout only. Pull-request and scheduled CI repeat the checks. Required GitHub branch checks must be configured after their job names register; adding this workflow alone does not enforce branch protection. Review security updates before merging; no automatic merge or deployment is enabled by this change.
