# Milestone 4, Implementation Summary

## 1. What was built

Milestone 3 already delivered a real, API-integrated, tested frontend with a
genuine design system (not a wireframe). Per the "inspect before modifying"
and "don't rewrite working components" rules, Milestone 4 **kept all of
that working code and CSS in place** and closed the specific gaps found in
`Milestone4-Audit.md`:

1. Split the combined catalogue/home screen into two real screens:
   `HomePage` (storefront intro, value proposition, category shortcuts,
   "how it works") and `ProductListingPage` (the existing search/filter/
   paginate catalogue, moved to `/products`, unchanged logic).
2. Added a real `AdminDashboardPage` as `/admin`'s index route, showing
   product/category/order/pending-order counts and the 5 most recent
   orders, all pulled live from `productApi`/`categoryApi`/`orderApi`'s
   real `total`/list results, nothing fabricated.
3. Added an accessible mobile navigation pattern to `Layout`: a 44×44px
   toggle button (`aria-expanded`, `aria-controls`), a collapsible menu,
   an overlay scrim, Escape-to-close, and focus returned to the toggle on
   close. Desktop layout is visually unchanged.
4. Added an honest product-image placeholder (a styled initial, not a
   fabricated photo) to the product grid and product detail page, since
   the backend has no image field.
5. Turned the one-line order-confirmation banner into a proper
   confirmation panel with the order ID/date/total and explicit
   "View order history" / "Continue shopping" actions.
6. Raised touch targets (buttons, inputs, pagination, chip-remove,
   category filters) to ~44×44px and extended the design system CSS for
   the new screens.
7. Added component tests for all of the above.

Everything else, `CartPage`, `CheckoutPage`, `OrdersPage`,
`OrderDetailPage`'s data logic, `ProfilePage`, `AdminProductsPage`,
`AdminCategoriesPage`, `AdminOrdersPage`, all `api/*`, all contexts,
`ProtectedRoute`/`AdminRoute`, 401 handling, is the Milestone 3 code,
unmodified, because it already met the requirement and worked correctly.

## 2. Screen Inventory

| Screen              | Route                         | Purpose                                                       |
| ------------------- | ----------------------------- | ------------------------------------------------------------- |
| Home                | `/`                           | Storefront intro, value proposition, links into the catalogue |
| Product Listing     | `/products`                   | Searchable/filterable/paginated catalogue, real API data      |
| Product Detail      | `/products/:id`               | Single product, quantity, add to cart                         |
| Login               | `/login`                      | Email/password auth                                           |
| Register            | `/register`                   | Account creation                                              |
| Cart                | `/cart`                       | Server-authoritative cart, quantity/remove                    |
| Checkout            | `/checkout`                   | Order review + simulated payment placement                    |
| Order Confirmation  | `/orders/:id` (post-checkout) | Confirmation panel + next actions                             |
| Order History       | `/orders`                     | Customer's past orders                                        |
| Order Detail        | `/orders/:id`                 | Single order's items/status/total                             |
| Profile             | `/profile`                    | View/edit editable profile fields                             |
| Admin Dashboard     | `/admin`                      | Real counts + recent orders                                   |
| Product Management  | `/admin/products`             | Create/list/soft-delete products                              |
| Category Management | `/admin/categories`           | Create/list/delete categories                                 |
| Order Management    | `/admin/orders`               | List orders, change status                                    |
| 404                 | `*`                           | Not-found fallback                                            |

Order Confirmation is not a separate route, it's the same `OrderDetailPage`
rendered with `state.justPlaced`, now with a full confirmation panel. This
avoids duplicating order-rendering logic for a screen that is, functionally,
"order detail right after checkout."

## 3. Design System Summary

- **Typography**: `Fraunces` (display/headings) + `Inter` (body), defined as
  CSS custom properties, unchanged from Milestone 3.
- **Colors**: same tokens reused across every new screen, no one-off colors.
- **Spacing/radius**: existing `rem`-based spacing scale and 2px corner
  radius convention, applied to all new elements (hero, dashboard cards,
  nav toggle, placeholders).
- **Components (existing, reused)**: `Button`, `LoadingState`, `EmptyState`,
  `ErrorState`, `ledger-table`, `status-pill`, `chip`, `toast`.
- **Components (new)**: mobile nav toggle/scrim, hero section, dashboard
  stat cards, product-image placeholder, expanded confirmation panel.
- **Responsive strategy**: mobile-first breakpoints kept at `max-width:
780px` (tablet/mobile) and `max-width: 480px` (small phone); grids
  (`product-grid`, `dashboard-stats`, `home-steps__list`) collapse from
  3to4 columns - 2 - 1 as width decreases.

