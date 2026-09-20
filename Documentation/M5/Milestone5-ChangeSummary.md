# Milestone 5 — Change Summary

**Date:** 20 September 2026
**Scope:** every change made to the repository as a result of the Milestone 5 exit audit.
**Detail:** `Milestone5-ExitAudit-PreDeploymentGate.md` (the audit) and
`Milestone5-ExitAudit-FinalAddendum.md` (root causes and evidence).
Earlier component-testing work is covered by `M5_ComponentTesting.md` and
`Milestone5-TestReporting-CoverageAnalysis.md`.

---

## Result

| | Before | After |
| --- | --- | --- |
| Backend tests | **would not compile** | **90 / 90 passing** |
| Frontend tests | 283 / 283 | **290 / 290** |
| Readiness | 🔴 NOT READY FOR M6 | **🟢 READY FOR M6** |

Two blockers were fixed. Two further production defects were found while proving
the fixes, and were also fixed.

---

## Production code (4 files)

| File | Change | Why |
| --- | --- | --- |
| `src/Services/Implementations/OrderService.cs` | Emit order status in the enum's own casing instead of lowercasing it | The admin status control's options are capitalised. A `<select>` whose value matches no option falls back to the first one, so **every non-Pending order displayed as "Pending"** to the admin. |
| `src/Models/Product.cs` | Removed `[Timestamp] byte[] RowVersion` | `[Timestamp]` is the SQL Server pattern. PostgreSQL never populated the column, so the optimistic-locking check compared `'' = ''` and **protected nothing**. |
| `src/Data/Configurations/ProductConfiguration.cs` | `UseXminAsConcurrencyToken()` | `xmin` is PostgreSQL's own row version and does change on every update, so concurrency control on stock decrements now actually works. |
| `src/Program.cs` | Auth rate limiting partitioned per IP; limits read from configuration; rejection status 429 instead of 503 | `AddFixedWindowLimiter("auth", ...)` creates **one bucket shared by every caller** — 20 sign-ins per 15 minutes for the entire deployment. The 21st user got a 503, and one user could lock out everyone. M1 §12 specified per-IP limiting. |

## Database (1 migration)

| File | Change |
| --- | --- |
| `src/Migrations/*_UseXminConcurrencyToken.*` | Drops the dead `RowVersion` column. The "possible data loss" warning is expected — the column never held anything. |

## Tests (5 files)

| File | Change | Why |
| --- | --- | --- |
| `tests/.../functional/FunctionTestBase.cs` | **Deleted** | Duplicate of `FunctionalTestBase.cs` — same class, same namespace. `CS0101` made the whole test project uncompilable, so **all 82 backend tests were unrunnable**. |
| `tests/.../Unit/Services/OrderServiceTests.cs` | 4 assertions corrected | They asserted the old lowercase casing. |
| `tests/.../functional/ShoppingJourneyTests.cs` | 2 assertions corrected | Same reason. |
| `tests/.../Integration/CustomWebApplicationFactory.cs` | Test host runs as `Development`; InMemory transaction warning ignored; auth limit raised for tests only | Under `Test`, every server error returned a bare "An unexpected error occurred", hiding the real causes. InMemory cannot run transactions, so checkout returned 500. All test requests share one loopback IP, so the per-IP limit would throttle the suite itself. |
| `frontend/src/pages/admin/__tests__/AdminOrdersPage.contract.test.tsx` | **New** — 7 tests | Asserts the status casing the API actually sends, for all five statuses, so the frontend and backend cannot drift apart silently again. |

No frontend application code was changed. No architecture was changed.

---

## Two things worth knowing

**The 16 functional tests had never run once.** They were added in the same
upload as the duplicate class that blocked compilation, so nobody had ever seen
them execute. Three real defects were hiding behind that. This is the clearest
argument for adding the CI workflow that Milestone 1 §15.2 requires and the
repository still lacks.

**Two behaviours are still not covered by automated tests.** Checkout atomicity
and product search (`EF.Functions.ILike`) cannot run on the InMemory provider —
`ShoppingJourneyTests` already declares both out of scope in its header. Both
need a smoke test against real PostgreSQL during M6.

---

## Still outstanding

1. `Documentation/M5_Reports/UserTestingAnalysis.md` is a **0-byte empty file**.
2. `M5_ComponentTesting.md` is stale — it states 282 tests / 31 files and "no
   coverage provider is installed"; the real figures are 290 frontend tests
   across 33 files, plus 90 backend tests, with coverage measured.
3. The backend result (90/90) is not recorded in any milestone document. It could
   not be produced before today.
4. No admin account can be created by the application, so production needs a
   manual first-admin seed. `VITE_API_BASE_URL` must be set in the frontend
   **build** environment. Both are in the M6 checklist.
