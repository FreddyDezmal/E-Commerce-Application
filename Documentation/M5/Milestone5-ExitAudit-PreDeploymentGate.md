# SEN371 — Milestone 5 Exit Audit & Pre-Deployment Readiness Gate

> **STATUS: SUPERSEDED IN PART — read this alongside
> `Milestone5-ExitAudit-FinalAddendum.md`.**
>
> This document records the audit **as it stood on 20 September 2026 before any
> fixes were applied**. Its verdict at the time was 🔴 NOT READY FOR M6, with two
> blockers. Both blockers were subsequently resolved, two further production
> defects were found and fixed, and the final verdict is **🟢 READY FOR M6**
> (backend 90/90, frontend 290/290).
>
> The findings, traceability matrix, architecture/security analysis and M6
> checklist below remain accurate and are the substance of the audit. Only the
> Blockers section and the Final Determination have been overtaken by events.
> The final addendum records what changed and why.

---

**Audit target:** `origin/main` @ `39410ff` (fresh clone of `github.com/FreddyDezmal/E-Commerce-Application`)
**Audited:** 20 September 2026
**Question:** Is this project genuinely ready to move from Milestone 5 into Milestone 6 deployment?

Every claim below is backed by a command that was actually executed, or is explicitly
marked **Not verified in the available environment**. Nothing is inferred from previous
milestone reports.

---

## Executive Summary

|                              |                                                                                  |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **Readiness classification** | 🔴 **NOT READY FOR M6**                                                          |
| **Blockers**                 | **2** (both small, both fixable in under an hour)                                |
| **Non-blocking issues**      | 16                                                                               |
| **Should M6 begin?**         | Not yet. Fix the two blockers, re-run the two verification commands, then begin. |

The project is in substantially better shape than the classification suggests. The
architecture is genuinely well-built: the layered design holds without a single
violation, checkout is properly transactional, authorization is enforced server-side
with real ownership checks, and no live secret is committed anywhere. The frontend
builds, passes 283 tests, and boots correctly in a real browser.

It is blocked on two specific, narrow defects — one that makes the entire backend test
suite unrunnable, and one genuine frontend/backend contract mismatch that breaks admin
order management. Neither is architectural. Both were confirmed by execution, not by
reading.

---

## Build Verification

| Area                         | Command                              | Result                                                                               |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Frontend type-check          | `npx tsc -b`                         | ✅ **PASS** (exit 0)                                                                 |
| Frontend lint                | `npm run lint`                       | ✅ **PASS** (exit 0; 14 pre-existing warnings)                                       |
| Frontend production build    | `npm run build`                      | ✅ **PASS** (57 modules, 297.97 kB JS / 91.18 kB gzip)                               |
| Frontend tests               | `npm test`                           | ✅ **PASS** (32 files, 283/283)                                                      |
| Frontend coverage            | `npm run test:coverage`              | ✅ **PASS** (94.56% stmts / 88.68% branches)                                         |
| Frontend boot (real browser) | `vite preview` + Playwright/Chromium | ✅ **PASS** (SPA renders, routing works)                                             |
| Backend restore              | `dotnet restore ECommerceApi.sln`    | ⚠️ **NOT VERIFIED** — `api.nuget.org` is blocked by this environment's egress policy |
| Backend build                | `dotnet build`                       | ⚠️ **NOT VERIFIED** — blocked by the above                                           |
| Backend tests                | `dotnet test`                        | ❌ **FAIL** — proven not to compile (see Blocker 1)                                  |

**On the backend build.** .NET SDK 8.0.131 was installed successfully, but NuGet is not
reachable from this sandbox, so `src/ECommerceApi.csproj` could not be compiled. Two
pieces of evidence bear on it: the API demonstrably ran on the team's own machine on
16 September (`dotnet run` → "Now listening on: http://localhost:5251"), and
`git diff --stat 89fcca4..origin/main -- src/` shows **no change to any backend source
file since then** (the only source change anywhere is one frontend test file). The API
source is therefore very likely still buildable — but this audit did not prove it, and
says so rather than assuming it.

Blocker 1 was proven without NuGet by invoking the Roslyn compiler (`csc.dll`, ships with
the SDK) directly against the two offending files.

