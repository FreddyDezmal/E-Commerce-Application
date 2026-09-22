# SEN371 — Milestone 6 Deployment Runbook

**Target:** Render (API as a Docker web service, frontend as a static site) + Supabase PostgreSQL
**Prepared:** 21 September 2026 · **Status:** ready to deploy, **not yet deployed**

This runbook is the plan and the checklist. Nothing below has been run against
production yet, and no result in it should be reported as achieved until someone
actually runs the step and records the output in the M6 report.

---

## 1. What was fixed or added before deploying

| Change                                                                                                               | Why                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/Migrations/20260920210826_UseXminConcurrencyToken.cs`: removed the `AddColumn("xmin")` and `DropColumn("xmin")` | `xmin` is a PostgreSQL system column. The scaffolded migration failed with `column name "xmin" conflicts with a system column name`, so `dotnet ef database update` would have failed on the first deploy. The M5 suite could not catch this because EF InMemory never runs migrations. | Reproduced on PostgreSQL 16.13. The corrected `Up()` applies cleanly. In a two-writer test, the second writer's stale `xmin` matched 0 rows, so optimistic concurrency works.                                                     |
| `frontend/vite.config.ts`: build guard                                                                               | A production build without `VITE_API_BASE_URL` used to exit 0 and produce a site that cannot reach the API. It now fails with a clear error.                                                                                                                                            | Linux `npm ci` from the committed lockfile: without the variable the build exits 1; with it the build exits 0 and the URL is inlined into the bundle (0 occurrences of `localhost:3001`). 290/290 tests, tsc and lint still pass. |
| `src/Dockerfile`, `src/.dockerignore`                                                                                | Container for Render. Runs as a non-root user, uses Production mode and honours `$PORT`. The `.dockerignore` keeps local secret files (`launchSettings.json`, `appsettings.Development.json`) out of the image.                                                                         | **Not verified:** container images could not be pulled in the available environment. The first Render build is the verification.                                                                                                  |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED=true` (in the Dockerfile)                                                       | Behind Render's proxy, every request appears to come from the proxy's IP. The per-IP auth rate limiter fixed in M5 would quietly become one global bucket again.                                                                                                                        | Configuration only. Verified in smoke test S9.                                                                                                                                                                                    |
| `render.yaml`                                                                                                        | Blueprint for both services. Secrets use `sync: false`, so they are entered in the dashboard and never enter the repo.                                                                                                                                                                  | YAML parses.                                                                                                                                                                                                                      |
| `.github/workflows/ci.yml`                                                                                           | M1 section 15.2 CI requirement. Backend build and test, a **migrations job on real PostgreSQL 16** (which would have caught the xmin bug), and frontend lint, test and build.                                                                                                           | YAML parses. **Not verified:** it runs on the first push to GitHub.                                                                                                                                                               |
| `Documentation/M6/promote-first-admin.sql`                                                                           | There is no application path to an admin account. This promotes an account that registered normally, so no password or hash is ever handled by hand.                                                                                                                                    | Run on PostgreSQL 16 against the real `users` column shapes (string `Role`, case-insensitive email match).                                                                                                                        |

---

## 2. Deployment order

Do these in order. Each step says what "done" looks like.

### Step 1 — Commit and push, then check CI

Commit the changes (suggested message in section 7) and push to `main`.
**Done when:** all three CI jobs are green on GitHub. If the `migrations` job fails, **stop**: production would fail the same way.

### Step 2 — Decide which database production uses

`src/Properties/launchSettings.json` (gitignored) points local development at the
Supabase pooler. So today, **development and production would share one
database**: test data, test orders and test admins all end up in production.

- **Recommended:** create a second Supabase project for production.
- **Acceptable for a student deployment:** reuse the existing one, and record that decision in the M6 report.

### Step 3 — Apply migrations to the production database (Windows PowerShell, project root)

```powershell
$env:ConnectionStrings__DefaultConnection = "<production SESSION POOLER string, see section 3>"
dotnet ef migrations list --project src      # shows which are applied / pending
dotnet ef database update --project src
Remove-Item Env:ConnectionStrings__DefaultConnection
```

**Done when:** `migrations list` shows all three migrations applied, with no errors.

### Step 4 — Create the Render services

Render → **New → Blueprint** → select the repo. Render reads `render.yaml` and creates both services.
When prompted, enter:

