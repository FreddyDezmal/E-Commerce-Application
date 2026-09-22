# SEN371 Milestone 5, Component Testing Report

> **STATUS UPDATE — 20 September 2026.** The figures in this report describe the
> component-testing phase **as it was delivered** (282 tests across 31 files, no
> coverage measured at that time). Both have since moved on:
>
> |                | This report         | Current repository                                |
> | -------------- | ------------------- | ------------------------------------------------- |
> | Frontend tests | 282 across 31 files | **290 across 33 files**                           |
> | Coverage       | not measured        | **measured** — 94.56% statements, 88.68% branches |
> | Backend tests  | out of scope here   | **90 / 90 passing**                               |
>
> The added tests are a user-journey test (`userTesting.test.tsx`) and seven
> `AdminOrdersPage` contract regression tests. Current figures and methodology
> live in `Milestone5-TestReporting-CoverageAnalysis.md`; the backend result and
> the defects it uncovered are in `Milestone5-ExitAudit-FinalAddendum.md`.
>
> The historical numbers below are left as written, because they are the honest
> record of what that phase produced.

---

**Scope:** Frontend React component testing only.  
**Branch:** `test/milestone5-component-testing`  
**Date of test execution:** 16 September 2026

This report covers the Component Testing portion of Milestone 5 only. Backend unit/service/repository testing, integration testing, database testing, API endpoint testing, UAT, performance and security testing are out of scope and were not attempted. Issues found outside component scope are recorded in section 9 Remaining Issues rather than fixed.

---

## 1. Testing Setup

### Audit findings (before any changes)

The frontend already had a complete component-testing stack. **No new testing framework was introduced and no new testing dependency was added.**

| **Concern**         | **Existing state**                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework           | React 19.2 + TypeScript 6.0 + Vite 8.2                                                                                                          |
| Test runner         | Vitest 5.0, configured in `vite.config.ts`                                                                                                      |
| Component library   | `@testing-library/react` 16.3                                                                                                                   |
| Interaction library | `@testing-library/user-event` 14.6                                                                                                              |
| Matchers            | `@testing-library/jest-dom` 7.0, loaded in `src/test/setup.ts`                                                                                  |
| DOM environment     | `jsdom` 30                                                                                                                                      |
| Linter              | `oxlint` 1.79 with the react and typescript plugins                                                                                             |
| Test script         | `npm test` → `vitest run`                                                                                                                       |
| Test layout         | `__tests__/` folders beside the code under test                                                                                                 |
| Existing convention | `vi.mock('../../api/xApi')` module auto-mocking, `MemoryRouter`, a token in `localStorage` plus a mocked `userApi.getMe` to establish a session |

Application architecture confirmed and preserved: React Router 7 routing (`App.tsx`), a layered API client (`src/api/client.ts` → per-resource modules), JWT held in `localStorage` under `ecommerce.auth.token`, and three React context providers (`AuthProvider` → `CartProvider` → `ToastProvider`).

### Configuration changes

One configuration change was required, in `vite.config.ts` only:

```ts
test: {
  env: { VITE_API_BASE_URL: 'http://localhost:3001' },
}
```

**Root cause, verified before changing anything:** `.env` is gitignored and no default is committed, so `VITE_API_BASE_URL` was `undefined` under test. The API client builds absolute URLs with `new URL(path, BASE_URL + '/')`, which threw `TypeError: Invalid URL` inside the `try` block that wraps `fetch`, so the client reported every request as a `NetworkError`. On a clean `npm ci` checkout this failed 27 of the 55 existing tests. This is an environment/configuration defect (category C), not a production-code defect, and it was fixed in the test configuration alone.

### Test utilities added

Two test-only files, extracted only after the same setup had genuinely repeated:

- `src/test/renderWithProviders.tsx`, mounts a component inside the same `AuthProvider` / `CartProvider` / `ToastProvider` / router stack that `main.tsx` uses, so tests exercise the real wiring rather than a test-only substitute. Options: `route`, `path`, `state` (router location state), `otherRoutes` (to assert navigation without stubbing the router), and `guard` (to mount a page behind its real `ProtectedRoute` / `AdminRoute`, as `App.tsx` nests it). Also `signInAsCustomer()`, `signInAsAdmin()`, `signOut()`.
- `src/test/fixtures.ts`, factories over the types in `src/types/api.ts`: `createMockUser`, `createMockAdminUser`, `createMockProduct`, `createMockCategory`, `createMockCartItem`, `createMockCart`, `createMockEmptyCart`, `createMockOrderItem`, `createMockOrder`, `createMockPagedResult`. All values are invented. **No real credentials, production tokens or production customer data appear anywhere in the suite.**

`createMockCart` deliberately does **not** compute `subtotal` from its items. The real API calculates totals server-side, so several tests supply a subtotal that differs from the sum of the lines; if a component ever started computing totals client-side, those tests would fail.

---

## 2. Components Tested

Components below are the actual components in the repository. Rows marked _(existing)_ had some coverage before this phase; the Test Scenarios column describes what is covered **now**.