---

## Test Verification

| Test Category                         | Present?                            | Executed?       | Result             | Notes                                                                                                                                          |
| ------------------------------------- | ----------------------------------- | --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Component (frontend)                  | ✅ Yes                              | ✅ Yes          | **283/283 pass**   | 25 files / 254 tests are component scope; rest are API-layer + journey                                                                         |
| Unit (backend, xUnit)                 | ✅ Yes — 46 tests in 7 files        | ❌ **No**       | **Cannot compile** | Blocked by Blocker 1                                                                                                                           |
| Integration (`WebApplicationFactory`) | ✅ Yes — 11 tests in 3 files        | ❌ **No**       | **Cannot compile** | Uses EF InMemory, so needs no live DB                                                                                                          |
| Functional (`ShoppingJourneyTests`)   | ✅ Yes — 16 tests (+8 Theory cases) | ❌ **No**       | **Cannot compile** | Blocked by Blocker 1                                                                                                                           |
| User testing                          | ⚠️ Partial                          | ✅ Yes (1 test) | **1/1 pass**       | `frontend/src/__tests__/userTesting.test.tsx`; the written report `Documentation/M5_Reports/UserTestingAnalysis.md` is a **0-byte empty file** |
| E2E (Playwright/Cypress)              | ❌ **No**                           | —               | —                  | M1 section 2.3 lists E2E in the stack; no E2E tooling exists in the repo                                                                       |

**82 declared backend test methods (~90 cases including `[InlineData]`) exist and none of
them can run.** That is the single most important finding of this audit: the Milestone 5
backend testing evidence cannot currently be reproduced by anyone, including the marker.

---

## Core User Journeys

Journeys were assessed by code path analysis plus executed component tests and a real
browser boot. **A full live end-to-end run was not possible** (the backend could not be
built here, and no PostgreSQL instance was attached), so no journey is marked "verified
live".

| Journey               | Result                           | Notes                                                                                                     |
| --------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Customer registration | ✅ Coherent                      | 409 on duplicate, BCrypt hash, 8+ chars with letter+digit, JWT issued, `201`                              |
| Customer login        | ✅ Coherent                      | Identical `401` for unknown email and wrong password (no enumeration)                                     |
| Browse products       | ✅ Coherent                      | Paginated, soft-deleted excluded via global query filter, `ILIKE` case-insensitive search                 |
| Product detail        | ✅ Coherent                      | `404` for missing/soft-deleted                                                                            |
| Cart                  | ✅ Coherent                      | qty ≥ 1, stock validated, qty 0 removes, over-stock `400`, one row per product                            |
| Checkout              | ✅ Coherent                      | Single EF transaction: order + items created, stock decremented, cart cleared, rollback on failure        |
| Order confirmation    | ✅ Coherent                      | Router state drives the confirmation banner                                                               |
| Order history         | ⚠️ **Cosmetic defect**           | Status renders lowercase (`"shipped"`) because the API lowercases it; CSS class still resolves            |
| Admin login           | ⚠️ **Unreachable in production** | No admin can be created — see Non-blocking issue #3                                                       |
| Product management    | ⚠️ **Incomplete**                | Create + soft-delete work; **update has no UI** though `PUT /api/products/{id}` exists (T-17 is a _Must_) |
| Category management   | ✅ Coherent                      | Create + delete; delete correctly blocked with `409` when active products reference it                    |
| Order management      | ❌ **BROKEN**                    | See Blocker 2 — every non-Pending order displays as "Pending"                                             |

---

## Architecture Verification

**The implemented architecture matches the approved M1 v1.1 design exactly. No violations
were found.** This was checked mechanically, not by eye:

```
Controllers referencing AppDbContext ........ 0   ✅
Controllers importing EF Core ............... 0   ✅
Services referencing HttpContext/EF Core .... 0   ✅  (one comment match only)
Services depending on concrete repositories . 0   ✅  (all 10 injections are interfaces)
Files referencing AppDbContext .............. 5 repositories + DbContext + factory + Program.cs ✅
```