- `ConnectionStrings__DefaultConnection`: the production session-pooler string
- `Cors__AllowedOrigins__0`: leave as a placeholder for now; set it in Step 6
- `VITE_API_BASE_URL`: leave as a placeholder for now; set it in Step 5

### Step 5 — Wire the frontend to the API

Once the API service has a URL (for example `https://sen371-ecommerce-api.onrender.com`):
set `VITE_API_BASE_URL` on the static site to that URL, with **no trailing slash**, then **redeploy the static site**.
Vite inlines the value at build time, so changing the variable does nothing until the site is rebuilt.

### Step 6 — Wire CORS back to the frontend

Set `Cors__AllowedOrigins__0` on the API to the static site's exact origin (scheme and host, no trailing slash), then redeploy the API.

### Step 7 — Provision the first admin

1. Register an account through the **deployed** site.
2. Run `Documentation/M6/promote-first-admin.sql` in the Supabase SQL editor, with that email filled in.
3. Sign out, then sign back in. The role comes from the JWT.

### Step 8 — Run the smoke tests in section 4 and record the actual results.

---

## 3. Configuration reference

| Setting                                               | Where                        | Value / notes                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConnectionStrings__DefaultConnection`                | API (secret)                 | Use the Supabase **session pooler** (port 5432, username `postgres.<project-ref>`). Render is IPv4-only, and Supabase's direct `db.<ref>.supabase.co` host is IPv6-only. Add `SSL Mode=Require;Maximum Pool Size=10`. The free-tier pooler has a small connection cap, and Npgsql's default pool of 100 can exhaust it. Avoid the transaction pooler (6543) unless you also disable prepared statements. |
| `Jwt__Key`                                            | API (secret)                 | Generated by Render (`generateValue`). **Rotating it signs everyone out.**                                                                                                                                                                                                                                                                                                                               |
| `Jwt__Issuer` / `Jwt__Audience`                       | API                          | `ECommerceApi` / `ECommerceApiClient` (they must match `appsettings.json`)                                                                                                                                                                                                                                                                                                                               |
| `Cors__AllowedOrigins__0`                             | API                          | The static site's origin                                                                                                                                                                                                                                                                                                                                                                                 |
| `ASPNETCORE_ENVIRONMENT`                              | Dockerfile                   | `Production`: Swagger off, HTTPS redirection on                                                                                                                                                                                                                                                                                                                                                          |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED`                 | Dockerfile                   | `true`. Required for the per-IP rate limiting to work behind Render.                                                                                                                                                                                                                                                                                                                                     |
| `RateLimiting__AuthPermitLimit` / `AuthWindowMinutes` | API (optional)               | Defaults are 20 / 15                                                                                                                                                                                                                                                                                                                                                                                     |
| `VITE_API_BASE_URL`                                   | Static site (**build time**) | The API origin, no trailing slash                                                                                                                                                                                                                                                                                                                                                                        |
| `NODE_VERSION`                                        | Static site                  | `22` (Vite 8 needs a recent Node)                                                                                                                                                                                                                                                                                                                                                                        |

Render free tier: services sleep after about 15 minutes idle, and the first request afterwards can take about a minute. Wake the API (`/health`) before timing smoke tests.

---

## 4. Production smoke tests

Run these against the **deployed** URLs, never mocks. Record the actual outcome, date and who ran each one in the M6 report.

