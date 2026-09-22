# SEN371 Milestone 5 — User Testing Analysis

**Date:** 20 September 2026
**Scope:** the End-to-End / user-journey testing tier of Milestone 1 section 14.2.
**Related:** `M5_ComponentTesting.md`, `Milestone5-TestReporting-CoverageAnalysis.md`,
`Milestone5-ExitAudit-FinalAddendum.md`.

---

## 1. What this document is, and what it is not

This document records the **automated user-journey testing** that exists in the
repository. Every result below was produced by running the suites named, and the
test names are quoted from the source files.

It is important to be precise about the limits of that evidence:

> **No moderated or human-participant user testing is recorded in this
> repository.** There are no session notes, participant records, task-completion
> times, satisfaction scores or usability findings in the project history. This
> document therefore does **not** claim that such testing took place. It reports
> the user-journey evidence that does exist, which is automated.

What the automated evidence does establish is that the complete customer journey
and the admin journey execute end to end, through the real UI and the real API,
without manual intervention, and that they still do on every run.

---

## 2. Evidence base

Two independent suites exercise complete user journeys at two different levels.

| Level                                                      | Location                                                      | Tests | Result                     |
| ---------------------------------------------------------- | ------------------------------------------------------------- | ----: | -------------------------- |
| **UI journey** — real `<App />`, real routing, real clicks | `frontend/src/__tests__/userTesting.test.tsx`                 |     1 | ✅ passing (1.96s)         |
| **API journey** — real HTTP against the running API        | `tests/ECommerceApi.Tests/functional/ShoppingJourneyTests.cs` |    16 | ✅ passing (part of 90/90) |

The UI test is deliberately distinct from the component tests: it renders the
whole application and never navigates directly to a route. Every step happens by
clicking something a user would click.

### 2.1 The UI journey (FE-UT-01)

`"lets a new customer register, browse the catalog, add an item to their cart, and complete checkout"`

Steps performed, in one continuous session:

1. Register a new account through the real form, with real validation
2. Confirm registration signs the user in (header changes to "Sign out")
3. Navigate to the catalogue via the real "Shop" nav link
4. Click through to a product's detail page
5. Add it to the cart and confirm the nav cart badge updates
6. Navigate to the cart via the real "Cart" nav link and confirm the item is present
7. Proceed to checkout and place the order
8. Land on the order confirmation page showing the correct order

### 2.2 The API journeys (FT-01 … FT-16)

| ID    | Journey                                                            |
| ----- | ------------------------------------------------------------------ |
| FT-01 | A newly registered user can retrieve their own profile             |
| FT-02 | A product created by an admin appears in the public catalogue      |
| FT-03 | A soft-deleted product disappears from the public catalogue        |
| FT-04 | Adding an item to the cart sets the correct quantity and subtotal  |
| FT-05 | Adding the same product twice aggregates the quantity              |
| FT-06 | _(boundary)_ Requesting more units than are in stock is rejected   |
| FT-07 | _(boundary)_ Non-positive quantities are rejected — 0, −1, −999    |
| FT-08 | Setting a cart item's quantity to zero removes it from the cart    |
| FT-09 | Each user's cart is isolated from other users                      |
| FT-10 | Full journey — register, browse, add to cart, checkout, view order |
| FT-11 | _(negative)_ Checking out with an empty cart is rejected           |
| FT-12 | Prices are captured at purchase time and do not change afterwards  |
| FT-13 | _(security)_ A customer cannot view another customer's order       |
| FT-14 | An admin can advance an order from Pending to Paid                 |
| FT-15 | _(negative)_ An illegal status transition is rejected              |
| FT-16 | _(security)_ A customer cannot change an order's status            |

---

## 3. Traceability to the Milestone 1 test plan

Milestone 1 section 14.3 listed twelve planned test cases. Each now maps to a named,
executing, passing test.

