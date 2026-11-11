# Phase 8 — Architecture audit

Audit date: 10 November 2026. Scope: the existing Spring Boot 4.1.1/Java 25 and
React/TypeScript application; no framework rewrite or business lifecycle changes.
Evidence root: `F:\New folder\food-delivery-mysql-test\phase8-20261110`.

## Backend boundaries

Controllers use request/response DTOs and ApiResponse; entities remain behind services.
HTTP security and method/ownership checks are complementary. Account role and profile
IDs come from the authenticated account/session, not submitted identity fields.
Read management endpoints use database pagination/projections and bounded filters.
Legacy list APIs remain for compatibility and can return large result sets; current
management UI uses paged endpoints. Do not use legacy lists for large exports.

The full application context and all 172 JUnit tests start successfully against the
independent MySQL schema. This verifies the exercised bean graph, not every conceivable
future dependency. No broad dependency cleanup or service decomposition was justified.
The checkout/Order/Delivery/Payment/menu writers from Phase 7 are intentionally retained.
The later audit reproduced a separate cart initialization race. Only CartItemService
and CartRepository changed for that correction: transactional cart materialization,
locking current reads, and READ_COMMITTED for fresh add-item transactions. Customer
serialization remains. Global REPEATABLE_READ, other writers and the existing add,
update and remove business bodies are unchanged. Three real-MySQL regressions cover
an older RR snapshot, five independent first carts and rollback of a rejected add.

Transactions, locking and rollback are tested on actual MySQL REPEATABLE_READ.
The Order→Delivery lock/refresh ordering from Phase 6 remains. The four approved
versioned entities now compare form revisions under row locks/refresh and flush before
returning a new revision. JPA optimistic checks also reject stale direct entity updates.
See `phase8-cas-proposal.md` for the exact supported and excluded writers.

OSIV remains false. DTO conversion occurs in transactions/fetch queries. Existing
tests exercise detached response consumption, cascade safety, menu fetch joins and
statement-count bounds. Actual `EXPLAIN` and integrity results are recorded separately;
small fixture plans cannot establish production cardinality performance.

## Confirmed corrections

* Restaurant analytics accepted an extreme ISO year and overflowed its exclusive end
  boundary. Three failing tests preceded a bounded year/range fix; HTTP now returns 400.
* Generic exception handling converted unsupported methods/media and missing required
  parameters into 500. Four protocol tests reproduced three failures before the fix;
  explicit framework handlers now preserve 400/405/406/415 and protocol headers.
* Correlation logging initially duplicated the `requestId` JSON key and could fail
  during real requests. The ID now appears only through MDC; logging excludes paths,
  query strings, bodies, tokens and exception messages.
* Separate auth subscriptions could flush protected children before their guards on
  logout/account switch. Two deterministic regressions failed on the old code;
  AuthProvider now publishes one shared snapshot through context.
* WebKit pointer clicks did not focus the mobile navigation trigger, leaving Escape
  outside the header handler. Opening now explicitly focuses the trigger. A regression
  models a pointer click without browser-provided focus and checks Escape restoration.
* Catalog rows could force a 375px Firefox page to 413px. Grid tracks and children now
  shrink and wrap content; no overflow-hiding workaround was used.

Unexpected server errors retain a generic 500 response and log the exception class.
They are not indiscriminately reclassified as client errors.

## Frontend boundaries

API transport defaults to same-origin `/api`; base URL validation rejects embedded
credentials and invalid origins. Access tokens are held in memory, refresh cookies
are HttpOnly, and query keys include account/profile identity. Logout and identity
generation checks prevent stale callbacks writing another account's cache.
An additional real homepage failure showed anonymous restoration cancelling in-flight
public catalogue queries. Identity transitions now preserve only the reviewed public
query families. All private and unknown families are still cancelled/removed, and the
mutation cache is cleared. Three deterministic regressions cover anonymous restore,
authenticated restore and logout with a late private response; all failed before the
correction and pass afterward. Public request signals stay alive so mounted pages do
not remain indefinitely in a loading state.
Mutations are not automatically replayed after uncertain responses. Existing E2E
tests verify checkout/menu/delivery/admin lost-response recovery.

Routes already use React lazy imports. Vite emits route chunks; the checked entry is
below 500 kB. No speculative memoization, cache weakening, dependency replacement or
virtualization was introduced for bounded pages of at most 50 rows.
Forms capture the revision originally displayed, preserve drafts after background
refetches, and advance only after an own successful save or explicit reload.

Typecheck, ESLint, formatter and production build pass. The 309 unit/component tests
include seven new revision/adapter/form cases, a strict-CSP parser regression, two
atomic authentication publication regressions and a pointer/keyboard focus regression. Browser results are a separate gate in
`phase8-cross-browser.md`; unit coverage does not establish browser accessibility.

## Remaining scope limits

No distributed login limiter, durable operator audit trail, settlement accounting,
real payment gateway, production tracing backend or new indexes were introduced.
The application remains a single-instance deployment candidate. Production capacity,
public certificates, actual infrastructure and migration approval need explicit review.
