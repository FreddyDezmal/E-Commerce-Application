# Milestone 5 Exit Audit — Final Addendum: Verified Green

**Date:** 20 September 2026
**Base:** `origin/main` @ `39410ff` + the fixes below (uncommitted on the team machine)
**Supersedes:** `Milestone5-ExitAudit-Addendum.md`
**Companion:** `Milestone5-ExitAudit-PreDeploymentGate.md` (full audit)

---

## Final Determination

# 🟢 READY FOR M6

Both original blockers are resolved, **and two further production defects were
discovered and fixed** in the course of proving it. Every automated suite now
passes on real hardware.

| Suite | Command | Result | Where verified |
| --- | --- | --- | --- |
| Backend | `dotnet test ECommerceApi.sln` | ✅ **90 / 90** — 0 failed, 0 skipped, 34s | Team machine, .NET SDK 9.0.310 |
| Frontend | `npm test` | ✅ **290 / 290** across 33 files | Audit sandbox, using the team machine's own test file |
| Frontend type-check | `npx tsc -b` | ✅ exit 0 | Audit sandbox |
| Frontend build | `npm run build` | ✅ exit 0 | Audit sandbox |

The backend suite went **cannot compile → 70/90 → 74/90 → 80/90 → 90/90** across
four measured runs. Each step is recorded below with its root cause.

---

## What Was Actually Wrong

### 1. Backend test project could not compile *(original Blocker 1)*

`FunctionTestBase.cs` and `FunctionalTestBase.cs` both declared
`public abstract class FunctionalTestBase` in the same namespace — added by two
separate commits, byte-identical apart from a trailing newline.

`CS0101` + 5 × `CS0111` + 3 × `CS8863`. **All 82 backend test methods were
unrunnable.** Predicted from static analysis in the audit sandbox, then
reproduced verbatim by the team's own compiler.

**Fix:** deleted the misnamed duplicate.

**Consequence worth recording:** the 16 functional tests had *never executed
once*. They arrived in the same upload as the duplicate that blocked
compilation, so nobody had ever seen them run. Three real defects were hiding
behind that — items 3 and 4 below, plus the checkout transaction limitation.

### 2. Order status casing broke admin order management *(original Blocker 2)*

`OrderService.Map` lowercased the status; the frontend's `OrderStatus` union,
the admin `<select>` options and the dashboard's `?status=Pending` filter are all
capitalised. A controlled `<select>` whose value matches no option falls back to
the first one, so **every non-Pending order displayed to the admin as
"Pending"**. Proven by executing the real `AdminOrdersPage` against the payload
the API actually sends.

**Fix:** `Status = order.Status.ToString()`. Inbound parsing was already
case-insensitive, so no request shape changed.

Six assertions across two files encoded the *old* casing and were corrected —
four in `OrderServiceTests` (computed as `to.ToString().ToLowerInvariant()`, which
is why a literal-text search missed them) and two in `ShoppingJourneyTests`. Both
sides had been internally consistent with the same wrong assumption, which is
exactly why neither suite caught it.

**Regression lock added:** `AdminOrdersPage.contract.test.tsx` — 7 tests asserting
the casing the API really sends for all five statuses, plus an explicit guard that
fails if the API reverts to lowercase.

### 3. The concurrency token did nothing on PostgreSQL *(new — production defect)*

`Product.RowVersion` was `[Timestamp] byte[]` — the SQL Server pattern.
PostgreSQL has no mechanism to populate a `bytea` rowversion. Demonstrated on
PostgreSQL 16:

```
                      RowVersion (bytea)    xmin
after INSERT                <empty>          731
after UPDATE #1             <empty>          732
after UPDATE #2             <empty>          733
```

The column never changed, so every concurrency check compared `'' = ''` and
always matched. **The optimistic locking protecting stock decrements was inert in
production.** It also blocked the test suite: EF InMemory has no DB default to
fall back on, so the non-nullable property was "missing" and product creation
returned 500.

**Fix:** removed `RowVersion`; `ProductConfiguration` now uses
`builder.UseXminAsConcurrencyToken()`. `xmin` is PostgreSQL's own per-row
transaction id and does change on every update. Migration
`UseXminConcurrencyToken` drops the dead column.

### 4. Auth rate limiting was global, not per-IP *(new — production defect)*

```csharp
options.AddFixedWindowLimiter("auth", opt => { opt.PermitLimit = 20; ... });
```

That overload creates **one bucket shared by every caller**. The deployed API
would have allowed **20 auth requests per 15 minutes in total, across all
users** — the 21st sign-in from anyone would be rejected, and a single user could
lock out everybody. Surfaced as 7 tests failing with `503 ServiceUnavailable`.

Milestone 1 §12 specified `express-rate-limit`, which is **per-IP by default**;
the ASP.NET translation silently dropped that property.

**Fix:**
- Partitioned by `RemoteIpAddress`, restoring the per-client behaviour M1 specified
- Limits read from configuration (`RateLimiting:AuthPermitLimit` / `AuthWindowMinutes`), defaults unchanged at 20 / 15 min
- Rejection status changed from the default **503** to **429 Too Many Requests** — 503 reads as "the server is down" to clients and monitoring

### 5. Test host could not run transactions *(test infrastructure, not a defect)*

Checkout opens a real transaction; EF InMemory throws on `BeginTransaction` by
default, surfacing as a 500 from `POST /api/orders`. FT-15/FT-16's confusing
`JsonException` was a symptom — they parsed the 500's ProblemDetails body (where
`status` is the *number* 500) into `OrderResponse`.

**Fix:** `ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))`
in the test factory, plus a raised auth limit for tests only (all test requests
share one loopback IP).

