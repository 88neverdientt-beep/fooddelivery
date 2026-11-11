# CI/CD handoff

No remote pipeline or deployment was enabled. The repository has GitHub and GitLab remotes;
select the authoritative provider and protected runner before enabling automation.
Never expose an integration runner, credentials or the signing key to fork pull requests.

## Unprivileged build job

Use a pinned JDK 25 distribution, Maven wrapper 3.9.16, Node compatible with
`frontend/package.json`, locked `npm ci`, and isolated disposable work directories.
Run these database-free classes explicitly rather than allowing disabled integration
tests to masquerade as a full green build:

```text
./mvnw -Dtest=AuthModelTest,LoginLimiterTest,Phase8FoundationTest,Phase8MvcContractTest,Phase8RestaurantDateTest,FullAuditDriverDateTest,FullAuditTargetGuardTest,BackendServiceTest,ReadQueryTest,ApiBindingUnitTest test
npm --prefix frontend run test
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend run build
npm --prefix frontend audit --omit=dev --audit-level=high
```

The explicit Java subset contains 80 tests at this revision. Start from a clean
`target/surefire-reports` on a disposable runner, then invoke
`scripts/verify-test-reports.ps1 -Reports target/surefire-reports -ExpectedTests 80`.
The locally executed full gate contains 178 tests; it is a separate gate.

## Protected integration and release job

The present MySQL tests deliberately whitelist Windows, port 3307, the independent
test datadir and approved test schema. Do not remove those guards to make a hosted
runner green. Provision an equivalent isolated runner or separately review a portable
test harness before claiming CI integration support.

Use external ephemeral DB credentials, external RSA keys, `ddl-auto=validate`, schema
rehearsal before application startup, a fresh fixture corpus, and all existing run flags
documented in `docs/phase8-staging-guide.md`. Run full Maven package and require exactly
178 tests with zero failures/errors/skips using the report gate. Verify reports are
from the current invocation, not cached artifacts. Then run the 70 existing Playwright
cases separately for Chromium, Firefox and WebKit and the additional Phase8 strict-mode
five cases per engine using `--config playwright.phase8.config.ts` after switching the isolated backend
to strict mode. A maintenance pause or interrupted run is not a pass. A nonzero browser
failure/skip/error count blocks release, including platform limitations; do not whitelist
WebKit's observed SameSite=None result merely to make this job green.

The full-audit target is explicitly allowlisted as `fooddelivery_full_audit` on the
same isolated3307/datadir. It is a separate clone; do not repoint the runner to a
historical database to avoid provisioning the target. New strict coverage includes
fractional menu/cart/checkout amounts without changing backend pricing rules.

Run current source/history/artifact secret scans and an SBOM-based vulnerability scan;
review unresolved dev-only advisories. Keep logs/reports/screenshots in protected artifacts
with retention and access controls. Never upload credential files, keys, cookies or SQL
backups to public CI artifacts. Package only the JAR, built static assets and reviewed
deployment templates, and publish a SHA-256 manifest.

Deployment requires a separate manual approval, verified target identity, database
backup/restore gate, migration approval, TLS/domain validation and a rollback candidate.
No command in this document applies a production migration or deploys a release.
