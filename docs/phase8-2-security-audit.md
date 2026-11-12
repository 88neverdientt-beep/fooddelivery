# Giai đoạn 8.2 — Security & dependency audit

Actual snapshot: {"atUtc": "2026-11-11T11:16:02.959761+00:00", "javaAuditExitCode": 0, "production": {"exitCode": 0, "verified": true, "vulnerabilities": {"info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0}}, "full": {"exitCode": 1, "verified": true, "vulnerabilities": {"info": 0, "low": 0, "moderate": 7, "high": 0, "critical": 0, "total": 7}}}

| Affected development package | Installed version | Parent path/relationship | Status |
|---|---|---|---|
| @typescript-eslint/eslint-plugin | 8.72.1 | node_modules/@typescript-eslint/eslint-plugin | OPEN, assessed dev-only |
| @typescript-eslint/parser | 8.72.1 | node_modules/@typescript-eslint/parser | OPEN, assessed dev-only |
| @typescript-eslint/type-utils | 8.72.1 | node_modules/@typescript-eslint/type-utils | OPEN, assessed dev-only |
| @typescript-eslint/typescript-estree | 8.72.1 | node_modules/@typescript-eslint/typescript-estree | OPEN, assessed dev-only |
| @typescript-eslint/utils | 8.72.1 | node_modules/@typescript-eslint/utils | OPEN, assessed dev-only |
| minimatch | 10.2.6 | node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch | OPEN, assessed dev-only |
| typescript-eslint | 8.72.1 | node_modules/typescript-eslint | OPEN, assessed dev-only |

One root advisory propagates through seven packages; not seven distinct CVEs. [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) affects minimatch>=7<11.0.1; patched11.0.1. Exploitation needs attacker-controlled patterns and optimizationLevel>=2. Installed caller uses dot:true/defaultoptimization1; eslint.config.js does not enable projectService/allowDefaultProject. This is conditional reachability evidence, not clearing the advisory. No runtimeHTTP path observed; do not run untrusted lint config or secrets-bearing untrustedPR CI.

Latest typescript-eslint8.72.2 still depends^10.2.2; registry evidence retained. Npm recommendation8.36.0 still depends^9.0.4, also affected; downgrade rejected. No compatible upstreampatch currently verified, no broadmajorupdate/force/handeditedlock/fakeoverride. Revisit when parent supports patched leaf or review a separate major migration. Risk/compatibility/test result for all7 is assessed against unchanged manifests and fresh lint315unit/build/E2E; none marked fixed.

Auth JWT/session/rotation/replay/revocation, role and ownership regression remain mandatory. No changes to BCrypt12/RS256/TTL/refresh/CSRF/CORS or storedsecrets assertions. Windows WebKit StrictsemanticFAIL stays HIGH. Currentsecret-scan covers source/diff/build/JAR/logs; native noauthZIP additionally checked for JWT/refresh values. Historical Git credential finding remains closed by operator attestation of revocation; no productioncredential was used to probe3306.

Production TLS/DBTLS/secretmanager/sharedlimiter/trustedproxy/alerts/drain still unverified. Native browser controls do not prove every future cancellation path safe; WEB-02 closure is scoped to reproducible helper trigger and complete final console monitoring.

Bằng chứng riêng: `F:/New folder/food-delivery-mysql-test/phase8-2-20261111/logs/`. Không đưa credential, key, cookie value, SQL backup hoặc private config vào Git. Báo cáo sinh 2026-11-11T16:27:31.878729+00:00; thời gian trong JSON là UTC, đối chiếu Asia/Saigon UTC+7.

Lượt sửa scheduler/tải/restore cuối: `F:/New folder/food-delivery-mysql-test/phase8-2-load-boundary-20261111/logs/`. JUnit/frontend/E2E vẫn lấy từ root 8.2 đầu; không coi summary sao chép phục vụ shutdown ở lượt tải là một lần chạy JUnit mới.
