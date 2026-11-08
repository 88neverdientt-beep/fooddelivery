# Stage 2, step 1: manual auth migration

No script runs on application startup. No Flyway/Liquibase dependency is introduced.

1. Stop profile writers; retain a verified backup. Use only the approved isolated MySQL
   instance on port 3307, schema fooddelivery_stage2_rehearsal and its separate datadir.
2. Run `00_preflight_readonly.sql` or `AuthMigrationPreflight`. All email/hash/ID findings
   must be resolved with approval BEFORE installing helper routines or running DDL.
   Counts/references may be reported; never print credentials or hashes.
3. Run `01_expand_auth.sql` using a migration operator scoped to this TEST schema,
   then `02_backfill_accounts.sql`, without mysql --force. Routine creation requires
   CREATE ROUTINE/ALTER ROUTINE; the application account must not have these rights.
4. Inspect the new schema, record counts and verify each Account matches exactly one
   role/profile. Hashes are copied verbatim; never hash a hash or auto-convert invalid data.
5. Enable `fooddelivery.auth.persistence-enabled=true` ONLY after successful migration,
   with Hibernate ddl-auto=validate. Default false preserves Stage 1's 13-entity schema.
   Existing SecurityConfiguration and business endpoints are unchanged in this step.
6. Run opt-in tests with RUN_STAGE2_AUTH_SCHEMA_TESTS=true, STAGE2_MYSQL_PASSWORD
   (stage2_app, DML only) and STAGE2_MIGRATION_PASSWORD (stage2_migrator, scoped DDL).
   Stage 1 regression writes use this SAME rehearsal database, RUN_STAGE1_MYSQL_TESTS=true,
   and auth persistence disabled. STAGE1_MYSQL_PASSWORD is used ONLY by the read-only
   incident preflight against the retained fooddelivery_stage1_test. Never run regression
   writes on that retained database. All contexts use ddl-auto=validate.
7. Save table checksums/DDL/row counts before and immediately after migration, before
   regressions create additional fixtures. Compare original business IDs/FKs and data.
   Negative migration tests install the exact guarded routines in the rehearsal schema,
   use rollback-only invalid fixtures, and remove the test helper routines afterwards.

Email policy is conservative ASCII syntax, trimmed/lowercased, globally unique. Any
unsupported legacy email needs manual resolution, not lossy conversion. BCrypt checks
validate format/cost, not ownership or knowledge of the original password.

The read-only Java preflight allows both approved test schemas; write migration scripts
permit ONLY fooddelivery_stage2_rehearsal on 3307 and the approved separate datadir.

The scripts fail on existing/partial auth tables. DDL has implicit commits: if interrupted,
stop and inspect; do not drop tables, reset data, or rerun blindly. A failed CALL can leave
its helper routine; inspect it before approved removal. No rollback script drops data.
Backfill is transactional, requires empty auth tables and never modifies legacy rows.
The exact test-target guard must not be removed for production without separate approval.

This step does NOT alter/delete old password columns, create ADMIN, issue JWTs, or enable
mandatory authentication. Schema migration on the current development database is NOT authorized.
