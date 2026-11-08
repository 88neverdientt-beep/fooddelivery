# Authentication operations and React contract

Account is the only credential source. Existing business IDs/FKs remain unchanged. Profile passwords are inert compatibility columns; password changes update Account only. No automatic migration, default account, default password or shared RSA key exists.

## Required configuration

Use a secret manager/environment for FOOD_DB_URL, FOOD_DB_USERNAME, FOOD_DB_PASSWORD. Runtime Hibernate uses validate, OSIV is disabled. Never start against an unmigrated schema. Acceptance tests use only 127.0.0.1:3307/fooddelivery_stage2_rehearsal.

FOOD_JWT_ISSUER and FOOD_JWT_AUDIENCE are required. FOOD_JWT_PRIVATE_KEY_PATH and FOOD_JWT_PUBLIC_KEY_PATH reference matching external PEM RSA keys (PKCS#8 private, X.509 public, at least 2048 bits). Restrict private-key ACL to the runtime identity. Missing/invalid keys fail startup.

FOODDELIVERY_AUTH_ACCESS_TOKEN_TTL defaults to 10m. FOODDELIVERY_AUTH_REFRESH_SESSION_TTL defaults to, and cannot exceed, 7d. Access lifetime must be positive and shorter than session lifetime. FOODDELIVERY_JWT_ALLOWED_ORIGINS is a comma-separated exact origin allowlist, empty by default; no wildcard. Set the real HTTPS UI origin.

## Browser contract

Deploy UI/API over HTTPS on the same site for SameSite=Strict cookies. The loopback HTTP acceptance client explicitly sends Secure cookies; browser TLS deployment needs separate verification.

1. GET /auth/csrf with credentials include. Store returned token in memory; browser receives Secure host-only XSRF-TOKEN cookie, Path=/.
2. Send X-XSRF-TOKEN with that value and credentials include for POST /auth/* and POST /customers. The JSON response lets a sibling UI host use CSRF without reading the API host cookie directly.
3. Login returns data.accessToken/tokenType/expiresIn/account. Store access token in memory, use Authorization: Bearer for business API. localStorage is not required.
4. Refresh uses fd_refresh cookie: HttpOnly, Secure, SameSite=Strict, host-only, Path=/auth. JSON never contains refresh token. Rotation replaces the cookie, never extends the absolute session lifetime.
5. Serialize refresh requests across tabs. Concurrent use of one refresh token triggers strict replay revocation, including the winning access token. Login again after replay.
6. Logout revokes current cookie session; logout-all and change-password require Bearer plus CSRF. Password change requires currentPassword/newPassword and revokes every session. Clear in-memory access token after logout/password change.
7. Handle 400 validation, 401 invalid/expired/revoked session, 403 role/CSRF, 404 ownership concealment, 409 conflict, 429 rate limit. Do not retry forever or log credentials/tokens.

Each protected request verifies RS256/typ at+jwt/issuer/audience/sub/sid/jti/iat/nbf/exp and current DB session/account/profile. Role comes from DB, never a self-declared role/scope. Cookie alone does not authenticate business API. Service checks ownership within business transactions.

## Initial ADMIN

CLI vn.gaugaugau.fooddelivery.auth.bootstrap.AdminBootstrap starts no SpringApplication/web server. Default disabled. Set FOOD_ADMIN_BOOTSTRAP_ENABLED=true only for a controlled invocation, FOOD_ADMIN_CREDENTIAL_FILE to an ACL-restricted external Java Properties file containing operator-supplied email/password, and datasource variables above. No credential appears in command arguments or output. Password: at least 12 characters, at most 72 UTF-8 bytes, no trimming/lowercasing.

Run java with -Dloader.main=vn.gaugaugau.fooddelivery.auth.bootstrap.AdminBootstrap, -cp target/fooddelivery-0.0.1-SNAPSHOT.jar, main class org.springframework.boot.loader.launch.PropertiesLauncher. CLI serializes via MySQL GET_LOCK, checks any existing ADMIN and inserts within one transaction. Existing ADMIN (even disabled) or duplicate email refuses bootstrap. Disable the flag and rotate/remove the credential file according to the environment secret policy after handoff. No public bootstrap/admin-registration endpoint exists.

## Compatibility and migration

New registration creates profile and Account atomically, writes BCrypt cost 12 to both to satisfy existing NOT NULL columns; only Account authenticates. Existing migration scripts remain manual preflight/expand/backfill. Never re-run backfill to synchronize passwords. Old password columns were not dropped or made nullable. No new table DDL was needed. Data remediation and any real-database rollout need separate approval; the 88 invalid Stage 1 fixture hashes remain untouched.

POST /customers is a CSRF-protected CUSTOMER registration alias returning Me. POST /restaurants and /drivers require ADMIN and return Me including profile ID. DELETE profile routes disable Account/revoke sessions, preserving business history. Public restaurant/menu/rating and available-delivery DTOs omit unnecessary private data. See security-endpoints.md for every route and response change.

## Deployment limits

LoginLimiter is bounded single-instance demo protection (10/email, 100/IP per 15 minutes). Multi-instance deployment MUST use shared gateway/store rate limiting; in-memory protection is not sufficient alone. Forwarded headers are disabled; never trust arbitrary X-Forwarded-For. Behind a gateway, peer IP can group users, so enforce trusted client IP/email limits at that gateway and prevent direct bypass.

Provision TLS, exact CORS origins, key/secret lifecycle, DB/network restrictions, backup and monitoring before production. Rolling RSA key rotation/JWKS, password recovery/email verification and pagination of admin lists are not implemented endpoints. They require future work according to deployment scope.

## Evidence

SecurityMySqlIntegrationTest uses real Spring Security filters, ephemeral external RSA keys and MySQL validate, no @WithMockUser or security bypass. ApiBindingUnitTest is explicitly unit binding/advice coverage. Stage 1 service integration uses verified JWT/DB principals. Role matrices inventory all 55 routes and six actors; denied requests run without a test rollback and compare persistent checksums. Allowed mutation samples roll back; separate business, replay, race and HTTP tests verify real commits. See phase2-result.md, phase2-files.txt and external phase2-final/logs.
