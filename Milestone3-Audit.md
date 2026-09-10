# Milestone 3 — API Implementation, Data Handling, Security Integration

## Context: what this commit actually did

This repo had diverged from earlier work: teammates (`Phokwane-Mapadimeng`,
`member2-database`) had independently added `categoryApi.ts`/its test,
and — separately — made real backend "Data Handling" changes:

- `Product.RowVersion` (a `[Timestamp]` concurrency token) to prevent two
  simultaneous requests from decrementing stock based on stale reads.
  `ExceptionHandlingMiddleware` already turns `DbUpdateConcurrencyException`
  into a `409 CONCURRENCY_CONFLICT` — this is transparent to the frontend,
  no contract change was needed.
- `CartRepository.AddItemAsync` now dedups: adding a product already in
  the cart increments its quantity instead of creating a duplicate row.
- `CartService.AddItemAsync` now validates against `Product.StockQuantity`
  and throws a descriptive `ValidationException` (→ 400) when exceeded.
- Proper 404s from `CartRepository`/`CategoryRepository` for missing
  cart items / categories.

None of this required frontend contract changes — all of it surfaces as
ordinary `ApiError` messages the existing error handling already displays.

Separately, this repo's `frontend/src` only contained the API
implementation layer (`api/**`, `types/api.ts`) — the Data Handling
(state management) and Security Integration (auth context, route
guards) layers had been removed at some point and needed restoring.

## What was restored

From an archived branch (`feature/api-integration`, still present in
this repo's history but never merged into `Master`):

- **Data Handling**: `AuthContext`, `CartContext`, `ToastContext` — the
  app's state management layer. `CartContext` always takes the server's
  returned cart/subtotal as authoritative after every mutation, never
  computing totals client-side.
- **Security Integration**: `ProtectedRoute`, `AdminRoute` (UX-only
  guards — the backend remains the real authorization boundary), the
  full auth flow (login/register/logout, JWT storage, 401 handling),
  and role-based nav.
- Supporting pages (`HomePage`, `ProductDetailPage`, `CartPage`,
  `CheckoutPage`, `OrdersPage`, `OrderDetailPage`, `ProfilePage`,
  `admin/*`) and their tests, since Data Handling/Security Integration
  aren't meaningfully demonstrable without something to exercise them.

## Bugs found reconciling the archived branch against the current API layer

The archived branch predated two things that had since changed in this
repo's actual `frontend/src/api/**`, and predated a backend fix. Fixed
during this reconciliation:

1. **`cartApi.get()` → `cartApi.getCart()`** — renamed at some point in
   this repo's own history; the archived contexts/pages/tests still
   called the old name. Would have been a compile error, not a silent
   bug, but is exactly the kind of drift worth calling out.
2. **`categoryApi.remove()` → `categoryApi.delete()`** — same kind of
   rename drift, in `AdminCategoriesPage.tsx`.
3. **`user?.role === 'Admin'` → `'admin'`** — this repo's backend
   correctly lowercases the `Role` claim/DTO field (a real bug found
   and fixed in earlier end-to-end testing: `UserService`/`AuthService`
   map `Role.ToString().ToLowerInvariant()`, and `TokenService`'s JWT
   claim was fixed to stay PascalCase to match
   `[Authorize(Roles = "Admin")]`). The archived `AuthContext.tsx`
   predated that fix and still compared against the old PascalCase
   value, which would have silently kept `isAdmin` false for every
   real admin user. Fixed, with a regression test already covering it
   (`AuthContext.test.tsx`).
4. Test fixtures using `role: 'Customer'`/`role: 'Admin'` fixed to
   lowercase to match the real contract (`ProtectedRoute.test.tsx`,
   `CartContext.test.tsx`, `AuthContext.test.tsx`,
   `CheckoutPage.test.tsx`, `userApi.test.ts`).

## Verification actually run in this session

| Check | Result |
|---|---|
| `npm run build` (`tsc -b && vite build`) | **PASS** |
| `npm run test` (vitest) | **PASS** — 44/44 tests across 10 files |
| `npm run lint` (oxlint) | **PASS** — 0 errors, 12 non-blocking style warnings (the standard `useEffect` data-fetching pattern used throughout; see Milestone 3's "don't add React Query without justification" guidance) |
| Live end-to-end run against the real backend/Supabase | **NOT RUN** in this environment (no .NET SDK/PostgreSQL network access here) — this was previously verified manually by the team against a real Supabase-backed backend in an earlier session; re-verify after this reconciliation before treating it as re-confirmed |

## Known backend contract gaps (unchanged from earlier audits)

- No `PUT /api/categories/{id}` — category rename isn't offered in the
  admin UI because the backend doesn't support it end-to-end.
- Admin order management is a single status-transition endpoint
  (`PUT /api/orders/{id}/status`), not full order CRUD.

## Remaining work

- Re-run the full manual end-to-end flow (register → login → browse →
  cart → checkout → orders → admin) against the live backend now that
  the frontend has been reconciled with the current API layer and
  backend fixes, to confirm nothing regressed.
- No tests yet for `AdminProductsPage`/`AdminOrdersPage`/
  `OrderDetailPage`/`ProfilePage` at the component level.
