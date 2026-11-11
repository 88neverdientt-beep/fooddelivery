# Phase 8 — Deployment and operations runbook

Review-only handoff. There is no deployed production environment and no authorization
to create one. The final readiness verdict is in `phase8-production-readiness.md`.

## Release prerequisites

Identify the real domain, hosting region/owner, approved capacity and availability
targets, database/TLS certificate chain, supported Java25 runtime, secret store, backup
retention/RPO/RTO and incident operator. Review dependency advisories again at release
time. Obtain separate approvals for the production migration and deployment.

Use the exact reviewed artifact manifest and a security-patched rollback candidate.
The historical baseline is not a public rollback release. Validate build provenance,
source revision and SHA-256; package no `.env`, private key, credential fixture, SQL
snapshot or raw test diagnostic. Do not enable a release based only on old phase counts.

## Configuration review

`deploy/application-production.example.yml` and `.env.example` require external values;
there is no fallback DB credential, administrator or signing key. Select matching RSA
keys of at least2048 bits; restrict private-key permissions to the application identity.
Plan issuer/audience and key rotation before issuing real sessions. Short access tokens
do not replace revocation: each request still validates its database session/account.

Use an app DB account with DML only on the intended schema, separate from the migrator.
Require MySQL TLS `VERIFY_IDENTITY` with a trusted server CA in the actual environment.
Local3307 uses disabled transport TLS only on loopback; that is not a production DB
security recommendation. Keep Hibernate validate, OSIV=false, show-sql=false.

Review the exact web origin allowlist. Keep CSRF and Secure/HttpOnly/Strict refresh
cookies; map the cookie path when proxying `/api/auth`. Do not store tokens in browser
storage. Keep backend and management private, block public actuator, and do not enable
forwarded-header trust without a reviewed trusted-proxy model.

`deploy/nginx-production.example.conf` and its proxy include use example.invalid hosts
and secret paths. Validate syntax with `nginx -t` on the eventual target; nginx was not
installed or executed on this Windows workspace. The local Node gateway is an isolated
staging harness, not a general production proxy. Validate the real public CA chain,
hostname, renewal, HTTPS redirect, TLS policy and firewall before use. Only extend HSTS
after real-domain HTTPS is verified; no preload or includeSubDomains was enabled here.

## Migration and cutover

Before any approved production expansion: read-only preflight of actual IDs/types,
constraints/data, immutable backup, fresh-target restore rehearsal, maintenance/writer
drain, and an explicitly reviewed production migration. The Stage8 SQL hard-refuses
production and must not be edited into a production migration casually. MySQL DDL
implicit commits require step-by-step status recording and partial-failure handling.

Apply only an approved expansion, validate schema, deploy config/JAR/static build as
one identified release, probe readiness privately and run a controlled owner-checked
smoke flow. Strict preconditions require the matching UI/consumers. Production
strict-mode activation has not been approved by this work; the review template retains
compatibility mode until a separate consumer/rollout approval. Legacy profile DELETE
disable APIs cannot supply a revision and return428 in strict mode; the current
Admin UI uses versioned account-status PUT. Inventory external consumers before rollout.
Keep writers stopped if any schema/health/security/integrity gate fails.

## Observability and incident response

Structured application logs include request ID, method, status and duration. Gateway
logs exclude URLs/query strings/bodies. Error handling records exception class without
raw SQL/body/secret messages. Restrict access and retention; operational IDs and startup
datasource metadata still deserve protection. This is correlation, not distributed
tracing or a durable operator audit ledger.

Expose only summary health/liveness/readiness privately. Metrics require ADMIN JWT with
a live session, on the separate loopback management port. Monitor request error rates,
latency, JVM memory/GC, disk, MySQL connections/slow statements, Hikari active/pending,
process restarts, refresh replay/revocation and TLS/backup expiry. Refresh monitoring
credentials safely; never place bearer tokens in scrape URLs or logs.

Before public service, connect a chosen monitoring/alert destination, assign an on-call
owner and test alert delivery. Define production alert thresholds from approved SLOs;
the local 1/3/5-user acceptance thresholds are not production availability promises.
No external monitoring account, paid service or alert integration was configured here.

## Failure and rollback

On uncertainty after checkout/payment/delivery/status mutations, read the committed
state before taking action; never automatically replay a request. Preserve relevant
correlation IDs and evidence. Follow `phase8-rollback-plan.md` and backup/restore
rehearsal evidence. Stopping a Windows test process does not validate production
connection draining, multiple instances, failover or recovery objectives.

Production deployment, schema changes, public DNS/TLS and infrastructure costs remain
separate approvals. This runbook itself performs none of them.