| #   | Check                                                        | How                                                                                       | Pass condition                                                                                                                                                                                            |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | API health + DB                                              | `GET <api>/health`                                                                        | `200 Healthy`                                                                                                                                                                                             |
| S2  | Swagger disabled                                             | `GET <api>/swagger`                                                                       | `404`                                                                                                                                                                                                     |
| S3  | SPA deep link                                                | Open `<web>/products` directly in a new tab and refresh                                   | The page renders, not a Render 404                                                                                                                                                                        |
| S4  | Frontend reaches the API                                     | Home page lists products; DevTools Network shows requests going to `<api>`, not localhost | No CORS errors in the console                                                                                                                                                                             |
| S5  | Register + login                                             | Create a customer account, sign out, sign in                                              | Works; wrong password shows an error                                                                                                                                                                      |
| S6  | **ILike search** (never tested automatically)                | Search for a product name in mixed or wrong case                                          | The product is found, case-insensitively                                                                                                                                                                  |
| S7  | **Checkout on real PostgreSQL** (never tested automatically) | Add 2 products and check out                                                              | Order created, cart emptied, both stock counts reduced by the exact quantities. Then set a cart quantity above stock and check out: it is rejected, **no order is created and no stock changes**          |
| S8  | **Order-status contract**                                    | As admin, move an order Pending → Paid → Shipped                                          | The admin dropdown shows the real status after every reload (the M5 casing bug)                                                                                                                           |
| S9  | **Per-IP rate limit**                                        | Send 21 failed logins quickly from one machine                                            | The 21st returns **429** (not 503). A different network (for example a phone on mobile data) can still sign in                                                                                            |
| S10 | Authorization                                                | As a customer, open `<web>/admin`; call `POST <api>/api/products` with a customer token   | Redirected away; `403`                                                                                                                                                                                    |
| S11 | Admin journey                                                | Create a category and a product, soft-delete the product                                  | It appears in the shop, then disappears from it. Record what existing orders containing it show: order items do not snapshot the product name, so "Unknown product" is a known M5 issue, not a new defect |
| S12 | HTTPS                                                        | Open `http://<web>`                                                                       | Redirects to https                                                                                                                                                                                        |
| S13 | Responsive / browsers                                        | Chrome + one other browser; DevTools at 375 px, 768 px, 1280 px                           | No horizontal scroll, nav usable, checkout reachable                                                                                                                                                      |

**xmin under real concurrency:** checked at the database level on PostgreSQL 16 (see section 1). To see it end to end, open the same product's edit form in two admin tabs and save both. The second save should fail with a conflict, not silently overwrite the first.

---

## 5. Rollback plan

| Failure                   | Action                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bad API deploy            | Render → API service → **Events** → pick the last good deploy → **Rollback**. The schema is unaffected.                                                                                                                                                                                                                                                |
| Bad frontend deploy       | Same, on the static site.                                                                                                                                                                                                                                                                                                                              |
| Wrong `VITE_API_BASE_URL` | Fix the variable and redeploy. The build guard stops an _empty_ value, not a _wrong_ one.                                                                                                                                                                                                                                                              |
| Migration problem         | EF runs each migration in a transaction, so a failed migration leaves the schema as it was. To undo `UseXminConcurrencyToken` deliberately: `dotnet ef database update AddProductRowVersion --project src` (its `Down()` only re-adds `RowVersion`). **Before any production schema change, take a Supabase backup** (Dashboard → Database → Backups). |
| Leaked secret             | Rotate it in Supabase or Render, update the Render env var, redeploy. Rotating `Jwt__Key` invalidates all sessions.                                                                                                                                                                                                                                    |

---

## 6. Verification status (at the time of writing)

| Area                                     | Status                                                | Basis                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| xmin migration                           | 🟢 Fixed, verified at SQL level                       | PostgreSQL 16.13                                                                                                  |
| Frontend production build + env inlining | 🟢 Verified                                           | Linux `npm ci` + build from the committed lockfile                                                                |
| Frontend tests / tsc / lint              | 🟢 290/290, exit 0, exit 0 (14 warnings)              | Run after the vite.config change                                                                                  |
| Backend tests                            | 🟡 90/90 from M5; not re-run after the migration edit | The edit only touches migration code, which InMemory tests never execute. Re-run `dotnet test` before committing. |
| First-admin SQL                          | 🟢 Verified on PostgreSQL 16                          | Matching column shapes                                                                                            |
| Docker image build                       | 🔴 Not verified in the available environment          | Container registry not reachable. The first Render build verifies it.                                             |
| CI workflow                              | 🔴 Not yet run                                        | Runs on the first push                                                                                            |
| Migrations on Supabase                   | 🔴 Not yet run                                        | Step 3                                                                                                            |
| Every item in section 4                  | 🔴 Not yet run                                        | Nothing is deployed                                                                                               |

---

## 7. Suggested commit

```
feat(m6): deployment configuration for Render + Supabase

- fix(migrations): stop UseXminConcurrencyToken adding an "xmin" column;
  it is a PostgreSQL system column and the migration failed on a real DB
- build: fail production builds when VITE_API_BASE_URL is unset
- deploy: Dockerfile (non-root, Production, forwarded headers), .dockerignore,
  render.yaml blueprint
- ci: GitHub Actions for backend tests, migrations on PostgreSQL 16, and
  frontend lint/test/build
- docs: M6 runbook and first-admin provisioning script
```