| **Component**                     | **Behaviour tested**                                   | **Test scenarios**                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoadingState`                    | Rendering, accessibility                               | Default label, custom label, `role="status"`, decorative spinner hidden                                                                                                                                                                                                                                                                                                                        |
| `ErrorState`                      | Rendering, interaction, accessibility                  | `role="alert"`, retry present/absent, retry fires, keyboard operable                                                                                                                                                                                                                                                                                                                           |
| `EmptyState`                      | Rendering                                              | Title only, title + hint, not announced as an alert                                                                                                                                                                                                                                                                                                                                            |
| `Layout` _(existing)_             | Auth-aware and role-aware navigation, mobile menu      | Signed out / customer / admin navigation, cart badge quantity and singular-plural label, sign out returns to guest nav, `main` and `navigation` landmarks, brand link; menu toggle, Escape and focus return                                                                                                                                                                                    |
| `ProtectedRoute` _(existing)_     | Route guarding                                         | Unauthenticated redirect, authenticated pass-through                                                                                                                                                                                                                                                                                                                                           |
| `AdminRoute` _(existing)_         | Role guarding                                          | Customer redirected away, admin allowed through                                                                                                                                                                                                                                                                                                                                                |
| `ToastContext`                    | Success/error announcement                             | Polite live region, success, error, stacking, self-dismissal, provider misuse                                                                                                                                                                                                                                                                                                                  |
| `AuthContext` _(existing)_        | Auth state                                             | Login, register, failed login, logout, session restore from stored token                                                                                                                                                                                                                                                                                                                       |
| `CartContext` _(existing)_        | Cart state                                             | No fetch when signed out, load when signed in, add item, load failure                                                                                                                                                                                                                                                                                                                          |
| `HomePage` _(existing)_           | Rendering                                              | Intro and catalogue link, real categories, no categories section when empty                                                                                                                                                                                                                                                                                                                    |
| `ProductListingPage` _(existing)_ | Loading/error/empty, cards, search, filter, pagination | Loading → data, empty, error + retry; card link, stock and out-of-stock, result count singular/plural; search by button and Enter, pre-filled from URL, no-results; category list, filter applied, filter cleared, category failure tolerated; Previous/Next bounds, page label, pagination landmark, no controls when empty                                                                   |
| `ProductDetailPage`               | Loading, error, product info, quantity, add to cart    | Loading, load failure, network failure; name/description/price, missing description, in-stock and out-of-stock; initial quantity, max bound, select-and-replace, clamp on empty, disabled when out of stock; unauthenticated redirect to sign in, add with chosen quantity, success toast, in-flight disabling and duplicate-click guard, failure toast with retry, disabled when out of stock |
| `CartPage`                        | Rendering, quantity, removal, empty, error, navigation | Loading, empty cart with no checkout action; load failure + retry + recovery; line rendering, line totals, server subtotal, per-item accessible names; quantity update request, updated subtotal, update failure; removal with refetch, confirmation, empty state after last removal, failed removal, per-row disabling; checkout navigation, continue shopping                                |
| `CheckoutPage` _(existing)_       | Loading, empty, summary, submission, error             | Loading, empty cart with no place-order action; line items, server-calculated total, no premature error; places order, duplicate-submit guard, failure re-enables button                                                                                                                                                                                                                       |
| `OrdersPage`                      | Loading, empty, error, listing                         | Loading, no table while loading; empty history; load failure + retry + recovery; rows with status and total, detail links, paged request, readable date, column headers                                                                                                                                                                                                                        |
| `OrderDetailPage`                 | Rendering, distinct error states, confirmation         | Loading; reference/status/total, items at purchase price, server total, column headers; 404 "couldn't find", 403 "no permission", no retry on 404, retry on transient failure and recovery; no banner from history, confirmation banner after checkout with next-step links                                                                                                                    |
| `ProfilePage`                     | Rendering, validation, saving                          | Customer details, locked email/role, editable name, admin role, unreachable without a session; empty and whitespace name rejected; sends only `fullName`, success toast, saving state, rejection handling, no success on failure                                                                                                                                                               |
| `NotFoundPage`                    | Rendering, routing                                     | Message, link back to catalog                                                                                                                                                                                                                                                                                                                                                                  |
| `AdminLayout`                     | Routing, accessibility                                 | Labelled admin nav, all four section links, nested section renders                                                                                                                                                                                                                                                                                                                             |
| `AdminDashboardPage` _(existing)_ | Rendering, error                                       | Real counts from the API, error + retry                                                                                                                                                                                                                                                                                                                                                        |
| `AdminProductsPage`               | Loading, error, table, form, create, delete            | Loading, failure + retry + recovery; price/stock per row, soft-deleted hidden, category options; name required, negative price and stock not submitted, zero price accepted; numeric coercion, category association, success toast + list refresh, form cleared, in-flight disabling, backend rejection keeps input                                                                            |
| `AdminCategoriesPage`             | Loading, error, empty, create, delete                  | Loading, failure + retry + recovery; empty state with form still available; list, per-category accessible delete names, visually-hidden label; name required, whitespace rejected, create + confirm, list refresh, field cleared, in-flight disabling, duplicate rejection; delete + confirm, failed delete, empty state after last delete, per-row disabling                                  |
| `AdminOrdersPage`                 | Loading, empty, error, listing, status control         | Loading; empty; failure + retry + recovery; references and totals, preselected status, status list matches the backend transition endpoint, no full-order editing offered, page size; status transition request, confirmation + reload, rejected transition keeps previous status, per-row disabling                                                                                           |

---

## 3. Test Scenarios Implemented

All of the following categories are implemented in the suite:

- **Rendering**, every component above renders from controlled API data.
- **Interaction**, clicks, typing, select-and-replace, option selection, keyboard `Enter` and `Escape`, `Tab` focus order.
- **Forms**, login, registration, profile, admin product creation, admin category creation.
- **Validation**, required fields, whitespace-only input, email format, the eight-character password boundary (both sides), negative price and stock.
- **Loading**, indicators appear, content does not appear early, controls disable during submission, indicators clear on completion.
- **Error**, API failure, network failure, validation failure, 403, 404, conflict; each asserted through what the user sees and can do next.
- **Empty**, empty catalogue, empty search results, empty cart, empty checkout, empty order history, empty admin order queue, empty category list.
- **Success**, add to cart, login, registration, order placement, profile save, product creation, category creation, order status transition.
- **Authentication-aware UI**, signed-out versus signed-in navigation, unauthenticated add-to-cart redirect, profile unreachable without a session.
- **Authorization-aware UI**, admin link and admin routes for admins only; customers redirected away from admin routes.
- **Routing**, product detail links, cart → checkout, checkout → order confirmation, order history links, admin section links, the `ProtectedRoute` `state.from` handoff that returns a user to the page they came from.
- **Accessibility**, accessible names (`getByRole` with `name`), form labels including visually-hidden ones, `role="status"` and `role="alert"` regions, `aria-live="polite"` toasts, `aria-expanded`/`aria-controls` on the menu toggle, focus return on Escape, keyboard-operable retry, landmark labelling (`main`, `navigation`, `search`), column headers, decorative content hidden with `aria-hidden`.
- **Regression**, see the section below.

### API mocking

Components are mocked at the project's own service boundary (`src/api/*Api.ts`) using Vitest module auto-mocking, which is the convention the repository already established. The real `apiClient`, routing, contexts and component boundaries are left intact:

```text
React component → context provider → src/api/<resource>Api.ts → [MOCK]
```

Response scenarios exercised: success, empty collection, validation failure (400/422 messages), unauthorized handling, forbidden (403), not found (404), conflict (409), server error, and network failure.

### Regression protection for Milestone 3/4 behaviour

Deliberate regression locks were written for behaviours that would be easy to break silently:

- Totals and subtotals come from the server. Several tests supply a subtotal or order total that **differs** from the sum of the line items, so any future client-side recalculation fails the test (`CartPage`, `CheckoutPage`, `OrderDetailPage`).
- The cart badge counts total quantity, not the number of line items.
- Soft-deleted products stay hidden in the admin table.
- The admin status control offers exactly the five statuses the backend transition endpoint supports, and offers no full-order editing the API does not provide.
- `OrderDetailPage` keeps 403 and 404 as distinct, differently-worded states.
- Duplicate-submission guards on checkout, login, registration, add-to-cart and admin product creation.
- Per-row (not whole-page) disabling during cart, product and order mutations.
- Mobile menu Escape handling and focus return.

---

## 4. Test Execution

```text
Test command:      npm test        (vitest run)
Tests discovered:  282 across 31 test files
Tests executed:    282
Tests passed:      282
Tests failed:      0
Tests skipped:     0
```

Supporting commands, all actually executed:

```text
npx tsc -b        → exit 0 (type-check clean)
npm run lint      → exit 0 (oxlint: 14 warnings, all pre-existing, see section 9)
npm run build     → exit 0 (tsc -b && vite build, 57 modules, built in 199ms)
npm test          → 31 files / 282 tests passed
```

Breakdown of the 282:

- **55** pre-existing tests (14 files) that existed before this phase, of which 27 were failing on a clean checkout and now pass after the configuration fix.
- **227** newly written component tests (17 new files).

Independence was verified, not assumed: the full suite was run with shuffled file and test order under two different seeds (`--sequence.shuffle --sequence.seed=12345`, `98765`, `4242`) and passed 282/282 each time. No test depends on execution order, a live backend, a live database, or another test's result. Each test establishes its own state and mocks are cleared in `afterEach`.

**No coverage figures are claimed in this report.** Coverage was not measured during this phase and adding a provider was outside its scope. _(Update: coverage has since been measured — see `Milestone5-TestReporting-CoverageAnalysis.md`.)_

---

## 5. Failures and Fixes

Every failure encountered during this phase, its root cause, and its resolution.

### 1. 27 pre-existing API-layer tests failing on a clean checkout

**Root cause:** `VITE_API_BASE_URL` undefined under test (`.env` is gitignored), so `new URL(path, 'undefined/')` threw inside the `try` wrapping `fetch` and the client reported a `NetworkError`.

**Category:** Environment problem (category C).

**Fix:** Pinned the variable in the Vitest config. No production code touched.

**Verified:** 55/55 pre-existing tests pass from a clean `npm ci`.

### 2. `ToastContext` self-dismissal test timed out

**Root cause:** `waitForElementToBeRemoved` polls on real timers while the toast's `setTimeout` was faked, and `userEvent` schedules its own timers that deadlock against a faked clock.

**Category:** Test problem (category A).

**Fix:** Drove the interaction with `fireEvent` and advanced the clock explicitly inside `act`. Asserts "it goes away by itself" without pinning the exact delay.

**Verified:** Passes.

### 3. `ProductDetailPage` loading assertion, "Found multiple elements with role status"

**Root cause:** `ToastProvider` keeps a permanent `role="status"` live region mounted, so that role is ambiguous under the full provider stack.

**Category:** Test problem.

**Fix:** Queried the loading text directly.

**Verified:** Passes.

Noted in section 9 as a test-authoring hazard.

### 4. `ProductDetailPage` quantity, clearing and typing "3" produced 13

**Root cause:** A genuine component behaviour. The controlled input snaps an emptied value straight back to `1`, so the typed digit appends to it (category B, low severity).

**Fix:** The interaction test now uses triple-click select-and-replace, which is what a user doing this normally does and which works correctly. The quirk itself is recorded in an explicitly-named test rather than being silently adapted to.

No production code was changed.

**Reported in section 9.**

**Verified:** Both tests pass.

### 5. `CartPage` loading assertion found the empty state instead

**Root cause:** The test asserted synchronously, but the cart request only starts after `AuthProvider` restores the session from the stored token.

**Category:** Test problem.

**Fix:** Awaited the loading state.

**Verified:** Passes.

### 6. `CartPage`, "Found multiple elements with the text: R85.50"

**Root cause:** A line with quantity 1 shows the same figure as its unit price and its line total.

**Category:** Test problem.

**Fix:** Scoped the assertions per table row with `within`.

**Verified:** Passes.

### 7. `ProfilePage` rendered an empty full-name field

**Root cause:** `ProfilePage` seeds its form state from `user` on first render. In the application, `App.tsx` nests it under `ProtectedRoute`, which guarantees the session is resolved before it mounts. The test had rendered it bare and so misrepresented how it mounts.

**Category:** Test-harness problem (category C).

**Fix:** Added a `guard` option to `renderWithProviders` and mounted the page behind the real `ProtectedRoute`, matching `App.tsx`. No production code changed.

**Verified:** Passes, and an added test confirms the page is unreachable without a session.

### 8. `AdminProductsPage` negative price/stock produced no error message

**Root cause:** Unlike the auth forms, this form is not marked `noValidate`, so the browser's native constraint validation (`min={0}`) blocks submission before the page's own handler runs.

**Category:** Existing-architecture observation (category D).

**Fix:** The tests now assert what the admin actually gets, an invalid field and no API request, rather than error text that cannot currently be reached.

No production code was changed.

**Reported in section 9.**

**Verified:** Passes.

---

## 6. Files Changed

### Modified (1)

- `frontend/vite.config.ts`, added `test.env.VITE_API_BASE_URL` (+10 lines).

### Added, test utilities (2)

- `frontend/src/test/renderWithProviders.tsx`
- `frontend/src/test/fixtures.ts`

### Added, component tests (17)

- `frontend/src/components/__tests__/StateBlocks.test.tsx`
- `frontend/src/components/__tests__/LayoutNavigation.test.tsx`
- `frontend/src/context/__tests__/ToastContext.test.tsx`
- `frontend/src/pages/__tests__/LoginPage.test.tsx`
- `frontend/src/pages/__tests__/RegisterPage.test.tsx`
- `frontend/src/pages/__tests__/ProductDetailPage.test.tsx`
- `frontend/src/pages/__tests__/ProductListingPage.interactions.test.tsx`
- `frontend/src/pages/__tests__/CartPage.test.tsx`
- `frontend/src/pages/__tests__/CheckoutPage.states.test.tsx`
- `frontend/src/pages/__tests__/OrdersPage.test.tsx`
- `frontend/src/pages/__tests__/OrderDetailPage.test.tsx`
- `frontend/src/pages/__tests__/ProfilePage.test.tsx`
- `frontend/src/pages/__tests__/NotFoundPage.test.tsx`
- `frontend/src/pages/admin/__tests__/AdminLayout.test.tsx`
- `frontend/src/pages/admin/__tests__/AdminProductsPage.test.tsx`
- `frontend/src/pages/admin/__tests__/AdminCategoriesPage.test.tsx`
- `frontend/src/pages/admin/__tests__/AdminOrdersPage.test.tsx`

**Zero production component, context, API-client, routing or styling files were modified.**

### Commits on `test/milestone5-component-testing`

```text
fc00ef5 test(components): cover checkout loading, empty-cart and summary states
39b4c75 test(components): add admin product, category and order management tests
15e14d3 test(components): add order history, order detail and profile tests
68307e4 test(components): add product and cart interaction tests
dfc7232 test(components): add authentication form tests
bf41fcb test(components): cover shared UI, toasts and auth-aware navigation
61a1998 test(frontend): add shared component-test fixtures and render helpers
e0438a8 test(frontend): pin VITE_API_BASE_URL for the vitest environment
```

---

## 7. Architecture Impact

- **No production architecture changes.** Routing, the API abstraction, state management, the authentication architecture, the design system and all component boundaries are untouched.
- **Testing utility additions:** two test-only files (`renderWithProviders.tsx`, `fixtures.ts`).
- **API mocking changes:** none to production code. Mocking uses the project's existing service-layer boundary and its existing `vi.mock` convention.
- **Other targeted changes:** one Vitest configuration key, fixing the environment defect described in section 1 and section 5.

No component required refactoring to become testable. Where a page was awkward to mount in isolation (`ProfilePage`), the fix was to mount it behind its real route guard rather than to change the page.

---

## 8. TDD Evidence

This section is deliberately explicit, because the honest answer matters more than a tidy one.

**No genuine RED → GREEN → REFACTOR cycle was performed for application functionality, because no new application functionality was built in this phase.** The React frontend was already complete from Milestones 3 and 4. Every component test written here is **retrospective**: the implementation existed first, and the tests were written afterwards to characterise and protect it.

Specifically:

- **Existing tests (55, in 14 files):** written before this phase, in earlier Milestone commits. They are preserved as-is, untouched. No claim is made that they were produced by TDD, and the actual Git history has not been rewritten.
- **New tests (227, in 17 files):** all written retrospectively against existing components during this phase. They are regression and characterisation tests, not test-first development.
- **One genuine RED → GREEN cycle occurred**, and it concerns test infrastructure rather than a feature: the suite was observed failing (27 failures, RED), the root cause was diagnosed, the configuration fix was applied, and the suite was observed passing (55/55, GREEN). This is visible in the history as commit `e0438a8` and is reproducible by checking out the preceding commit and running `npm ci && npm test`.

**No commits, timestamps, failing-test history, test results, coverage figures, CI results or developer actions have been fabricated.** No fake historical commits were created to make the history appear TDD-compliant. All numbers in section 4 are copied from actual command output.

---

## 9. Remaining Issues

### Component-scope issues found and documented (not fixed)

#### 1. `ProductDetailPage` quantity input clamps on empty

The controlled input snaps an emptied value back to `1` during `onChange`, so a customer who deletes the field contents and then types `3` ends up with `13`. Selecting the value and typing over it works correctly.

Fixing it properly means holding the raw string in state and clamping on blur or submit, a production change that was judged out of proportion to the severity for this phase. Recorded by an explicitly-named test so it cannot change unnoticed.

#### 2. `AdminProductsPage` has unreachable validation code

The create form is not marked `noValidate`, so native constraint validation (`min={0}`) blocks a negative price or stock before `handleCreate` runs.

Consequently the page's own messages, `'Price must be zero or greater.'` and `'Stock quantity must be zero or greater.'`, can never be displayed.

The `Number.isNaN(price)` branch is also unreachable, since `Number('')` is `0`, not `NaN`.

Data integrity is not at risk, the browser blocks submission and the backend validates independently, but the branches are dead code.

Either add `noValidate` (as the auth forms do) so the app's own messaging is used, or remove the dead branches.

#### 3. `ToastProvider` keeps a permanent `role="status"` region mounted

This makes `getByRole('status')` ambiguous in any test rendering the full provider stack, and means a screen reader encounters a persistent empty live region.

Not a defect, but a test-authoring hazard worth knowing about.

### Configuration issues

#### 4. No committed environment default for development

`.env` is gitignored and `.env.example` is not copied automatically, so `npm run dev` on a fresh clone logs the client's `console.error` and every request fails as a `NetworkError`.

This phase fixed it for the test environment only.

A `predev` step, or a documented setup instruction, would fix it for development. This is a build/setup concern rather than a component-testing one.

#### 5. The suite requires Vitest's default file isolation

Running with `--no-isolate` fails.

This was verified to be **pre-existing**: the original 55 tests alone fail 15 under `--no-isolate`, because the repository's `vi.mock`-per-file convention and RTL's DOM cleanup both assume per-file isolation.

`npm test` uses the isolated default, so this affects nobody in practice; it is recorded so that no one enables `--no-isolate` for speed without expecting it.

### Out-of-scope observations (documented, deliberately not acted on)

#### 6. 14 pre-existing lint warnings in production components

There are 14 pre-existing lint warnings in production components: 11 `react(set-state-in-effect)` and 3 `react(only-export-components)`.

All predate this phase, none are in the new test files, and `npm run lint` exits 0.

Addressing them is a refactoring task, not a component-testing one.

#### 7. `src/api/__tests__/` contains API-layer tests

These are service-layer tests using a stubbed `fetch`, not component tests.

They fall under a different Milestone 5 category and were left untouched apart from being unblocked by the configuration fix.

There are 28 API-layer tests.

#### 8. Coverage was not measured _(resolved after this report)_

No coverage provider was installed at the time and adding one was out of scope, so no coverage percentage is claimed anywhere in this report. _(Update: `@vitest/coverage-v8` was added afterwards and coverage is reported in `Milestone5-TestReporting-CoverageAnalysis.md`.)_

### Explicit non-claims

- Passing accessibility assertions **do not** amount to WCAG AA compliance. The tests verify specific, observable accessibility behaviours (accessible names, labels, roles, live regions, focus handling, landmarks). A full WCAG AA audit, colour contrast, zoom and reflow, real screen-reader testing, was not performed and is not evidenced here.
- Passing component tests **do not** demonstrate browser compatibility. Every test runs in jsdom, not in a real browser.
- Passing component tests **do not** demonstrate that the backend behaves as mocked. Contract verification belongs to the integration and API testing categories.

---

## 10. Reproduction

The component test suite can be reproduced from a clean checkout with:

```bash
cd frontend
npm ci
npm test
```

The expected result is:

```text
31 test files
282 tests passed
0 tests failed
0 tests skipped
```

The supporting checks can be reproduced with:

```bash
npx tsc -b
npm run lint
npm run build
```

Expected results:

```text
TypeScript: exit 0
Lint: exit 0
Build: exit 0
```

To verify test-order independence:

```bash
npx vitest run --sequence.shuffle --sequence.seed=12345
npx vitest run --sequence.shuffle --sequence.seed=98765
npx vitest run --sequence.shuffle --sequence.seed=4242
```

Each run should pass the complete 282-test suite.

---

## 11. Conclusion

The Milestone 5 Component Testing scope was completed without modifying production application functionality.

As delivered by this phase, the component-testing suite contained **282 passing tests across 31 test files**, including **227 new component tests across 17 new test files** and **55 pre-existing tests** that were preserved.

The tests cover rendering, interaction, forms, validation, loading, errors, empty states, success paths, authentication, authorization, routing, accessibility behaviours and regression-sensitive application rules.

The only production-adjacent change was a Vitest environment configuration value required to make the existing API-layer tests execute correctly from a clean checkout. Two reusable test-only utilities were added to reduce repeated setup.

No coverage percentage is claimed here because coverage measurement was outside the scope of this component-testing phase. _(Update: it was measured afterwards — see `Milestone5-TestReporting-CoverageAnalysis.md`.)_

The remaining issues are documented rather than hidden, including the `ProductDetailPage` quantity-input quirk, unreachable validation branches in `AdminProductsPage`, the permanent toast live region, the missing development environment default, and the repository's pre-existing `--no-isolate` limitation.

Overall, the evidence in this report is based on the actual test suite, actual command results, and actual Git history available on `test/milestone5-component-testing`. No test history, TDD evidence, coverage results or CI evidence has been fabricated.
