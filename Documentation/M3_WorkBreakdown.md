# Milestone 3, API Implementation, Data Handling, Security Integration

## Context: what this commit actually did

This repo had diverged from earlier work: teammates (`Phokwane-Mapadimeng`,
`member2-database`) had independently added `categoryApi.ts`/its test,
and made real backend "Data Handling" changes:

- `Product.RowVersion` (a `[Timestamp]` concurrency token) to prevent two
  simultaneous requests from decrementing stock based on stale reads.
  `ExceptionHandlingMiddleware` already turns `DbUpdateConcurrencyException`
  into a `409 CONCURRENCY_CONFLICT`
- `CartRepository.AddItemAsync` now dedups: adding a product already in
  the cart increments its quantity instead of creating a duplicate row.
- `CartService.AddItemAsync` now validates against `Product.StockQuantity`
  and throws a descriptive `ValidationException` (- 400) when exceeded.
- Proper 404s from `CartRepository`/`CategoryRepository` for missing
  cart items / categories.

Separately, this repo's `frontend/src` only contained the API implementation layerthe Data Handling and Security Integration layers had been removed at some point and needed restoring.

## What was restored

From an archived branch (`feature/api-integration`, still present in
this repo's history but never merged into `Master`):

- **Data Handling**: `AuthContext`, `CartContext`, `ToastContext`. `CartContext` always takes the server's
  returned cart/subtotal as authoritative after every mutation, never
  computing totals client-side.
- **Security Integration**: `ProtectedRoute`, `AdminRoute`, the
  full auth flow, and role-based nav.

## Verification actually run in this session

| Check                                                 | Result                                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| `npm run build` (`tsc -b && vite build`)              | **PASS**                                           |
| `npm run test` (vitest)                               | **PASS**, 44/44 tests across 10 files              |
| `npm run lint` (oxlint)                               | **PASS**, 0 errors, 12 non-blocking style warnings |
| Live end-to-end run against the real backend/Supabase | **NOT RUN** in this environment                    |

## Known backend contract gaps

- No `PUT /api/categories/{id}`, category rename isn't offered in the
  admin UI because the backend doesn't support it end-to-end.
- Admin order management is a single status-transition endpoint
  (`PUT /api/orders/{id}/status`), not full order CRUD.
