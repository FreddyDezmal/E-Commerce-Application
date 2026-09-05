# SEN371 — Milestone 1 v1.1 Architectural Amendment
### Backend Migration: Node.js/Express/Prisma → C# / ASP.NET Core / EF Core

**Status:** Amendment to the approved Milestone 1 System Plan
**Scope of change:** Backend implementation technology only
**Unaffected:** Requirements, functional requirements, non-functional requirements, database domain model, UI/UX plan, Agile methodology, TDD philosophy, Git workflow, security requirements, project scope

---

## Deliverable 1 — Architectural Amendment

### 1.1 The Original Decision (Node.js + Express + Prisma)

Milestone 1 originally selected Node.js + Express + Prisma (ADR-002, ADR-003) on the reasoning that a single-language (JavaScript/TypeScript) stack across frontend and backend reduces context-switching for a student team, and that Express's minimalism keeps the MVC/Service/Repository structure explicit rather than framework-hidden. This reasoning was sound at the time it was made and is **not being retracted as wrong**

### 1.2 The Revised Decision (C# + ASP.NET Core + EF Core)

The backend implementation technology is now **C# + ASP.NET Core Web API + Entity Framework Core**, replacing Node.js + Express + Prisma. React + TypeScript (frontend) and PostgreSQL (database) are unchanged.

### 1.3 Why ASP.NET Core Is Valid Under the Assignment Requirements

The original SEN371 brief explicitly listed **ASP.NET** as one of the permitted backend frameworks alongside Node.js/Express, it was named in the brief as an acceptable "or another suitable backend framework" option from the outset. Selecting it now is not a deviation from the assignment; it is exercising an option the brief always allowed. Every other assignment requirement; MVC architecture, RESTful APIs, database persistence, authentication and security, TDD, Agile, Git/GitHub collaboration, CI/CD, responsive UI; is stack-agnostic and is satisfied identically under ASP.NET Core.

### 1.4 Why PostgreSQL Remains Unchanged

PostgreSQL was selected in Milestone 1 §10/ADR-003 for its relational integrity guarantees (foreign keys, CHECK constraints, transactions for atomic checkout) — none of that reasoning is backend-language-specific. Entity Framework Core has first-class PostgreSQL support via the `Npgsql.EntityFrameworkCore.PostgreSQL` provider, so the database engine, schema, and integrity guarantees carry over unchanged; only the ORM issuing the queries changes (Prisma → EF Core).

### 1.5 Why React + TypeScript Remains Unchanged

The frontend was never coupled to the backend's implementation language — communication happens over REST/JSON, which is backend-language-agnostic by construction. React + TypeScript's justification in Milestone 1 is entirely unaffected by what language the API is written in.

### 1.6 Why the Architectural Pattern Remains Valid

Milestone 1's core architectural decision (ADR-005) was **MVC extended with an explicit Service and Repository layer**, justified by the need for business logic to be unit-testable independent of HTTP and the database (a TDD requirement, not a Node-specific one). ASP.NET Core does not just permit this pattern, it is the *conventional*, idiomatic way to structure a non-trivial ASP.NET Core Web API. Controllers, Services (as injectable classes), and Repositories (as injectable classes wrapping `DbContext`) map directly onto ASP.NET Core's built-in dependency injection container, arguably with **less structural friction** than achieving the same separation in Express, which has no built-in DI and requires the team to assemble that discipline manually

### 1.7 Why the Technology Change Does Not Alter System Requirements

Every functional requirement (T-01 through T-22), every non-functional requirement, and every database entity/relationship/constraint in Milestone 1 §3, §4, and §10 is defined in terms of *behavior* and none of them reference Node.js, Express, or Prisma by name as a requirement in itself. The technology stack was always an *implementation decision* made to satisfy those requirements, not a requirement itself. Swapping the backend implementation technology therefore does not require re-deriving or re-justifying a single functional or non-functional requirement

### 1.8 Consequences for Testing, Deployment, Authentication, Validation, and Tooling

