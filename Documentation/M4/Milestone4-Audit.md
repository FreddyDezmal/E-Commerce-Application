# Milestone 4, Initial Frontend Audit

## Existing architecture

`UI - Pages - Context (Auth/Cart/Toast) - api/* services - apiClient - ASP.NET Core API`.
Architecture is already correct and untouched: no page calls `fetch`/`axios`
directly, all requests go through `src/api/*.ts` - `client.ts`. This audit
does not change that shape, only adds screens/CSS within it.

## Existing screens (routes in `App.tsx`)

`/` (catalog+filters, doubling as "Home"), `/products/:id`, `/login`,
`/register`, `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/profile`,
`/admin` (redirects straight to Products, no dashboard), `/admin/products`,
`/admin/categories`, `/admin/orders`, `*` 404.

## Reusable primitives already in place

`Layout` (header/nav/footer shell), `LoadingState`, `EmptyState`, `ErrorState`,
`ProtectedRoute`, `AdminRoute`, plus CSS-based patterns: `.button`,
`.ledger-table`, `.status-pill`, `.chip`, `.toast`, `.admin-form`. Design
tokens (`--color-*`, `--font-*`) exist in `index.css`. This is a real design
system, not ad-hoc styling, reused as-is.

## Styling approach

Hand-written CSS (no Tailwind/CSS-in-JS/component lib), single `index.css`,
BEM-ish class names, one `@media (max-width: 780px)` and one
`@media (max-width: 480px)` breakpoint. `prefers-reduced-motion` already
respected for the spinner.

## API integration

All business data (products, categories, cart, orders, users) is fetched
live via `src/api/*`; `CartContext` treats the server's returned cart as
authoritative after every mutation (never computes totals client-side).
No fake/hard-coded production data found anywhere in `src/`.

## Authentication / authorization

`AuthContext` stores JWT + user, `ProtectedRoute`/`AdminRoute` are UX-only
guards (documented as such), real authorization stays server-side. 401
handling exists in `client.ts` (verified below).

## Tests

44/44 passing (`vitest`), covering api/\*, `AuthContext`, `CartContext`,
`ProtectedRoute`, `CheckoutPage`. `tsc -b && vite build` passes cleanly.
No tests yet for `AdminProductsPage`/`AdminOrdersPage`/`AdminCategoriesPage`/
`OrderDetailPage`/`ProfilePage`/`HomePage` (per Milestone 3 audit, still true).

## Deficiencies identified (this is the actual scope of Milestone 4 work)

1. **No separate Home vs. Product Listing.** `/` _is_ the catalogue. Spec
   requires both as distinct screens (storefront intro + discovery CTA vs.
   the searchable/filterable catalogue).
2. **No Admin Dashboard.** `/admin` redirects straight into Product
   Management. There is no landing screen with real counts.
3. **No mobile navigation pattern.** The header nav just wraps at narrow
   widths; there's no disclosure/hamburger pattern, so on a small phone the
   header consumes excessive vertical space and links can crowd below 44px
   touch-target comfort.
4. **No product imagery treatment.** Product cards/detail show no visual
   at all, needs an honest placeholder, not
   fabricated photos.
5. **Order confirmation is a one-line banner** bolted onto `OrderDetailPage`
   rather than a clear confirmation moment with explicit next actions.
6. **Touch targets** on compact controls (quantity inputs, pagination
   buttons, chip remove buttons) are under ~44px on mobile.
7. Minor: no component-level tests yet for the pages listed above.

## What is reused unchanged

Everything in the "reused" list above, plus `CheckoutPage`, `CartPage`,
`OrdersPage`, `OrderDetailPage`'s data logic, `ProfilePage`, all of
`AdminProductsPage`/`AdminCategoriesPage`/`AdminOrdersPage`'s data logic,
all `api/*` services, all contexts, `client.ts`'s 401 handling. These are
correct, tested, and match the approved API contract, they are **not**
rewritten, only restyled/extended where a genuine gap exists.

## Known, already-documented backend contract gaps (carried over from M3)

No `PUT /api/categories/{id}` (no category rename in UI); order management
is single status-transition only, not full CRUD. Both remain true and are
not worked around with client-side fakes.

## What Milestone 4 implements

Items 1to6 above: split Home/Product Listing, Admin Dashboard, accessible
mobile navigation, an honest product-image placeholder, a clearer order
confirmation panel, and touch-target/focus polish, plus tests for the new
screens. No out-of-scope functionality (reviews, wishlists, coupons, etc.)
is introduced.
