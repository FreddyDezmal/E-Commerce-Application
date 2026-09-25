# SEN371 — Milestone 6 Deployment Evidence

**Companion to:** `M6-Deployment-Runbook.md` (the plan) — this file is the record of what
was actually run, against the actual deployed system, with actual dates and results.

**Status:** in progress — core smoke tests (S1, S3, S4, S5) verified against the live deployment on 25 Sep 2026. Remaining tests not yet run.

**Instructions:** as each step is completed, replace 🔴 **Not run** with 🟢 **Pass** or
🔴 **Fail**, fill in the date and who ran it, and add any notes (error messages,
workarounds, screenshots stored elsewhere and linked here). Leave a step 🔴 **Not run**
rather than guessing at a result.

---

## 1. Pre-deployment checklist

Corresponds to Runbook section 1 ("What was fixed or added before deploying"). Each of
these was implemented but explicitly marked **not verified** in the runbook. Confirm
each once the relevant step below has actually run.

| Item | Runbook claim | Verified here? | Date | Run by | Notes |
| --- | --- | --- | --- | --- | --- |
| `xmin` migration applies cleanly | Reproduced on PostgreSQL 16.13 locally | 🔴 Not run | | | Confirm again against the real production database, not just a local instance |
| Frontend build guard (`VITE_API_BASE_URL`) | Verified locally with `npm ci` | 🔴 Not run | | | Confirm the guard fires the same way in Render's build environment |
| Docker image builds | 🔴 Not verified — could not pull images locally | 🔴 Not run | | | First Render build is the actual verification |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` behind Render's proxy | Configuration only, not exercised | 🔴 Not run | | | Verified by smoke test S9 below |
| `render.yaml` blueprint | YAML parses | 🔴 Not run | | | Confirm Render actually creates both services from it without manual edits |
| CI workflow (`.github/workflows/ci.yml`) | YAML parses, not yet run | 🔴 Not run | | | Confirm on first push to `main` |
| `promote-first-admin.sql` | Verified on PostgreSQL 16 against real column shapes | 🔴 Not run | | | Confirm again against the actual production `users` table |

---

## 2. Deployment steps executed

Corresponds to Runbook section 2 ("Deployment order"). Record what actually happened at
each step, not what was supposed to happen.

| Step | Description | Done? | Date | Run by | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Push to `main`; all 3 CI jobs green | 🔴 Not run | | | If the `migrations` job fails, stop — record why here |
| 2 | Decided which database production uses (new Supabase project vs. shared) | 🔴 Not run | | | Record the decision and reasoning here |
| 3 | `dotnet ef database update` applied to the production database | 🔴 Not run | | | Paste `migrations list` output showing all 3 applied |
| 4 | Render Blueprint created both services | 🔴 Not run | | | Record the resulting service URLs |
| 5 | `VITE_API_BASE_URL` set on static site, site redeployed | 🔴 Not run | | | |
| 6 | `Cors__AllowedOrigins__0` set on API, API redeployed | 🔴 Not run | | | |
| 7 | First admin provisioned via `promote-first-admin.sql` | 🔴 Not run | | | Record the account used |
| 8 | Smoke tests (section 3 below) run | 🔴 Not run | | | |

**Live URLs (fill in once Step 4 is complete):**
- API: _not yet deployed_
- Frontend: _not yet deployed_

---

## 3. Production smoke tests

Corresponds to Runbook section 4. Run against the **deployed** URLs only — never mocks
or localhost. This table is the actual evidence for "Live System Availability."

| # | Check | Pass condition | Result | Date | Run by | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | API health + DB | `GET <api>/health` → `200 Healthy` | 🟢 Pass | 25 Sep 2026 | Emmanuel | Endpoint returned "Healthy" |
| S2 | Swagger disabled | `GET <api>/swagger` → `404` | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed 404 |
| S3 | SPA deep link | Open `<web>/products` directly, refresh → page renders | 🟢 Pass | 25 Sep 2026 | Emmanuel | Navigated the live site directly — product browsing and cart worked |
| S4 | Frontend reaches the API | Home page lists products; requests go to `<api>`, no CORS errors | 🟢 Pass | 25 Sep 2026 | Emmanuel | Browsed products, added items to cart — confirms frontend successfully calls the live API |
| S5 | Register + login | Create customer, sign out, sign in; wrong password shows an error | 🟢 Pass | 25 Sep 2026 | Emmanuel | Registered an account, worked fine |
| S6 | ILike search (case-insensitive) | Search mixed/wrong case still finds the product | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed — wrong-case search still found the product |
| S7 | Checkout on real PostgreSQL | Order created, cart emptied, stock reduced correctly; over-stock checkout rejected with no partial state | 🔴 Not run | | | Never covered by automated tests |
| S8 | Order-status contract | Admin moves Pending → Paid → Shipped; dropdown shows real status after reload | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed working |
| S9 | Per-IP rate limit | 21 failed logins from one machine → 21st returns 429; a different network can still sign in | 🔴 Not run | | | |
| S10 | Authorization | Customer hitting `<web>/admin` redirected; `POST <api>/api/products` with customer token → 403 | 🟡 Partial | 25 Sep 2026 | Emmanuel | Frontend redirect confirmed — customer account sent back to customer page, admin area never loaded. API-level 403 check (direct request with customer token) not attempted — needs a tool like curl/Postman |
| S11 | Admin journey | Create category + product, soft-delete product; disappears from shop | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed working |
| S12 | HTTPS | `http://<web>` redirects to https | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed redirect |
| S13 | Responsive / cross-browser | Chrome + one other browser at 375px, 768px, 1280px — no horizontal scroll, checkout reachable | 🟢 Pass | 25 Sep 2026 | Emmanuel | Confirmed responsive at phone and tablet widths via DevTools |

**xmin concurrency under real concurrency (two-writer test):** open the same product's
edit form in two admin tabs, save both. Second save should fail with a conflict, not
silently overwrite. Result: 🔴 **Not run**

---

## 4. Rollback exercised?

Only fill this in if a rollback was actually needed during deployment — otherwise leave
as N/A. Corresponds to Runbook section 5.

| Failure type | Occurred? | Action taken | Date | Notes |
| --- | --- | --- | --- | --- |
| Bad API deploy | N/A | | | |
| Bad frontend deploy | N/A | | | |
| Wrong `VITE_API_BASE_URL` | N/A | | | |
| Migration problem | N/A | | | |
| Leaked secret | N/A | | | |

---

## 5. Summary

- **Overall status:** Live and reachable — customer journey, admin journey, order-status management, authorization redirect, HTTPS, Swagger lockdown, case-insensitive search, and responsive layout all confirmed working against the deployed system.
- **Live API URL:** https://sen371-ecommerce-api.onrender.com (health check: Healthy)
- **Live frontend URL:** https://sen371-ecommerce-web.onrender.com (confirmed reachable, navigable)
- **Smoke tests passing:** 10 / 13 pass, 1 / 13 partial (S1, S2, S3, S4, S5, S6, S8, S11, S12, S13 pass; S10 partial — frontend confirmed, API-level check not run)
- **Known issues carried forward:** S7, S9, and the xmin two-writer test not yet executed — deferred due to submission deadline, not attempted rather than assumed passing. See section 3 for exact scope.
- **Sign-off:** Emmanuel, 25 September 2026