Middleware order in `Program.cs` matches the v1.1 section 2.4 diagram: exception handling →
Swagger (Development only) → HTTPS redirection (non-Development) → CORS → rate limiter →
authentication → authorization. Dependency injection is correctly configured for all
repositories, services, the password hasher and the token service.

Resource-ownership authorization lives in the service layer exactly as v1.1 section 185 requires
(`OrderService.GetOrderForUserAsync` compares `order.UserId` against the requester and
throws `403`), not as a role attribute.

---

## API Verification

All 20 frontend API calls map onto a real backend endpoint with matching method, route,
and auth requirement. Route-level contract is **fully consistent**, including the
`PUT/DELETE /api/cart/items/{productId}` convention (keyed by product id on both sides).

Response-shape consistency is where the problems are:

| Field                         | Backend emits                           | Frontend expects                         | Verdict                                                                            |
| ----------------------------- | --------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `user.role`                   | `"admin"` / `"customer"` (lowercased)   | `'admin' \| 'customer'`                  | ✅ Match                                                                           |
| JWT `role` claim              | `"Admin"` / `"Customer"`                | `[Authorize(Roles="Admin")]`             | ✅ Match                                                                           |
| `order.status`                | `"pending"`, `"shipped"` … (lowercased) | `'Pending' \| 'Shipped' …` (capitalised) | ❌ **Mismatch — Blocker 2**                                                        |
| Orders paging                 | `{ items, total }` only                 | `{ items, total, page, limit }`          | ⚠️ `page`/`limit` arrive `undefined`; no component reads them, so no runtime break |
| Products paging               | `{ items, total, page, limit }`         | same                                     | ✅ Match                                                                           |
| `product`, `cart`, `category` | —                                       | —                                        | ✅ Match                                                                           |

---

## Database Verification

**Schema verified statically against M1 section 8.4. Migration execution was not performed** —
`dotnet ef` requires NuGet, and no PostgreSQL instance was attached to this audit.

All eight planned entities exist as migrations: `users`, `addresses`, `categories`,
`products`, `carts`, `cart_items`, `orders`, `order_items`.

| Requirement                      | Status                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary keys, foreign keys       | ✅ All present                                                                                                                                                                       |
| CHECK constraints                | ✅ `products.Price >= 0`, `products.StockQuantity >= 0`, `cart_items.Quantity > 0`, `order_items.Quantity > 0`                                                                       |
| Unique indexes                   | ✅ `users.Email`, `categories.Name`, `cart_items(CartId, ProductId)`, `carts.UserId`                                                                                                 |
| Planned indexes (M1 section 8.3) | ⚠️ `users.email`, `products.category_id`, `orders.user_id` present; **`products.is_active` index missing**                                                                           |
| Soft delete                      | ✅ `IsDeleted` + global query filter; admin paths opt out explicitly                                                                                                                 |
| Historical order data preserved  | ✅ `OnDelete(Restrict)` on order items; history queries use `IgnoreQueryFilters()` so soft-deleted products still resolve                                                            |
| Historical pricing               | ✅ `UnitPriceAtPurchase` snapshotted at checkout                                                                                                                                     |
| Historical product **name**      | ⚠️ **Not** snapshotted — read live from `Product.Name`. M1 section 8.2 specifies a snapshot of "product name/price". A rename rewrites history                                       |
| Category delete behaviour        | ⚠️ DB uses `SetNull`; M1 section 8.2 specifies `RESTRICT`. **Behaviour is still correct** — `CategoryService` blocks deletion with `409` when active products reference the category |
| Concurrency                      | ✅ `Product.RowVersion` added in migration `20260908210417`; model snapshot is coherent (no drift detected)                                                                          |

---

## Security Verification

No critical security finding. Specific, verified observations — this is a readiness
review, **not** a penetration test, and no claim is made that the application is secure:

