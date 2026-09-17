# SEN371 Milestone 5, Test Reporting & Coverage Analysis (Component Testing)

**Scope:** Frontend React component testing.
**Branch:** `test/milestone5-component-testing`
**Date measured:** 17 September 2026
**Companion document:** `Milestone5-ComponentTesting.md` (strategy, components tested, TDD provenance)

Every figure in this document was produced by running the commands shown. Nothing
is estimated. Where a number could be misread, the section says what it does and
does not mean.

---

## 1. Test Reporting

### 1.1 Commands

| Purpose           | Command                                           |
| ----------------- | ------------------------------------------------- |
| Run the suite     | `npm test` (`vitest run`)                         |
| Run with coverage | `npm run test:coverage` (`vitest run --coverage`) |
| Type-check        | `npx tsc -b`                                      |
| Lint              | `npm run lint` (`oxlint`)                         |
| Production build  | `npm run build` (`tsc -b && vite build`)          |

### 1.2 Execution summary

```text
Test command:      npm test
Test files:        32
Tests discovered:  283
Tests executed:    283
Tests passed:      283
Tests failed:      0
Tests skipped:     0
Wall-clock:        ~60s
```

Supporting gates, all executed:

```text
npx tsc -b       → exit 0
npm run lint     → exit 0   (14 warnings, all pre-existing in production code)
npm run build    → exit 0
```

### 1.3 Composition of the suite

