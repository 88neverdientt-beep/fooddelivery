# Food-Delivery / HanoiFood

Java 25 / Spring Boot 4.1.1 / MySQL 8 backend and React / TypeScript / Vite frontend.
Four account roles: CUSTOMER, RESTAURANT, DRIVER and ADMIN. The existing COD ordering,
restaurant preparation, driver delivery and administrator reporting flows are retained.

## Current work: Phase 8

Local backend verification: 172 JUnit tests, zero failures/errors/skips. Frontend:
309 unit/component tests plus typecheck, lint, formatting and production build pass.
Cross-browser, performance and operational rehearsal have separate evidence gates;
read [Phase8 handover](docs/phase8-result.md) for the final verdict, not old baseline counts.

**Do not start the new binary against the existing MySQL80/fooddelivery schema.**
The four version columns are approved and rehearsed only on the independent Stage8
schema at127.0.0.1:3307. No production migration or deployment is authorized.
Hibernate must remain `ddl-auto=validate`; OSIV remains false. Never use update/create
against an existing database to make startup pass.

## Configuration and local work

Select JDK25 and Maven3.9.16 per process. Supply DB credentials and matching RSA key
paths through protected external configuration; there is no default administrator,
password or signing key. Review [staging instructions](docs/phase8-staging-guide.md)
and the external test harness before starting any process or integration test.
The test environment has its own MySQL datadir, schema, limited users, ports and keys.

Frontend commands from `frontend`: `npm ci`, `npm run dev`, `npm run test`,
`npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.
API transport defaults to same-origin `/api`; access tokens stay in memory.
See [frontend README](frontend/README.md) for routes, role workspaces and E2E fixtures.

MySQL integration tests require the explicit approved target flags and external test
credentials; disabled integration tests do not constitute a full pass. See
[CI readiness](deploy/ci-readiness.md) and the zero-skip XML report gate in `scripts`.

## Handover documents

The 11 November 2026 full-system audit adds session-race, Driver date-boundary and
fractional-price display regressions. Current baseline: 178 backend tests and315
frontend tests. Read the [full-audit result](docs/full-audit-result.md),
[new test results](docs/full-audit-test-results.md) and
[production gate](docs/full-audit-production-readiness.md). Phase8 reports below
remain historical evidence, not the latest test run. No production release is approved.

* [Architecture](docs/phase8-architecture-audit.md) and [security](docs/phase8-security-audit.md).
* [CAS/ABA scope and approved DDL](docs/phase8-cas-proposal.md).
* [Database integrity](docs/phase8-database-integrity.md) and [performance](docs/phase8-performance-results.md).
* [Cross-browser](docs/phase8-cross-browser.md) and [test results](docs/phase8-test-results.md).
* [Backup/restore](docs/phase8-backup-restore.md), [rollback](docs/phase8-rollback-plan.md)
  and [deployment runbook](docs/phase8-deployment-runbook.md).
* [Production readiness](docs/phase8-production-readiness.md) and [changed files](docs/phase8-files.txt).

Deployment examples under `deploy` are review templates. They were not applied to a
public server. Keep private keys, environment files, fixture credentials and SQL
backups outside Git. No commit, push or production deployment is performed by this work.