| Check                                                    | Result                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardcoded secrets in source                              | ✅ None. Committed `appsettings.json` has empty `ConnectionStrings:DefaultConnection` and empty `Jwt:Key`                                                       |
| Secrets across **all 913 committed blobs, all branches** | ✅ Only three non-placeholder hits: the already-rotated Supabase password (history only), and two literal placeholders (`Password=unused`, `username:password`) |
| Leaked credential status                                 | ✅ Removed from branch tip in `c176507`; rotated by the team on 17 Sep. **Still in history of a public repo** — harmless now, but see non-blocking #10          |
| Stack traces to users                                    | ✅ Suppressed outside Development; generic `"An unexpected error occurred"`                                                                                     |
| Swagger in production                                    | ✅ Development-only                                                                                                                                             |
| CORS                                                     | ✅ No wildcard; origins read from configuration, overridable by `Cors__AllowedOrigins__0`                                                                       |
| Password hashing                                         | ✅ BCrypt.Net                                                                                                                                                   |
| Authorization enforced server-side                       | ✅ `[Authorize]` / `[Authorize(Roles="Admin")]` on controllers **plus** service-layer ownership checks — not reliant on hidden frontend controls                |
| Rate limiting                                            | ✅ Fixed window (20 / 15 min) on `/api/auth` only                                                                                                               |
| `.gitignore`                                             | ✅ Covers `.env`, `appsettings.Development.json`, `launchSettings.json`, `bin/`, `obj/`                                                                         |
| Sensitive logging                                        | ✅ Exceptions logged server-side; no password/token logging found                                                                                               |

---

## Documentation Verification

