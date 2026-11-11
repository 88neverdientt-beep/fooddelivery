# Phase 8 — Rollback plan

No production migration or deployment has been approved. This plan does not authorize
either operation. Rehearsal results are recorded in `phase8-backup-restore.md`.

The approved expansion adds only four non-null BIGINT version columns with default0.
MySQL ALTER TABLE implicitly commits. A multi-table DDL sequence is not atomic; reject
already/partially migrated schemas and inspect each step before retry. Do not drop
version columns as an automatic rollback. The new binary requires all four columns;
an old binary ignores them, but cannot enforce the new revision semantics.

Before release, freeze and hash JAR/frontend/config, preserve the last security-patched
known-good artifact, verify a consistent backup and practice restore on a separate DB.
Drain writers before switching artifacts/config. Restore the known-good config and
binary together, retain expanded columns, validate schema and run read-only health,
authentication and ownership smoke tests before allowing writes.

Rollback from strict mode to compatibility mode removes mandatory preconditions.
Treat it as an explicit temporary risk decision, not as equivalent concurrency protection.
No blind frontend retries or replay of uncertain checkout/payment/delivery requests.
Reconcile committed state first.

The historical baseline binary is useful only for isolated read-compatibility rehearsal.
It contains the pre-patch dependency set and must not become a public rollback release.
A future production release needs a security-patched rollback candidate and a rehearsal
on the eventual infrastructure. Local Windows process termination does not demonstrate
Linux load-balancer draining or distributed in-flight request guarantees.

Database restore is a separate incident decision: stop writers, preserve current data
for forensics, identify recovery point/RPO, verify backup hash, restore to a fresh target,
compare rows/constraints and run application validation. Never overwrite the only copy
of production, and never point a rehearsed test restore at3306.