| M1 ID | Planned test                                  | Covered by                                                                                                      | Status |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ |
| TC01  | Register with valid details → account created | FE-UT-01 step 1; FT-01; `Register_ThenLogin_ReturnsTokenBothTimes`                                              | ✅     |
| TC02  | Register using existing email → rejected      | `Register_DuplicateEmail_Returns409`                                                                            | ✅     |
| TC03  | Login with valid credentials → JWT returned   | `Register_ThenLogin_ReturnsTokenBothTimes`                                                                      | ✅     |
| TC04  | Login with invalid credentials → denied       | `Login_WithWrongPassword_Returns401`                                                                            | ✅     |
| TC05  | Protected endpoint without JWT → 401          | `GetCart_WithoutToken_Returns401`, `CreateProduct_WithoutToken_Returns401`, `GetOrders_WithoutToken_Returns401` | ✅     |
| TC06  | Customer accesses admin endpoint → 403        | `CreateProduct_AsAuthenticatedCustomer_Returns403`; FT-16                                                       | ✅     |
| TC07  | Retrieve products                             | FE-UT-01 step 3; FT-02; `GetProducts_WithoutAuthentication_ReturnsOk`                                           | ✅     |
| TC08  | Add product to cart                           | FE-UT-01 step 5; FT-04                                                                                          | ✅     |
| TC09  | Checkout with valid cart → order created      | FE-UT-01 step 7; FT-10                                                                                          | ✅     |
| TC10  | Checkout with empty cart → rejected           | FT-11                                                                                                           | ✅     |
| TC11  | Admin creates product                         | FT-02                                                                                                           | ✅     |
| TC12  | Admin updates order status                    | FT-14                                                                                                           | ✅     |

All twelve planned cases are covered. TC05 and TC06 are covered more than once,
at both the API and journey level.

---

## 4. Execution results

Both suites were executed on 20 September 2026. Figures are copied from the
actual command output.

**Backend** — team machine, .NET SDK 9.0.310, VSTest 17.14.1, net8.0:

```
Command:   dotnet test ECommerceApi.sln
Total:     90
Passed:    90
Failed:     0
Skipped:    0
Duration:  34 s
```

**Frontend** — `npm test` (Vitest):

```
Command:   npm test
Test files: 33
Tests:     290
Passed:    290
Failed:      0
Skipped:     0
```

**The UI journey test on its own:**

```
Command:   npx vitest run src/__tests__/userTesting.test.tsx
Tests:     1 passed (1)
Duration:  1.96 s
```

---

## 5. Defects found through user-journey testing

The journey tests were not merely confirmatory. Running them for the first time
exposed three real defects, all since fixed (see
`Milestone5-ExitAudit-FinalAddendum.md`):

| Found by                                        | Defect                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FT-02 … FT-16 (all failing at product creation) | `Product.RowVersion` used the SQL Server `[Timestamp]` pattern, which PostgreSQL never populates. Optimistic locking on stock decrements was inert in production. |
| FT-01 … FT-16 (503 on register/login)           | Auth rate limiting used a single global bucket rather than per-IP, capping the entire deployment at 20 sign-ins per 15 minutes.                                   |
| FT-10, FT-15, FT-16 (checkout 500)              | The test host could not run transactions, hiding the checkout path entirely.                                                                                      |

**These sixteen tests had never executed before this milestone's exit audit.**
They were added in the same commit batch as a duplicate class that prevented the
test project from compiling, so the defects above were invisible until that was
resolved.

---

## 6. Limitations

Stated explicitly so that no reader over-reads this document.

- **No human-participant testing is evidenced.** No moderated sessions, task
  success rates, completion times, error rates, satisfaction scores or
  qualitative findings exist in the repository. Nothing of that kind is claimed.
- **The UI journey runs in jsdom, not a browser.** It proves the application's
  logic and routing work end to end; it proves nothing about rendering, layout,
  visual correctness or cross-browser behaviour.
- **The API journeys run against an in-memory database.** Two behaviours are
  therefore _not_ covered and need a smoke test against real PostgreSQL during
  Milestone 6: checkout **atomicity** (the in-memory provider ignores
  transactions) and **product search** (`EF.Functions.ILike` is PostgreSQL-only).
  `ShoppingJourneyTests` declares both as out of scope in its own header.
- **No accessibility testing with assistive technology** was performed. The
  component suite asserts specific accessibility behaviours (accessible names,
  labels, roles, live regions, focus handling); that is not a WCAG audit.
- **Responsive behaviour was not verified at the three Milestone 1 breakpoints.**

---

## 7. Conclusion

The complete customer journey (register → browse → product detail → cart →
checkout → order confirmation → order history) and the admin journey (product
creation, catalogue visibility, order status transitions, authorisation
boundaries) both execute successfully end to end, at UI and API level, and all
twelve Milestone 1 planned test cases are covered by named passing tests.

The strongest evidence for the value of this tier is that it found three real
defects — two of which would have reached production — rather than simply
confirming what was already believed to work.

Recommended for Milestone 6: run the customer and admin journeys manually against
the deployed environment as part of production smoke testing, and record those
results, since only that can cover the browser, atomicity and search gaps listed
in section 6.