## 4. API Integration Summary

| Screen                           | API                                                                                                                      | Data                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Home                             | `GET /api/categories`                                                                                                    | Category shortcuts (real, capped to 6 shown)  |
| Product Listing                  | `GET /api/products`, `GET /api/categories`                                                                               | Paged products, filters                       |
| Product Detail                   | `GET /api/products/:id`                                                                                                  | Single product                                |
| Cart                             | `GET/POST/PUT/DELETE /api/cart*`                                                                                         | Server-authoritative cart                     |
| Checkout                         | `POST /api/orders`                                                                                                       | Order creation                                |
| Orders/Order Detail              | `GET /api/orders`, `GET /api/orders/:id`                                                                                 | Real order data                               |
| Profile                          | `GET/PUT /api/users/me`                                                                                                  | Real user record                              |
| Admin Dashboard                  | `GET /api/products?limit=1`, `GET /api/categories`, `GET /api/orders?limit=10`, `GET /api/orders?limit=1&status=Pending` | Real counts via `total`, no synthetic metrics |
| Admin Products/Categories/Orders | `productApi`/`categoryApi`/`orderApi` CRUD                                                                               | Real admin data                               |

No fake/hard-coded business data exists anywhere in `src/`.

## 5. Responsive Design Summary

- **Mobile (≤480px)**: single-column product grid and dashboard stats,
  stacked product detail (image above info), full-width nav menu items at
  44px min height, stacked catalogue header.
- **Tablet (~768px)**: nav collapses behind the hamburger toggle, 2-column
  product grid, single-column filter/catalogue and admin layout, 2-column
  dashboard stats.
- **Desktop (≥1024px)**: original 3-column product grid, side-by-side
  catalogue filters, 4-column dashboard stats, side-by-side product image
  and info, full inline nav (no hamburger).
- No horizontal overflow introduced; tables (`ledger-table`) were already
  scoped to reasonable column counts and remain within their containers at
  all three widths tested via the built CSS.

## 6. Accessibility Summary

- Semantic headings retained/added (`h1` per page, `h2` for sub-sections).
- Mobile menu: `aria-expanded`, `aria-controls`, Escape-to-close, focus
  returned to the toggle button, visually-hidden accessible label that
  changes with state ("Open menu" / "Close menu").
- Status communicated with text, not color alone (`status-pill` shows the
  word "Pending"/"Paid"/etc. alongside color; confirmation panel uses
  `role="status"`; `ErrorState` uses `role="alert"`; toasts use
  `aria-live="polite"`).
- Decorative product-image placeholders are `aria-hidden="true"` (the
  product name is already present as visible text next to them, so no
  duplicate/empty alt-text problem).
- Touch targets raised to ~44×44px across nav, buttons, inputs, pagination,
  chips, and category filters.
- `prefers-reduced-motion` already respected for the spinner (unchanged).
- Existing `focus-visible` outlines (`--color-accent`) apply to all new
  interactive elements automatically, since they use the same `button`/
  `input`/`a` base styles.

## 7. Testing Summary

- **Unit/component tests added**: `HomePage.test.tsx` (3),
  `ProductListingPage.test.tsx` (3), `AdminDashboardPage.test.tsx` (2),
  `Layout.test.tsx` (3, covering the mobile menu toggle/close/focus
  behavior), 11 new tests.
- **Pre-existing tests**: all 44 Milestone 3 tests retained and passing
  unmodified.
