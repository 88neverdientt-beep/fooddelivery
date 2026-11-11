# Phase 8 — Security audit

Testing is confined to Stage8 on MySQL 3307 and loopback HTTP/HTTPS services.
No public target, MySQL80 credentials or production data were used for write tests.
This is an application/staging audit, not an external production penetration test.

## Controls retained and exercised

BCrypt cost 12 for newly issued credentials, globally unique normalized account email,
one server-side role, profile-linked ownership, RS256 signatures with external keys,
issuer/audience/expiry validation, database-backed session validity, hashed refresh
tokens, rotation/replay detection, logout/all and password-change revocation remain.
The integration suite exercises authentication, role/IDOR/mass-assignment denials,
revocation, refresh, transaction rollback and administrator concurrency protections.

CSRF applies to cookie-authentication operations and customer registration. Business
operations use explicit bearer tokens; refresh cookies do not authenticate arbitrary
business writers. Exact origin allowlists reject wildcard configuration. The backend
does not trust forwarded identity or role headers. SQL parameters and whitelisted
sort/filter fragments are retained; no dynamic client-supplied SQL is evaluated.

Refresh cookies are Secure/HttpOnly/SameSite=Strict. The local gateway maps their
`/auth` path to `/api/auth` and preserves those flags. CSRF cookies remain readable
by the client as required by the existing double-submit contract.
The SPA does not persist tokens in localStorage/sessionStorage.

## Phase8 corrections

1. Four-table version CAS prevents stale/ABA profile/account overwrites within the
   approved scope. Missing revisions are 428 only in strict mode; compatibility mode
   remains the default. Menu price/availability value comparison retains its documented
   ABA limitation; no unapproved menu schema migration was applied.
2. API CSP denies document execution/embedding. Staging SPA CSP permits same-origin
   scripts/fonts/images and inline styles needed by dynamic React/Radix layout, with
   no unsafe-eval or external script sources. Inline styles are a residual policy
   allowance, not a claim of strict nonce-based style CSP.
3. Management binds to a separate loopback port. Health exposes summary only; metrics
   require a live ADMIN session/JWT. Main API and public proxy do not expose actuator.
4. Correlation/access logs contain bounded IDs, method, status and timing. Unhandled
   errors omit exception messages/SQL/bodies. Log collection must still protect startup
   datasource host/schema metadata and operational identifiers.
5. Targeted Jackson 3.1.7/Tomcat 11.0.27 security patches retain Boot 4.1.1 and Java25.
   Actual runtime dependency audit resolves 88 coordinates; the audited patched library
   set has zero OSV matches. This is a timestamped advisory snapshot, not a permanent
   guarantee. See `phase8-dependency-remediation.md`.
6. Zod uses its runtime parser (`jitless`) before application schemas are constructed.
   A real Firefox CSP failure and a regression test preceded the fix; unsafe-eval
   was not added. AuthProvider now publishes one consistent snapshot to guards and
   protected children on logout/account changes, preserving cache-generation checks.
7. Identity transitions cancel and remove private or unknown query families and clear
   mutation caches. Only eight reviewed anonymous public query families survive.
   Three regressions cover pending public requests, logout cleanup and late private
   responses; this also fixes guest pages stuck loading after the initial refresh401.

## Open WebKit validation finding

The bundled WebKit27.2 Windows runtime reports the refresh cookie as SameSite=None
despite an actual SameSite=Strict/Secure/HttpOnly response header. A temporary gateway
copy outside Git observed names only: both the real Strict refresh cookie and a Strict
sentinel were sent in the controlled cross-site POST, alongside a None positive control.
The original gateway was restored immediately; its source hash is unchanged.
No cookie values were logged and no business request was handled by the observer.

Evidence: `logs/webkit-cookie-server-observation.json` and
`logs/cookie-observer-restoration-proof.json`. Initial Playwright request-header
introspection omitted all cookies and is explicitly marked inconclusive; it is not
the basis of this finding. The server-side observation is the authoritative result.

This blocks a green WebKit security gate on this runtime. It is not evidence that
real Safari on macOS/iOS behaves identically. Keep the Strict assertion and existing
CSRF/CORS controls; do not change the application cookie to None or silently accept
the tool's result. Recheck the frozen artifacts on an approved macOS/Linux WebKit
runner and, where applicable, real Safari before closing the browser gate.
The [Playwright WebKit adapter](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/webkit/wkBrowser.ts)
copies the engine's cookie fields; platform/browser differences require actual testing.

## History and dependency findings

Two historical blobs contained a database password literal. No literal was reproduced
in reports. The operator confirmed all uses were rotated/revoked; finding is closed
by operator attestation, not by agent access to production. Git history remains intact.
See `phase8-secret-history-finding.md` for commit/blob references and residual handling.

The npm production-only audit reports zero advisories. Seven moderate findings remain
in development/lint dependencies; do not run those tools on untrusted source with
privileged credentials. A suggested downgrade/major toolchain change was not applied.
Review a narrowly tested upstream patch separately when available.

## Production limitations

The current in-memory login limiter is per process and sees the direct proxy peer.
Forwarded headers stay disabled. Gateway per-IP limits supplement but do not turn the
backend limiter into a distributed control. Validate availability budgets and a shared
limiting design before scaling to multiple instances; do not simply trust client XFF.
Public TLS/domain/firewall, external DB TLS identity validation, key rotation/storage,
monitoring retention and external penetration testing remain infrastructure gates.

Primary references: [Spring Security headers](https://docs.spring.io/spring-security/reference/servlet/exploits/headers.html),
[Spring Boot actuator exposure](https://docs.spring.io/spring-boot/reference/actuator/endpoints.html),
[Apache Tomcat advisories](https://tomcat.apache.org/security-11.html),
[Jackson advisory](https://github.com/advisories/GHSA-cxp5-3px4-pw24).