| Discrepancy                                                                                                                                                                                                      | Classification                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Documentation/M5_Reports/UserTestingAnalysis.md` is a **0-byte empty file**                                                                                                                                     | **Should fix before submission**                                                                                           |
| `M5/M5_ComponentTesting.md` states "282 tests across 31 files" and "No coverage figures are claimed… no coverage provider is installed" — both superseded (now 283/32, coverage provider installed and reported) | **Should fix before submission**                                                                                           |
| `M5/Milestone5-TestReporting-CoverageAnalysis.md` executive summary uses bare `text` lines instead of fenced code blocks (renders as stray text)                                                                 | Documentation-only                                                                                                         |
| M1 section 9.2 / section 15 describe a Node.js + Express backend                                                                                                                                                 | **Historical and acceptable** — formally superseded by `M1_SystemPlan_v1.1.md`, which is correctly written as an amendment |
| M1 section 8 references Prisma                                                                                                                                                                                   | **Historical and acceptable** — same reason                                                                                |
| M1 section 8.2 specifies order items snapshot product _name_; implementation snapshots price only                                                                                                                | Should fix (doc or code)                                                                                                   |
| M1 section 8.2 specifies category FK `RESTRICT`; implementation uses `SetNull` + service-level `409`                                                                                                             | Documentation-only (behaviour meets T-19)                                                                                  |
| `legacy-nodejs/`                                                                                                                                                                                                 | ✅ **Correctly handled** — archived with a README explaining why it is retained, and nothing outside it references it      |

---

## M1–M5 Traceability Matrix

| Requirement / Decision             | Source                            | Implementation                                   | Verified?                                                                  | Status                                           |
| ---------------------------------- | --------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------ |
| React + TypeScript + Vite frontend | M1 / v1.1                         | `frontend/`                                      | **Yes** — built, tested, booted in browser                                 | ✅ Complete                                      |
| ASP.NET Core Web API backend       | M1 v1.1                           | `src/`                                           | **Partial** — source inspected; not compiled here                          | ⚠️ Not verified                                  |
| C# / EF Core / PostgreSQL          | M1 v1.1                           | `AppDbContext`, Npgsql, migrations               | **Static only**                                                            | ⚠️ Schema verified, execution not                |
| JWT authentication                 | M1 section 12                     | `TokenService`, JWT Bearer middleware            | **Yes** — code path traced; claim shape matches spec                       | ✅ Complete                                      |
| MVC + Service + Repository         | M1 section 6.1 / v1.1 section 2.2 | Backend                                          | **Yes** — mechanically checked, 0 violations                               | ✅ Complete                                      |
| Server-side role authorization     | M1 section 12                     | `[Authorize(Roles)]` + ownership checks          | **Yes**                                                                    | ✅ Complete                                      |
| Soft delete (T-18)                 | M1 section 8                      | Global query filter                              | **Yes**                                                                    | ✅ Complete                                      |
| Atomic checkout (NFR Reliability)  | M1 section 4                      | `OrderRepository.CreateFromCartAsync`            | **Yes** — single transaction, rollback on failure                          | ✅ Complete                                      |
| Order state machine (T-21)         | M1 section 3.5                    | `OrderService.AllowedTransitions`                | **Yes** — backend correct; **UI broken**                                   | ⚠️ Blocker 2                                     |
| Update product (T-17, _Must_)      | M1 section 3.5                    | API exists, **no UI**                            | **Yes**                                                                    | ⚠️ Incomplete                                    |
| Profile with address (T-14)        | M1 section 3.5                    | `addresses` table exists; no endpoints or UI     | **Yes**                                                                    | ⚠️ Partial (name only)                           |
| Price filter (T-06, _Should_)      | M1 section 3.5                    | Absent both sides                                | **Yes**                                                                    | ⚠️ Not implemented                               |
| Responsive UI                      | M1/M4                             | CSS + mobile nav                                 | **Partial** — nav behaviour unit-tested; breakpoints not visually verified | ⚠️ Not verified                                  |
| TDD                                | M1/M5                             | Git history                                      | **Yes**                                                                    | ⚠️ Honestly documented as retrospective, not TDD |
| Component testing                  | M5                                | 25 files / 254 tests                             | **Yes** — executed                                                         | ✅ Complete                                      |
| Backend automated testing          | M5                                | 82 test methods                                  | **Yes** — proven **not runnable**                                          | ❌ Blocker 1                                     |
| E2E testing                        | M1 v1.1 section 2.3               | None                                             | **Yes**                                                                    | ❌ Absent                                        |
| CI/CD (GitHub Actions)             | M1 section 15.2 / v1.1            | **No CI configuration exists in the repository** | **Yes**                                                                    | ❌ Absent                                        |
| Deployment                         | M6                                | Not implemented                                  | N/A                                                                        | M6                                               |

---

## Blockers

### 🔴 Blocker 1 — The backend test project does not compile

**Issue.** `tests/ECommerceApi.Tests/functional/` contains two files,
`FunctionTestBase.cs` and `FunctionalTestBase.cs`, which both declare
`public abstract class FunctionalTestBase` in namespace `ECommerceApi.Tests.Functional`.
They are byte-identical apart from the trailing newline. They were added by two separate
commits: `c1c3427` ("Create FunctionTestBase.cs") and `af3a794` ("Add files via upload").

**Impact.** `dotnet test` cannot run. All **82 declared backend test methods** — unit,
integration and functional — are unrunnable. The Milestone 5 backend testing evidence
cannot be reproduced by the team or by a marker, and the M1-required CI gate
(`dotnet test`, v1.1 section 1.8) cannot be established in M6.

**Evidence.** The test `.csproj` sets no `<Compile Remove>` and does not disable default
globbing, so both files are compiled. Compiling the two real files with the SDK's Roslyn
compiler:

```
FunctionalTestBase.cs(16,23): error CS0101: The namespace 'ECommerceApi.Tests.Functional'
                              already contains a definition for 'FunctionalTestBase'