| Category                                 |  Files |   Tests | Notes                                                                    |
| ---------------------------------------- | -----: | ------: | ------------------------------------------------------------------------ |
| Component tests (this milestone's work)  |     17 |     227 | New in this phase                                                        |
| Component/context tests (pre-existing)   |      8 |      27 | From Milestones 3–4, preserved untouched                                 |
| **Component testing subtotal**           | **25** | **254** | The scope of this document                                               |
| API-layer tests (pre-existing)           |      6 |      28 | Service-layer, **not** component tests, a different Milestone 5 category |
| User-journey test (separate team member) |      1 |       1 | User Testing category, added via `origin/main`                           |
| **Total**                                | **32** | **283** |                                                                          |

### 1.4 Per-file results

All files passed. Counts are from `vitest run --reporter=verbose`.

| Test file                                                      | Tests |
| -------------------------------------------------------------- | ----: |
| `src/pages/__tests__/ProductDetailPage.test.tsx`               |    21 |
| `src/pages/__tests__/ProductListingPage.interactions.test.tsx` |    20 |
| `src/pages/__tests__/CartPage.test.tsx`                        |    19 |
| `src/pages/admin/__tests__/AdminCategoriesPage.test.tsx`       |    19 |
| `src/pages/admin/__tests__/AdminProductsPage.test.tsx`         |    19 |
| `src/pages/__tests__/RegisterPage.test.tsx`                    |    18 |
| `src/pages/__tests__/LoginPage.test.tsx`                       |    17 |
| `src/components/__tests__/LayoutNavigation.test.tsx`           |    16 |
| `src/pages/__tests__/OrderDetailPage.test.tsx`                 |    13 |
| `src/pages/admin/__tests__/AdminOrdersPage.test.tsx`           |    13 |
| `src/pages/__tests__/ProfilePage.test.tsx`                     |    12 |
| `src/pages/__tests__/OrdersPage.test.tsx`                      |    11 |
| `src/components/__tests__/StateBlocks.test.tsx`                |    10 |
| `src/pages/__tests__/CheckoutPage.states.test.tsx`             |     8 |
| `src/api/__tests__/client.test.ts`                             |     7 |
| `src/api/__tests__/cartApi.test.ts`                            |     6 |
| `src/context/__tests__/ToastContext.test.tsx`                  |     6 |
| `src/context/__tests__/AuthContext.test.tsx`                   |     5 |
| `src/api/__tests__/categoryApi.test.ts`                        |     4 |
| `src/api/__tests__/orderApi.test.ts`                           |     4 |
| `src/api/__tests__/productApi.test.ts`                         |     4 |
| `src/components/__tests__/ProtectedRoute.test.tsx`             |     4 |
| `src/context/__tests__/CartContext.test.tsx`                   |     4 |
| `src/api/__tests__/userApi.test.ts`                            |     3 |
| `src/components/__tests__/Layout.test.tsx`                     |     3 |
| `src/pages/__tests__/CheckoutPage.test.tsx`                    |     3 |
| `src/pages/__tests__/HomePage.test.tsx`                        |     3 |
| `src/pages/__tests__/ProductListingPage.test.tsx`              |     3 |
| `src/pages/admin/__tests__/AdminLayout.test.tsx`               |     3 |
| `src/pages/__tests__/NotFoundPage.test.tsx`                    |     2 |
| `src/pages/admin/__tests__/AdminDashboardPage.test.tsx`        |     2 |
| `src/__tests__/userTesting.test.tsx`                           |     1 |

### 1.5 Reliability

Determinism was verified rather than assumed. The full suite was run with
shuffled file and test order under three seeds
(`--sequence.shuffle --sequence.seed=12345 / 98765 / 4242`) and passed
completely each time. No test depends on execution order, a live backend, a
live database, or another test's result.

**Known constraint:** the suite requires Vitest's default per-file isolation.
Running with `--no-isolate` fails. This is pre-existing and was verified as
such, the original 55 tests alone fail 15 under `--no-isolate`, because the
repository's `vi.mock`-per-file convention and React Testing Library's DOM
cleanup both assume isolation. `npm test` uses the isolated default, so this
affects nothing in normal use.

---

## 2. Coverage Analysis

### 2.1 Tooling and configuration

Coverage was **not** measured during the component-testing phase itself; the
companion report states this plainly. It was measured afterwards, for this
document, using one test-only dependency:

- `@vitest/coverage-v8@^5.0.1` (matches the pinned Vitest 5 major)
- a `test:coverage` npm script
- `coverage/` ignored in `frontend/.gitignore`

No test was added, removed or altered to influence the figures.

Configuration (`vite.config.ts`):

```ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'json-summary'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/__tests__/**',   // the instrument, not the subject
    'src/test/**',           // fixtures and render helpers
    'src/main.tsx',          // composition root
    'src/vite-env.d.ts',
    'src/types/**',          // type declarations, no runtime code
  ],
}
```

Test files, fixtures and helpers are excluded deliberately. Including them
inflates the headline percentage without saying anything about how well the
application is tested.

### 2.2 Two measurements, and why both are reported

A single headline number would be misleading here, because component tests
deliberately mock the API layer. Two runs were taken:

| Run                         | What ran                                                    | Statements |   Branches |  Functions |      Lines |
| --------------------------- | ----------------------------------------------------------- | ---------: | ---------: | ---------: | ---------: |
| **A, component tests only** | 25 files / 254 tests (API-layer and journey tests excluded) |     86.74% |     77.98% |     80.32% |     87.19% |
| **B, full suite**           | 32 files / 283 tests (everything in the repository)         | **94.56%** | **88.68%** | **93.44%** | **95.67%** |

Run A's lower figure is expected and correct: component tests replace
`src/api/*` with mocks, so that code is never executed by them. Run B adds the
pre-existing API-layer tests (which exercise `src/api/*` against a stubbed
`fetch`) and the user-journey test (which exercises `src/App.tsx` routing).

**The number that actually describes this milestone's work** is the component
surface under Run A:

```text
src/components + src/context + src/pages   (component tests only)
  Statements  96.83%   (537 statements)
  Branches    92.57%   (269 branches)
  Functions   95.92%   (147 functions)
  Lines       98.16%   (490 lines)
```

### 2.3 Per-file coverage

Statement coverage, both runs. Files where the two differ are those the
component tests intentionally do not execute.

| File                                  | Run A (component) | Run B (full) |
| ------------------------------------- | ----------------: | -----------: |
| `components/AdminRoute.tsx`           |           100.00% |      100.00% |
| `components/EmptyState.tsx`           |           100.00% |      100.00% |
| `components/ErrorState.tsx`           |           100.00% |      100.00% |
| `components/LoadingState.tsx`         |           100.00% |      100.00% |
| `components/ProtectedRoute.tsx`       |           100.00% |      100.00% |
| `components/Layout.tsx`               |            95.45% |       95.45% |
| `context/ToastContext.tsx`            |           100.00% |      100.00% |
| `context/CartContext.tsx`             |            97.50% |       97.50% |
| `context/AuthContext.tsx`             |            91.89% |       91.89% |
| `pages/LoginPage.tsx`                 |           100.00% |      100.00% |
| `pages/RegisterPage.tsx`              |           100.00% |      100.00% |
| `pages/OrdersPage.tsx`                |           100.00% |      100.00% |
| `pages/NotFoundPage.tsx`              |           100.00% |      100.00% |
| `pages/OrderDetailPage.tsx`           |            96.87% |       96.87% |
| `pages/CartPage.tsx`                  |            96.55% |       96.55% |
| `pages/ProductListingPage.tsx`        |            95.55% |       95.55% |
| `pages/ProfilePage.tsx`               |            95.23% |       95.23% |
| `pages/CheckoutPage.tsx`              |            95.00% |       95.00% |
| `pages/ProductDetailPage.tsx`         |            94.44% |       94.44% |
| `pages/HomePage.tsx`                  |            83.33% |       83.33% |
| `pages/admin/AdminCategoriesPage.tsx` |           100.00% |      100.00% |
| `pages/admin/AdminDashboardPage.tsx`  |           100.00% |      100.00% |
| `pages/admin/AdminLayout.tsx`         |           100.00% |      100.00% |
| `pages/admin/AdminOrdersPage.tsx`     |           100.00% |      100.00% |
| `pages/admin/AdminProductsPage.tsx`   |            94.73% |       94.73% |
| `lib/errorMessage.ts`                 |            60.00% |       60.00% |
| `App.tsx`                             |             0.00% |      100.00% |
| `api/client.ts`                       |            24.56% |       80.70% |
| `api/productApi.ts`                   |            16.66% |       83.33% |
| `api/orderApi.ts`                     |            20.00% |       80.00% |
| `api/cartApi.ts`                      |            20.00% |      100.00% |
| `api/categoryApi.ts`                  |            25.00% |      100.00% |
| `api/userApi.ts`                      |            33.33% |      100.00% |
| `api/authApi.ts`                      |            33.33% |       33.33% |

Every component, context and page file is at or above 83%, and 14 of the 25
component-surface files are at 100% statements.

### 2.4 Gap analysis - what the uncovered lines actually are

Percentages are only useful if you know what is behind them. Each uncovered
region was inspected; none is an untested user-facing behaviour.

**A. Defensive guards unreachable through the UI**, the largest group.

| Location                                             | Line                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `ProductDetailPage.tsx:26`, `OrderDetailPage.tsx:24` | `if (!id) return;` the route always supplies `:id`                                    |
| `CartPage.tsx:19`                                    | `if (quantity < 0) return;` the input has `min={0}`                                   |
| `CheckoutPage.tsx:23`                                | `if (isPlacingOrder) return;` the button is disabled first, so re-entry never happens |
| `ProductDetailPage.tsx:54`, `OrderDetailPage.tsx:45` | `error ?? '…not found'` fallback, the error branch is always reached with a message    |
| `ProfilePage.tsx:15`                                 | `if (!user) return null;` `ProtectedRoute` guarantees a user                          |

These are correct defensive programming. Covering them would mean calling
components in states the application cannot produce, which is exactly the
implementation-detail testing the strategy avoids.

**B. Provider-misuse errors**, `AuthContext.tsx:96`, `CartContext.tsx:84`
(`useAuth`/`useCart` called outside their provider). `ToastContext` has this
case covered, which is why it sits at 100%. Cheap to close, low value.

**C. The global 401 handler**, `AuthContext.tsx:36-37`, the callback passed to
`registerUnauthorizedHandler` that clears the session when any request returns 401. Component tests mock the API modules, so the real client never runs and
never invokes it. Genuinely untested at component level; it belongs to
integration testing.

**D. A known dead branch**, `AdminProductsPage.tsx:45`
(`'Stock quantity must be zero or greater.'`). Documented in the companion
report: the form is not marked `noValidate`, so native constraint validation
blocks submission before this line can run. **Coverage confirms independently
that this code is unreachable**, a useful result rather than a gap.

**E. Handlers not exercised**, the only genuinely closable gaps:

| Location                       | Uncovered interaction                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| `Layout.tsx:97`                | clicking the scrim to dismiss the mobile menu (Escape is tested; the scrim is not)       |
| `ProductListingPage.tsx:152`   | clicking **Previous** (the disabled state is tested; a real backward page change is not) |
| `AdminProductsPage.tsx:136`    | typing in the product **Description** textarea                                           |
| `HomePage.tsx` (functions 75%) | the category `.slice(0, 6)` mapping callback with more than six categories               |

**F. `lib/errorMessage.ts` at 60%**, lines 6 and 11: the
`ApiError`/`NetworkError` branch and the non-`Error` fallback. Component tests
reject with plain `Error` objects, so only the middle branch runs. The
behaviour is covered indirectly everywhere an error message is asserted.

### 2.5 Recommendations, in priority order

1. **Close group E** (~4 small tests). Real user interactions, currently
   unexercised. Highest value per effort.
2. **Resolve group D** by adding `noValidate` to the admin form so its own
   validation messages become reachable, or by deleting the dead branches.
3. **Cover group C at integration level**, not component level, a 401 from a
   real request should clear the session and redirect.
4. **Add three cases to `errorMessage.ts`** if the 60% figure is distracting,
   though this is presentation rather than risk.
5. **Leave groups A and B alone.** Chasing them would produce tests that assert
   unreachable states and make the suite more brittle, not safer.

### 2.6 What these numbers do not prove

Stated explicitly, because coverage is routinely over-read:

- **Coverage measures execution, not correctness.** A line counts as covered if
  a test caused it to run, even if nothing meaningful was asserted about it.
  The component tests do assert observable behaviour, but the percentage itself
  is not evidence of that.
- **96.83% of the component surface is not 96.83% of the behaviour.** Branch
  coverage (92.57%) is the stricter figure, and combinations of states are not
  measured at all.
- **These are jsdom figures.** They say nothing about real browser behaviour,
  rendering, or cross-browser compatibility.
- **Accessibility assertions are not a WCAG AA claim.** Specific, observable
  behaviours are verified (accessible names, labels, roles, live regions, focus
  handling, landmarks). No contrast, zoom/reflow or screen-reader audit was done.
- **Mocked API responses are assumptions.** Coverage of a component that calls a
  mocked service proves nothing about whether the real ASP.NET Core backend
  returns that shape. That is integration testing's job.
- **No performance, load or security conclusions** follow from any figure here.

---

## 3. Reproducing These Results

```bash
cd frontend
npm ci
npm run test:coverage
```

This prints the text summary, writes `coverage/index.html` for the browsable
per-line report, and writes `coverage/coverage-summary.json` for the raw figures.
Run A is reproduced with:

```bash
npx vitest run --coverage \
  --exclude 'src/api/__tests__/**' \
  --exclude 'src/__tests__/**' \
  --exclude 'node_modules/**'
```

That should report `25 passed (25)` files and `254 passed (254)` tests. Omitting
either `--exclude` changes the figures, because the API-layer tests cover
`src/api/*` and the journey test covers `src/App.tsx`.

The `coverage/` directory is gitignored and is regenerated on each run.

---

## 4. Changes Made for This Document

| File                         | Change                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `frontend/package.json`      | added the `test:coverage` script (the `@vitest/coverage-v8` devDependency was already present) |
| `frontend/vite.config.ts`    | added the `test.coverage` block                                                                |
| `frontend/.gitignore`        | already ignored `coverage/`, no change needed                                                  |
| `frontend/package-lock.json` | updated by `npm install` when the dependency is installed                                      |

No production component, context, API-client, routing or styling file was
modified. The test suite itself is unchanged, coverage was measured against
exactly the tests reported in §1.

**Setup note:** if `npm run test:coverage` reports a missing coverage provider,
run `npm install` once to install `@vitest/coverage-v8` from `package.json`.