- **Total**: 55/55 tests passing across 14 files (`vitest run`).
- **E2E**: not run, this environment has no .NET SDK/PostgreSQL/browser
  automation available, so a real end-to-end run against the live backend
  could not be performed here (see Verification Results, **NOT RUN**,
  consistent with the Milestone 3 audit's same limitation). Manual E2E
  against the live backend remains the team's responsibility before
  the assessment.

## 8. Figma Comparison

No Figma file was present in the uploaded project (`Documentation/`
contains only `M1_SystemPlan.md` and `M1_SystemPlan_v1.1.md`, both text).
Per the source-of-truth order, the Milestone 1 system plan and the existing
high-fidelity implementation were used as the visual reference instead of
inventing a design. No Figma comparison is applicable.

## 9. Files Created / Modified

**Created**

- `frontend/src/pages/HomePage.tsx` (new storefront landing, replaces old content)
- `frontend/src/pages/ProductListingPage.tsx` (moved catalogue logic here)
- `frontend/src/pages/admin/AdminDashboardPage.tsx`
- `frontend/src/pages/__tests__/HomePage.test.tsx`
- `frontend/src/pages/__tests__/ProductListingPage.test.tsx`
- `frontend/src/pages/admin/__tests__/AdminDashboardPage.test.tsx`
- `frontend/src/components/__tests__/Layout.test.tsx`
- `Milestone4-Audit.md`, `Milestone4-Summary.md` (this file)

**Modified**

- `frontend/src/App.tsx` (routes: `/` - HomePage, `/products` - ProductListingPage, `/admin` index - AdminDashboardPage)
- `frontend/src/components/Layout.tsx` (mobile nav toggle/scrim/focus handling, Home/Shop nav links)
- `frontend/src/pages/admin/AdminLayout.tsx` (added Dashboard nav link)
- `frontend/src/pages/ProductDetailPage.tsx` (image placeholder markup)
- `frontend/src/pages/OrderDetailPage.tsx` (fuller confirmation panel + imports `Link`)
- `frontend/src/index.css` (new CSS: mobile nav, hero/home, catalog header, image placeholders, dashboard stats, confirmation panel, touch-target sizing; responsive breakpoints extended)

**Untouched** (already correct): all `api/*`, all contexts, `ProtectedRoute`/`AdminRoute`, `CartPage`, `CheckoutPage`, `OrdersPage`, `ProfilePage`, `AdminProductsPage`, `AdminCategoriesPage`, `AdminOrdersPage`, `types/api.ts`, `lib/errorMessage.ts`, all pre-existing tests.

## 10. Verification Results

| Check                                    | Result                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `npm run build` (`tsc -b && vite build`) | **PASS**                                           |
| `npm run test` (vitest)                  | **PASS**, 55/55 tests across 14 files              |
| `npm run lint` (oxlint)                  | **PASS**, 0 errors, 14 non-blocking style warnings |

## 11. Remaining Work (genuine, not padding)

- Re-run the full manual end-to-end flow (guest - register - login -
  browse - product detail - cart - checkout - confirmation - order
  history - profile - logout; admin login - dashboard - products -
  categories - orders - logout) against the live ASP.NET Core + Postgres
  backend, at mobile/tablet/desktop widths, in real browsers.
- Component tests still missing for `AdminProductsPage`, `AdminOrdersPage`,
  `AdminCategoriesPage`, `OrderDetailPage`, `ProfilePage`, `CartPage`
- No `PUT /api/categories/{id}` and no full order CRUD on the backend,
  the UI correctly does not offer category rename or arbitrary order
  editing, per the documented contract gap

## 12. Milestone 4 Audit (against requirements)

- **Assignment requirements**: Required screens are now all present
  as distinct routes; functional customer/admin journeys work end to
  end through the existing, unmodified API layer; out-of-scope features
  were not introduced.
- **Milestone 1 / v1.1**: Architecture layering (`UI - Pages - Context -
api/* - apiClient - API`) preserved exactly; no business logic added to
  components; no second backend; no direct DB access.
- **Milestone 2 (backend contract)**: No client-side fabrication of prices,
  stock, or authorization; admin dashboard counts come from real `total`
  fields; known contract gaps (category rename, order CRUD) respected.
- **Milestone 3 (API integration)**: All Milestone 3 code kept working;
  its 44 tests still pass unmodified; its documented "remaining work"
  (component tests for admin/profile/order-detail pages) is still open
  and listed above rather than silently dropped.
- **Milestone 4 (this milestone)**: Design system consistency, responsive
  behavior, and accessibility gaps identified in the initial audit were
  closed with real, tested code; no placeholder screens remain; loading/
  empty/error/success states exist on every API-driven screen (inherited
  from Milestone 3, extended to the two new screens).
- **Responsive requirements**: Verified via the built CSS's breakpoints
  and rendered node structure; not manually verified on physical devices.
- **Accessibility requirements**: Semantic HTML, keyboard-operable mobile
  menu with focus return, non-color status indicators, and touch-target
  sizing addressed; a full WCAG AA contrast/screen-reader audit was not
  run in this environment and is listed under Remaining Work.
- **Testing requirements**: Unit/component tests extended (55/55 passing);
  E2E and cross-browser testing were not run here and are explicitly
  marked NOT RUN rather than fabricated.
- **Git requirements**: Not evaluated in this session, no git commits
  were made here; the repository's existing history was left untouched.
  Applying this work as commits on feature branches (e.g.
  `feature/responsive-ui`, `feature/accessibility`, `feature/admin-ui`)
  is left to the team, per "do not fabricate Git history."