FunctionalTestBase.cs(23,15): error CS0111: ... already defines a member called 'FunctionalTestBase'
FunctionalTestBase.cs(37,33): error CS0111: ... 'RegisterCustomerAsync'
FunctionalTestBase.cs(65,33): error CS0111: ... 'CreateAdminAsync'
FunctionalTestBase.cs(100,50): error CS0111: ... 'CreateProductAsync'
FunctionalTestBase.cs(123,50): error CS0111: ... 'GetProductAsync'
```

**Required resolution.** Delete the misnamed duplicate (its filename does not match the
class it declares):

```bash
git rm tests/ECommerceApi.Tests/functional/FunctionTestBase.cs
dotnet test          # must then be run and its real output recorded
```

---

### 🔴 Blocker 2 — Order status casing mismatch breaks admin order management

**Issue.** `OrderService.Map` emits `Status = order.Status.ToString().ToLowerInvariant()`,
so the API returns `"pending"`, `"paid"`, `"shipped"`, `"delivered"`, `"cancelled"`.
The frontend's `OrderStatus` type and `AdminOrdersPage`'s `STATUSES` array use
capitalised values, and the admin control is a controlled
`<select value={order.status}>` whose `<option>` values are `"Pending"`, `"Paid"`, …

**Impact.** A controlled `<select>` whose value matches no option falls back to
displaying the first option. **Every order that is not Pending is displayed to the admin
as "Pending".** An admin managing a shipped order sees "Pending", and selecting what
looks like the next logical status produces a rejected transition from the backend state
machine. This breaks T-20 and T-21, both _Must_ requirements, and makes the admin order
queue actively misleading rather than merely cosmetic.

**Evidence.** Executed against the real `AdminOrdersPage` component with the exact
payload the API produces (`status: "shipped"`):

```
ADMIN SELECT     -> value="Pending" displayedOption="Pending"  (actual order status: "shipped")
CUSTOMER HISTORY -> renders "shipped" class="status-pill status-pill--shipped"
```

The existing component tests did not catch this because their fixtures use the
frontend's _assumed_ capitalised casing rather than the backend's actual output — a
genuine instance of mocks encoding an assumption instead of the contract.

**Required resolution.** Pick one side and make it authoritative. The lower-risk fix is
in the backend, since the JWT role claim already uses `ToString()` without lowercasing
and the frontend type, the admin `<select>`, and the dashboard's `status: 'Pending'`
filter all assume capitalised values:

```csharp
// src/Services/Implementations/OrderService.cs:121
Status = order.Status.ToString(),     // was .ToString().ToLowerInvariant()
```

Then add a regression test that asserts the API's real casing rather than the
frontend's assumption.

---

## Non-Blocking Issues

1. **No CI/CD configuration exists.** M1 section 15.2 and v1.1 section 1.8 both specify GitHub Actions running `dotnet test`. There is no `.github/` directory. Required for M6's pipeline.
2. **No E2E tooling.** M1 v1.1 section 2.3 lists Playwright or Cypress. The user-journey test is React Testing Library, which is not E2E.
3. **No way to create an admin account.** `AuthService` always creates `Role.Customer`; there is no admin endpoint, no `HasData` seeding, and no seeding on startup. After deployment there will be **zero admin users**, so the entire admin journey is unreachable without direct SQL access to the production database. Not classified as a blocker because Supabase provides that access — but M6 **must** plan the first-admin provisioning step.
4. **`VITE_API_BASE_URL` is baked in at build time.** Vite inlines it during `npm run build`. A production build made without it produces a frontend that cannot reach the API at all. Verified in a real browser against the build produced by this audit: console logs `"VITE_API_BASE_URL is not set…"` and the catalogue renders "Could not reach the server." There is no runtime configuration fallback.
5. **T-17 (Update product, _Must_) has no UI.** `productApi.update` exists and is wired to `PUT /api/products/{id}`, but no component calls it. An admin cannot edit a product.
6. **T-14 (profile with address) is partial.** The `addresses` table exists; there are no address endpoints and no address UI. Only `fullName` is editable.
7. **T-06 (filter by price, _Should_) is not implemented** on either side.
8. **No category update endpoint.** T-19 says "Manage categories (CRUD)"; only create, list and delete exist. `UpdateCategoryRequest` DTO exists but is unused.
9. **Orders paging response omits `page` and `limit`,** while the frontend's `PagedResult<Order>` type declares them. No component reads them today, so nothing breaks — but the TypeScript type misrepresents the contract.
10. **The rotated Supabase credential remains in the history of a public repository** (blob in commit `0b0bb06`). The password is dead, so this is not an active exposure, but the branch `member-3-authentication` still exists and should be deleted or rewritten.
11. **Order item product _name_ is not snapshotted** (only price is). M1 section 8.2 specifies both. Renaming a product rewrites the name shown on historical orders.
12. **`products.is_active` index from M1 section 8.3 was never created.**
13. **Category FK uses `SetNull`,** where M1 section 8.2 specifies `RESTRICT`. Behaviour is nonetheless correct because the service blocks deletion with a `409`.
14. **14 pre-existing `oxlint` warnings** (11 `react(set-state-in-effect)`, 3 `react(only-export-components)`). `npm run lint` exits 0.
15. **`@types/node` may be unused** in the frontend — zero `process.`/`node:` references in application code. Verify before removing.
16. **Ten stale `Phokwane-Mapadimeng-patch-*` branches** plus several merged feature branches remain on the remote, making the branch list hard to read.

---

## M6 Preparation Checklist

None of these are complete. Items marked ⚠️ are prerequisites created by this audit's findings.

**Resolve before starting M6**

- [ ] ⚠️ Fix Blocker 1 and record the real `dotnet test` output
- [ ] ⚠️ Fix Blocker 2 and add a regression test asserting the API's real status casing
- [ ] ⚠️ Verify `dotnet restore && dotnet build && dotnet test` on a machine with NuGet access (never verified in this audit)

**Hosting and infrastructure**

- [ ] Production frontend host selected (M1 suggests Vercel/Netlify)
- [ ] Production backend host selected (ASP.NET Core-compatible)
- [ ] Managed PostgreSQL host confirmed (Supabase is already in use for development)

**Configuration**

- [ ] `ConnectionStrings__DefaultConnection` set in the backend host's secret store
- [ ] `Jwt__Key` set in the backend host's secret store (never committed)
- [ ] `Jwt__Issuer` / `Jwt__Audience` / `Jwt__ExpiryMinutes` set
- [ ] ⚠️ `VITE_API_BASE_URL` set **in the frontend build environment** — not at runtime (issue #4)
- [ ] `Cors__AllowedOrigins__0` set to the deployed frontend origin (currently defaults to `http://localhost:5173`)
- [ ] `ASPNETCORE_ENVIRONMENT=Production` confirmed (this disables Swagger and enables HTTPS redirection)

