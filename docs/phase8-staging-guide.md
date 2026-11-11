# Phase 8 — Reproducible isolated staging

Local evidence/data root: `F:\New folder\food-delivery-mysql-test\phase8-20261110`.
Keep this directory private: it contains fixture credentials, signing/TLS keys and
SQL snapshots. Only sanitized evidence belongs in source-control documentation.

## Isolation contract

MySQL 8.0.46 uses existing binaries, `--no-defaults`, bind `127.0.0.1`, port3307,
`F:\New folder\food-delivery-mysql-test\data`, its own pid/error files and accounts.
It never reads MySQL80's my.ini/datadir/admin account. Verify `@@port`, `@@datadir`,
database identity, listening ports and recorded PID/start time before every mutation.
Do not stop or reconfigure MySQL80. Never redirect test credentials/config to3306.

Stage8 has a schema-only business schema plus auth tables, fresh valid fixtures and
the approved four version columns. `stage8_app` has DML only on Stage8; its migrator
is restricted to that schema. No rows were copied from historical QA databases.
Hibernate uses validate and OSIV=false; no startup DDL/update is permitted.

Java25.0.4 is the IntelliJ JBR, Maven3.9.16 is the existing wrapper cache. Both are
selected per process; Windows Java settings are unchanged. Runtime JVM uses the
business timezone Asia/Ho_Chi_Minh, 256MiB initial/1GiB maximum heap, Hikari maximum10.
The bounded performance run uses the recorded `performance` mode with 512MiB initial
heap and the same 1GiB maximum; this process setting does not change Windows Java.

Ports: backend127.0.0.1:18080, management127.0.0.1:19090, previewlocalhost:4173,
private HTTPS gateway127.0.0.1:18443 (`https://localhost:18443`). Management is not
proxied under `/api`; `/healthz` exposes only summary health.

## Startup and execution

External `restart-mysql.py` first rejects occupied3307 and checks the exact datadir
after startup. `runtime.py start <absolute-jar>` uses external properties, an explicit
Stage8 JDBC URL and validate. Add the fourth argument `strict` only for Phase8 strict
acceptance; old API regressions run in compatibility mode. Child environment overrides
for Spring/logging/Java debug flags are sanitized, without changing the host environment.

`start-preview.py` requires free4173 and the explicit backend proxy target.
`restart-staging.py` reuses the existing private CA/certificate/config only after rejecting
an occupied18443. `start-staging.py` is for first initialization and refuses to replace
existing keys. No Windows root trust changes were made. Python/Node API probes validate
the private CA and localhost SAN; browser-only ignoreHTTPSErrors is restricted to that
exact private origin. This does not validate a public production certificate chain.

Run `run-backend-tests.py` only with the application stopped and a successful data
preservation snapshot. All Stage1/2/4/6/7 MySQL run flags are enabled, with
FOOD_TEST_DB_NAME=fooddelivery_stage8_e2e and Stage8-limited credentials. The test target
guard verifies3307/datadir/schema. A report with disabled integration tests is rejected.
Current full suite:172 tests, zero skipped. Preserve and archive new JUnit fixtures
before isolating them from a valid E2E corpus; never clean rows based on guessed IDs.

`complete-audit-matrix.py` runs existing Admin20/Driver16/regression34 for each browser,
one worker, zero retries, using the same frozen JAR and frontend build. It creates fresh
disposable Admin-race/password fixtures and preserves previous fixture states. Do not
perform audit logins with shared actors during E2E: existing limiter budgets are real.
The final WebKit regression batch uses six sequential fixture groups and verified
owned-backend restarts. Its proof requires all 34 unique cases exactly once; committed
rows remain intact and cookie failures are retained. This avoids exhausting shared
fixture login budgets after failed-test worker restarts without weakening the limiter.
Bounded performance runs separately after browsers, not concurrently.

## Shutdown and retention

Verify PID/name/start time against each owned pid file before stopping backend, preview
and gateway. A pid file alone is not proof of ownership. Stop only the independent3307
MySQL using its own root connection after confirming server identity; never use a
service-control command against MySQL80. Privileged test processes may require the
same permission context for shutdown. Verify owned ports closed and MySQL80 Running.
Retain datadir, SQL snapshots, logs, screenshots and checksums for comparison.