| Concern | Node.js version (superseded) | ASP.NET Core version (current) |
|---|---|---|
| Unit testing | Jest | xUnit |
| Integration testing | Supertest + Express app | ASP.NET Core `WebApplicationFactory` integration testing |
| Mocking | `jest.fn()` manual mocks | Moq (or NSubstitute) for repository/service mocking |
| Authentication | `jsonwebtoken` + hand-rolled middleware | ASP.NET Core JWT Bearer authentication middleware (built-in) |
| Authorization | Hand-rolled `requireRole` middleware | `[Authorize(Roles = "Admin")]` attributes + policy-based authorization (built-in) |
| Password hashing | `bcryptjs` | BCrypt.Net (or ASP.NET Core Identity's hasher) |
| Validation | Zod schemas + custom middleware | Data Annotations / FluentValidation on DTOs + ASP.NET Core model binding validation |
| ORM | Prisma (schema.prisma + migrations) | Entity Framework Core (Fluent API/DbContext + migrations) |
| API docs | Not specified in original plan | Swagger/OpenAPI (built-in via `Swashbuckle.AspNetCore`) — a net addition, not a regression |
| Deployment target | Node process (Render/Railway) | ASP.NET Core host (see Deliverable 3, Part 13) |
| CI/CD | GitHub Actions running `npm test` | GitHub Actions running `dotnet test` |

None of these are functional regressions — each ASP.NET Core equivalent satisfies the same Milestone 1 requirement (TDD, JWT auth, role-based authorization, input validation, ORM-based persistence) using the idiomatic mechanism for the new language, several of them (Swagger, built-in DI, built-in auth middleware) with less custom scaffolding than the Node.js equivalent required.

---

## Deliverable 2 — Updated Architecture

### 2.1 Architecture Diagram

```
                    User (Browser)
                          │
                          ▼
                ┌───────────────────┐
                │   React Frontend   │   (View — TypeScript, Vite)
                └─────────┬─────────┘
                          │  HTTPS / REST (JSON)
                          ▼
                ┌───────────────────┐
                │ ASP.NET Core Web   │
                │        API         │
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │     Middleware      │  (JWT auth, exception handling,
                │                     │   CORS, logging, rate limiting)
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │    Controllers      │  (model binding → call Service →
                │                     │   return HTTP response)
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │      Services        │  (business rules, cart/order
                │                     │   logic, authorization policy)
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │   Repositories       │  (EF Core queries, persistence)
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │ Entity Framework    │  (AppDbContext, migrations,
                │       Core          │   change tracking, relationships)
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │    PostgreSQL       │
                └───────────────────┘
```

This is a direct re-expression of the Milestone 1 §7 diagram with Express/Prisma replaced by ASP.NET Core/EF Core — the layer count, layer order, and layer purpose are unchanged.

### 2.2 Layer Responsibilities

**Presentation/API Layer (ASP.NET Core Controllers).** Receive HTTP requests, perform model binding (mapping the incoming JSON body to a strongly-typed DTO), coordinate request validation (via Data Annotations/FluentValidation on the bound DTO), call the appropriate Service method, and translate the Service's result (or a thrown/caught exception) into an HTTP response with the correct status code. Controllers must not contain business logic, must not query `AppDbContext` directly, and must not calculate business rules — identical constraints to the original Milestone 2 prompt's Controller rules, now enforced by ASP.NET Core's convention that controllers are thin coordinators by design.

**Middleware.** Cross-cutting concerns that must run before a request reaches a controller: JWT Bearer authentication (validates the token, populates `HttpContext.User`), a global exception-handling middleware (catches unhandled exceptions and converts them into a consistent `ProblemDetails` response — see Part 8), CORS policy enforcement, request logging, and rate limiting where appropriate. This is architecturally the same Chain-of-Responsibility pattern used in the original Express implementation's middleware stack, now expressed as ASP.NET Core's native middleware pipeline (`app.Use...` calls in `Program.cs`).

**Service Layer.** Contains all business rules: cart quantity/stock validation, order total calculation, checkout orchestration (including the atomic transaction), the order status state machine, product rules (soft-deletion, price/stock invariants), and authorization decisions that depend on *which resource* is being accessed (ownership checks — e.g., "is this order the requesting customer's own order?"), not just *which role* the requester has. Services depend on repository **interfaces**, not concrete EF Core-backed classes, and have no dependency on `HttpContext` — this is what keeps them unit-testable in isolation with xUnit + Moq, exactly mirroring the Node.js implementation's `IUserRepository`/`ICartRepository`-style interfaces.

**Repository Layer.** The only layer permitted to query `AppDbContext` directly. Encapsulates EF Core LINQ queries, returns plain domain/DTO-shaped data (not raw EF Core entity objects, to avoid leaking change-tracking behavior or lazy-loading surprises into the Service layer), and contains no business rules. Mirrors the Node.js `UserRepository`/`ProductRepository`/etc. one-for-one.

**Entity Framework Core.** Owns the object-relational mapping: entity class definitions, the `AppDbContext` (the direct analogue of the Prisma-generated client), relationship configuration (via Fluent API in `OnModelCreating`), migrations (the analogue of Prisma's `migrations/` folder), and query translation to PostgreSQL SQL. EF Core additionally owns transaction management for the atomic checkout operation (`DbContext.Database.BeginTransactionAsync()` or `SaveChangesAsync` with a single unit-of-work, analogous to Prisma's `$transaction`).

**PostgreSQL.** Unchanged — remains the system of record, enforcing the same foreign keys, CHECK constraints, and referential integrity rules established in Milestone 1 §10.

### 2.3 Updated Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React | UI |
| Frontend Language | TypeScript | Type-safe frontend development |
| Build Tool | Vite | Frontend development/build |
| Backend Language | C# | Backend implementation |
| Backend Framework | ASP.NET Core Web API | REST API |
| Architecture | MVC + Service + Repository | Separation of concerns |
| ORM | Entity Framework Core | Database access |
| Database | PostgreSQL | Persistent relational storage |
| Authentication | JWT Bearer | Stateless authentication |
| Password Hashing | BCrypt.Net | Secure password storage |
| API Documentation | Swagger/OpenAPI | API documentation/testing |
| Backend Testing | xUnit | Unit testing |
| Integration Testing | ASP.NET Core Test Framework (`WebApplicationFactory`) | API/integration testing |
| Frontend Testing | React Testing Library | Component testing |
| E2E Testing | Playwright or Cypress | End-to-end testing |
| CI/CD | GitHub Actions | Automated validation/deployment |
| Frontend Hosting | Vercel or Netlify | Frontend deployment |
| Backend Hosting | ASP.NET Core-compatible host (Deliverable 3, Part 13) | Backend deployment |
| Database Hosting | Managed PostgreSQL | Production database |

### 2.4 Updated Authentication Architecture

**Registration flow:** DTO-bound request (`RegisterRequestDto`) → Data Annotation/FluentValidation validation → `AuthService.RegisterAsync` checks email uniqueness via `IUserRepository` → password hashed with BCrypt.Net → user persisted → JWT issued → safe response DTO (`AuthResponseDto`, containing user info + token, **never** the password hash) returned with `201 Created`.

**Login flow:** DTO-bound request → validation → `AuthService.LoginAsync` looks up by email → BCrypt compare → on success, JWT issued; on failure (unknown email **or** wrong password), an identical `401 Unauthorized` is returned in both cases, preserving the original Milestone 1 §13 no-enumeration requirement.

**JWT payload** (unchanged in shape from Milestone 1 §12/Milestone 2 §14):
```json
{ "sub": "<user-id>", "role": "customer", "iat": ..., "exp": ... }
```
No password hash, no email, no unnecessary PII — same minimal-payload principle, now issued via `System.IdentityModel.Tokens.Jwt`'s `JwtSecurityTokenHandler` instead of the `jsonwebtoken` npm package. Access-token lifetime remains ~60 minutes, configured via `appsettings.json`/environment variables, never hard-coded.

**How authentication flows through ASP.NET Core middleware before reaching controllers:**
```
Incoming request
   │
   ▼
UseHttpsRedirection
   │
   ▼
UseCors (CORS policy check)
   │
   ▼
UseAuthentication   ← JWT Bearer middleware:
   │                    reads Authorization: Bearer <token>,
   │                    validates signature/expiry,
   │                    populates HttpContext.User with claims (sub, role)
   ▼
UseAuthorization    ← evaluates [Authorize] / [Authorize(Roles="Admin")]
   │                    attributes on the target controller/action
   ▼
Controller action executes (only if authentication + authorization passed)
```
`[Authorize]` on a controller/action requires *any* authenticated user (equivalent to the Node.js `authenticate` middleware). `[Authorize(Roles = "Admin")]` additionally requires the `role` claim to equal `"admin"` (equivalent to `requireRole('admin')`). Resource-ownership checks (e.g., "this order belongs to the requesting user") are **not** expressible as a role attribute and remain in the Service layer, exactly as in the Node.js implementation — this is a deliberate architectural constant, not an oversight: ownership is a runtime, data-dependent decision that authorization *attributes* structurally cannot express, only authorization *policy code* can.