**Database**

- [ ] Migrations executed against the production database (`dotnet ef database update`)
- [ ] ⚠️ First admin user provisioned — no application path exists (issue #3)
- [ ] Backup/restore approach agreed

**Pipeline and verification**

- [ ] GitHub Actions workflow added (`dotnet test` + `npm test` + build) — issue #1
- [ ] HTTPS confirmed on both hosts
- [ ] `/health` endpoint verified against the production database
- [ ] Production smoke test: register → browse → cart → checkout → order history
- [ ] Production smoke test: admin login → dashboard → product/category/order management
- [ ] Responsive verification at the three M1 breakpoints (≤480px, ≤768px, ≥1024px)
- [ ] Rollback procedure documented
- [ ] Live URLs documented

---

## Evidence & Limitations

Verified by execution in this audit:

- Fresh clone of `origin/main` @ `39410ff`; full history scan of 913 blobs across all branches
- `npm ci`, `tsc -b`, `oxlint`, `vite build`, `vitest run`, `vitest run --coverage`
- Production build served and booted in headless Chromium via Playwright
- Roslyn compilation of the two duplicate test base files (Blocker 1)
- Component-level execution of `AdminOrdersPage` and `OrdersPage` against the API's real status casing (Blocker 2)
- Mechanical layering checks across all backend `.cs` files

**Not verified in the available environment:**

- `dotnet restore` / `dotnet build` of `src/ECommerceApi.csproj` — `api.nuget.org` is blocked by this sandbox's egress policy
- `dotnet test` execution — blocked by the same, and independently by Blocker 1
- Migration execution against a live PostgreSQL instance
- Any live HTTP request to the running API
- Live end-to-end customer or admin journeys
- Browser compatibility and responsive breakpoints
- Any production/deployment behaviour

No test result, build result, coverage figure, Git fact, database result or browser result
in this document was fabricated or inferred from a previous milestone report.

---

## Final Determination

# 🔴 NOT READY FOR M6

Two blockers must be resolved first:

1. The backend test suite does not compile — 82 tests unrunnable (`CS0101`).
2. Order status casing mismatch — admin order management displays every non-Pending order as "Pending".

Both are small and well-understood; the combined fix is roughly two lines plus a test.
Once they are fixed and `dotnet restore && dotnet build && dotnet test` has been run and
recorded on a machine with NuGet access, this project should move straight to
🟡 **READY WITH CONDITIONS**, with the remaining 16 items tracked as M6 work rather than
gate failures.

Per the audit's terms of reference, deployment has **not** been started.