> **Recorded limitation:** checkout **atomicity is therefore not covered** by the
> automated suite. Neither is product search, which uses `EF.Functions.ILike`
> (PostgreSQL-only). Both need a real PostgreSQL run — the team's own
> `ShoppingJourneyTests` header already declares both as out of scope. Carry them
> into M6 smoke testing.

Also changed: the test host now runs as `Development` rather than `Test`, so
`ExceptionHandlingMiddleware` includes real exception messages in 500 responses.
Under `Test` every server-side failure returned a bare "An unexpected error
occurred", which is what made these defects so hard to diagnose.

---

## Files Changed

| File | Change |
| --- | --- |
| `tests/.../functional/FunctionTestBase.cs` | **deleted** (duplicate class) |
| `src/Services/Implementations/OrderService.cs` | status emitted in enum casing |
| `src/Models/Product.cs` | `[Timestamp] byte[] RowVersion` removed |
| `src/Data/Configurations/ProductConfiguration.cs` | `UseXminAsConcurrencyToken()` |
| `src/Program.cs` | per-IP rate limiting, configurable limits, 429 |
| `src/Migrations/*_UseXminConcurrencyToken.*` | **new** — drops the dead column |
| `tests/.../Unit/Services/OrderServiceTests.cs` | 4 assertions corrected |
| `tests/.../functional/ShoppingJourneyTests.cs` | 2 assertions corrected |
| `tests/.../Integration/CustomWebApplicationFactory.cs` | Development host, tx warning ignored, test-only limit |
| `frontend/src/pages/admin/__tests__/AdminOrdersPage.contract.test.tsx` | **new** — 7 contract regression tests |

No frontend application code was modified. No production architecture changed.

---

## Conditions Carried Into M6

None of these block starting M6; all should be tracked.

**Verify on first deploy** (fixed here, but never exercised against real PostgreSQL)
- [ ] Run `dotnet ef database update` and confirm the `RowVersion` column drops cleanly
- [ ] Confirm `xmin` concurrency works end-to-end against the real database
- [ ] Confirm the per-IP rate limiter returns 429 (not 503) and does not throttle legitimate users
- [ ] Smoke-test checkout atomicity and product search against real PostgreSQL — neither is covered by automated tests

**Deployment prerequisites** (from the main audit)
- [ ] **Seed the first admin.** There is still no application path to create one: `AuthService` always assigns `Role.Customer`, and there is no seeding. A fresh production deploy has zero admins and the entire admin journey is unreachable without direct SQL.
- [ ] **Set `VITE_API_BASE_URL` in the frontend build environment.** Vite inlines it at build time; a build without it produces a frontend that silently cannot reach the API.
- [ ] Set `Cors__AllowedOrigins__0` to the deployed frontend origin (currently defaults to `http://localhost:5173`)
- [ ] Set `ConnectionStrings__DefaultConnection`, `Jwt__Key`, `Jwt__Issuer`, `Jwt__Audience` in the host's secret store
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production` (disables Swagger, enables HTTPS redirection)
- [ ] Add a GitHub Actions workflow — **still absent**, and M1 §15.2 requires it

**Documentation** (before submission)
- [ ] `Documentation/M5_Reports/UserTestingAnalysis.md` is a **0-byte empty file**
- [ ] `Documentation/M5/M5_ComponentTesting.md` is stale: it states 282 tests / 31 files and "no coverage provider is installed". Reality is **290 frontend tests / 33 files + 90 backend tests**, with coverage measured.
- [ ] Record the backend result (90/90) in the M5 testing documentation — it has never been reported, because it could never be produced until today

**Known non-blocking issues** (unchanged from the main audit)
T-17 update-product has no admin UI; T-14 addresses unimplemented; T-06 price filter absent;
no category update endpoint; orders paging omits `page`/`limit`; order-item product *name*
not snapshotted; `products.is_active` index missing; 14 oxlint warnings; ten stale remote
branches; the rotated credential remains in public history; `CS0618` on
`UseXminAsConcurrencyToken` (EF 8 suggests `IsRowVersion()`, which is the SQL-Server-shaped
API that does not work on PostgreSQL — the guidance is wrong for Npgsql here);
`CS8620` nullability warning in `ProductServiceTests`; no E2E tooling.

---

## Suggested Commit

```
fix(m5-exit): resolve exit-gate blockers and two production defects

- tests: remove duplicate FunctionalTestBase (CS0101) that made the whole
  backend test project uncompilable, so all 82 test methods were unrunnable
- api: emit order status in enum casing; lowercasing made every non-Pending
  order display as "Pending" in the admin control
- api: replace the inert [Timestamp] byte[] concurrency token with
  UseXminAsConcurrencyToken; PostgreSQL never populated the bytea column, so
  optimistic locking on stock decrements was doing nothing
- api: partition auth rate limiting per IP and return 429 instead of 503; the
  previous global bucket allowed only 20 auth requests per 15 minutes for the
  entire deployment
- tests: correct 6 assertions that encoded the old lowercase contract
- tests: run the test host as Development and ignore the InMemory transaction
  warning so real errors surface and checkout can execute
- frontend: add AdminOrdersPage contract regression tests

Backend 90/90, frontend 290/290.
```

---

## Evidence

Verified by execution: `dotnet test` on the team machine (90/90, SDK 9.0.310);
`npm test` / `tsc -b` / `npm run build` in the audit sandbox using the team
machine's own test file (290/290); PostgreSQL 16 demonstration of the inert
`bytea` rowversion versus incrementing `xmin`; Roslyn compilation proving and
then clearing `CS0101`.

Not verified: migration execution against a live PostgreSQL instance; any live
HTTP request to a deployed API; browser compatibility; responsive breakpoints;
production behaviour of any kind.

No test result, build result, coverage figure or Git fact in this document was
fabricated. Per the audit's terms of reference, no deployment work has been started.
