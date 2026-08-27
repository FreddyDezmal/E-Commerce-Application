# Milestone 1: System Plan
### E-Commerce Web Application

## 1. Executive Summary
 
This document is the System Plan for a full-stack e-commerce web application built for our SEN371. It produces the blueprint for the architecture, technology stack, database design, API contract, security model, UI/UX strategy, testing strategy, version control workflow, and deployment plan that will govern Milestones 2 till 6.
 
The recommended stack is **React (frontend) + Node.js/Express (backend) + PostgreSQL (database)**, structured around **MVC with a Service and Repository layer**, secured with **JWT-based authentication**, developed using **Agile/Scrum with Test-Driven Development**, and deployed via **GitHub Actions CI/CD** to **Vercel/Netlify (frontend)** and **Render/Railway (backend + managed Postgres)**.
 
No implementation begins in this milestone. Every decision below is justified, scoped to what our 4 people student team is able to realistically deliver across 3 weeks, and traceable from Requirement to Architecture to API then Database then UI to Test and finally Deployment.

## 2. System Overview

**What the system does:** A web-based storefront where customers browse a product catalog, manage a shopping cart, and place orders, while administrators manage products, categories, and order fulfillment.
 
**Users:**
- **Customer (guest/registered):** browses and purchases products.
- **Administrator:** manages catalog and order lifecycle.
- **Business problem solved:** Provides a minimal but complete online retail workflow; discovery, cart, checkout, order tracking. Showing a real e-commerce transaction lifecycle rather than a generic CRUD demo.
 
**Major capabilities:** authentication & authorization, product catalog with search/filter, cart management, order placement and history, and an admin back-office for catalog/order management.
 
**System boundary:** The system owns product, user, cart, and order data. It does **not** integrate a real payment gateway. Checkout produces an order record with a simulated payment status. It does not include shipping-carrier integration, email delivery infrastructure beyond a stub, or multi-tenant/marketplace features.
 
**High-level technical architecture:** A single-page React frontend consumes a REST API exposed by an Express backend structured in MVC (Controllers, Services, Repositories then Models), backed by PostgreSQL, with JWT-based stateless authentication and role-based authorization for admin routes.

## 3. Requirements Analysis
 
### 3.1 Explicit Requirements
Agile process, TDD, MVC architecture, full-stack app, REST API, database persistence, authentication/security, responsive UI, automated testing, Git/GitHub collaboration, CI/CD principles, production-oriented deployment.
 
### 3.2 Implicit Requirements
- Passwords must never be stored in plaintext
- The system must distinguish authenticated vs. unauthenticated access
- Data must remain consistent across cart till order transitions
- The API must be independently testable from the UI
### 3.3 Ambiguities Identified
| # | Ambiguity | Resolution Approach |
|---|---|---|
| A1 | Brief permits SQL Server, PostgreSQL, or MongoDB. No single mandate | Select one via ADR, justified by relational integrity needs of orders/cart |
| A2 | Backend permits Node/Express or ASP.NET | Select Node/Express for stack cohesion |
| A3 | "GitHub Pages for frontend where appropriate;" React SPAs with client-side routing have known GH Pages limitations | Will be addressed explicitly in Deployment |
| A4 | Payment processing not specified | Assumed simulated/mock payment |
| A5 | Real-time features not mentioned | Assumed out of scope since there's no requirement basis |
 
### 3.4 Assumptions
1. **No real payment gateway** – checkout is simulated (status: `pending` to `paid`) to avoid PCI scope.
2. **Single currency, single locale** — no i18n/multi-currency requirement needed.
3. **Two roles only** — `customer` and `admin`
4. **Guest browsing allowed**, but cart persistence and checkout require authentication
5. **Soft-delete for products** — admins "deactivate" rather than hard-delete, to preserve referential integrity with historical orders.
6. **Email is out of scope for real delivery** — password reset / order confirmation emails are stubbed/logged, not sent via a live SMTP provider, unless we say otherwise?.
### 3.5 Functional Requirements
 
MoSCoW: **M**ust, **S**hould, **C**ould, **W**on't
 
| ID | Description | Actor | Priority | Acceptance Criteria |
|---|---|---|---|---|
| T-01 | Register a new account | Customer | Must | Given valid email/password, account is created, password hashed, duplicate email rejected with 409 |
| T-02 | Login | Customer/Admin | Must | Valid credentials return JWT; invalid returns 401 |
| T-03 | Logout (client-side token discard) | Customer/Admin | Must | Token removed client-side; protected routes reject old token after expiry |
| T-04 | Browse products | Customer | Must | GET /products returns paginated, active products only |
| T-05 | Search products by name | Customer | Must | Query param filters results case-insensitively |
| T-06 | Filter products by category/price | Customer | Should | Filters combine with AND logic |
| T-07 | View product details | Customer | Must | GET /products/:id returns 404 for missing/inactive product |
| T-08 | Add product to cart | Customer | Must | Authenticated only; quantity >=1; stock validated |
| T-09 | Update cart item quantity | Customer | Must | Quantity 0 removes item; exceeds stock is 400 |
| T-10 | Remove item from cart | Customer | Must | Item removed; cart total recalculated |
| T-11 | Checkout (create order from cart) | Customer | Must | Cart must not br empty; stock validated; order created atomically then cart cleared |
| T-12 | View order history | Customer | Must | Returns only the authenticated user's orders |
| T-13 | View order details | Customer | Must | 403 if order belongs to another user |
| T-14 | Manage profile (name, address) | Customer | Should | Updates persisted; email change requires re-verification (Could) |
| T-15 | Admin login (same endpoint, role-checked) | Admin | Must | Role claim in JWT gates admin routes |
| T-16 | Create product | Admin | Must | Validates required fields; 201 on success |
| T-17 | Update product | Admin | Must | Partial update supported |
| T-18 | Deactivate product | Admin | Must | Soft delete; hidden from customer catalog |
| T-19 | Manage categories (CRUD) | Admin | Should | Category deletion blocked if products reference it |
| T-20 | View all orders | Admin | Must | Paginated; filterable by status |
| T-21 | Update order status | Admin | Must | Enforced state machine (Pending to Paid to Shipped then finally Delivered or cancelled) |
| T-22 | View basic system info (order/user counts) | Admin | Could | Simple dashboard metrics, not full analytics |
 
### 3.6 Won't Have
Multi-seller marketplace, live payment gateway, real-time stock websockets, product reviews/ratings, wishlist, coupon/discount engine, recommendation engine. These are  excluded because adding them would inflate the scope

## 4. Non-Functional Requirements
 
| Category | Requirement |
|---|---|
| **Performance** | Typical API responses should complete within ~300ms under normal development-test load |
| **Security** | Passwords hashed with bcrypt; JWT signed with HS256 and a secret stored in environment variables; all admin routes enforce role-based authorization server-side |
| **Availability** | Target 95%+ uptime during the grading/demo window |
| **Scalability** | Stateless backend (JWT, no server-side session) allows horizontal scaling behind a load balancer if needed; not required to be load-tested at academic scale, but the design must not architecturally prevent it. |
| **Maintainability** | Layered architecture (Controller/Service/Repository) with ESLint + consistent style enforced in CI; each module has a single responsibility. |
| **Usability** | Core flows (Browse then Cart then Checkout) completable in <=5 clicks from homepage; form validation gives inline, specific error messages. |
| **Accessibility** | Semantic HTML, keyboard-navigable forms, sufficient colour contrast |
| **Compatibility** | Responsive design tested at 3 breakpoints (mobile <=480px, tablet <=768px, desktop >=1024px); latest two versions of Chrome, Firefox, Edge. |
| **Reliability** | Checkout must be atomic, so either the full order (with items) is created and stock decremented, or nothing is (DB transaction). |
| **Testability** | All business logic isolated in Service layer, unit-testable without HTTP or DB. |
 
Unrealistic enterprise SLAs are avoided on purpose since they aren't achievable more meaningful on student-free infrastructure and would not be honestly demonstratable

## 5. Backend & Frontend Framework Justification

### 5.1 Frontend Framework: React

React was selected as the frontend framework for the e-commerce web application because it provides a component-based architecture that supports the development of reusable and maintainable user interface components. The application contains multiple user-facing features, including product browsing, search and filtering, authentication, shopping cart management, checkout, order history, and an administrative interface. React allows these features to be organised into reusable components and pages.

React is also suitable for building a responsive single-page application (SPA). Its component-based structure allows the customer storefront and administrative interface to share common UI elements where appropriate while maintaining separation between different application features.

The framework integrates effectively with RESTful APIs through HTTP requests, allowing the frontend to communicate with the Node.js and Express backend using JSON data. This separation ensures that the presentation layer remains independent from the backend business logic and database layer.

React was therefore selected because it supports:

- Component-based and reusable UI development.
- Responsive cross-platform web interfaces.
- Clear separation between frontend presentation and backend logic.
- Integration with RESTful APIs using JSON.
- Maintainable development of customer and administrator interfaces.
- A large ecosystem and community, which supports efficient development for a four-person student team.

### 5.2 Backend Framework: Node.js and Express

Node.js was selected as the backend runtime environment, with Express used as the web application framework. This combination provides a lightweight and flexible environment for developing the RESTful API required by the e-commerce application.

Using JavaScript across both the frontend and backend improves development consistency by allowing the team to work primarily within a single programming language. Express provides routing and middleware capabilities that support the implementation of API endpoints, authentication, authorisation, validation, and centralised error handling.

The backend will follow the project's layered architecture based on MVC principles, extended with Service and Repository layers. This approach separates responsibilities between the HTTP/API layer, business logic, and database access layer, improving maintainability and testability.

The planned backend flow is:

Routes → Controllers → Services → Repositories → PostgreSQL Database

This separation allows business logic to be isolated within the Service layer and database operations to be managed through the Repository layer. As a result, the application can be tested and maintained more easily as the system grows.

Node.js and Express were therefore selected because they provide:

- Support for developing RESTful APIs.
- Lightweight and flexible routing through Express.
- Middleware support for JWT authentication and role-based authorisation.
- Centralised error handling and request validation.
- Compatibility with the MVC, Service, and Repository architecture.
- Consistency through the use of JavaScript across the full stack.
- A suitable development environment for a small Agile development team.

### 5.3 Framework Integration

The React frontend and Node.js/Express backend will operate as separate components of the full-stack system. The frontend will communicate with the backend through RESTful API requests over HTTPS. Data will be exchanged primarily in JSON format.

The backend will process requests, apply authentication and authorisation rules, execute business logic, and interact with the PostgreSQL database. The resulting data or response will then be returned to the React frontend.

This architecture provides a clear separation of concerns between the user interface, application logic, and persistent data layers.

## 6. Full-Stack System Architecture

The system follows a full-stack architecture consisting of a frontend application, backend API, database, and supporting authentication and external services. The architecture separates the user interface from the business logic and data layer, allowing each component to have a clear responsibility.

### 6.1 Architecture Components

- **Frontend:** Provides the user interface through which customers and administrators interact with the system.
- **Backend API:** Handles business logic, request processing, validation, authentication, and communication between the frontend and database.
- **Database:** Stores application data such as users, products, orders, and other system information.
- **Authentication:** Uses JWT-based authentication to securely identify authenticated users and control access to protected resources.
- **External Services:** The system may communicate with external services where required, such as payment or other third-party services.

### 6.2 Architecture Flow

The general flow of the system is:

**User → Frontend → Backend API → Database**

For protected operations:

**User → Frontend → Backend API → JWT Authentication → Database**

The frontend sends HTTP requests to the backend API. The backend validates the request, applies the required business logic, and communicates with the database when data needs to be retrieved or modified. The API then returns the appropriate response to the frontend.

### 6.3 System Architecture Diagram

```text
                         ┌──────────────────────┐
                         │        Users         │
                         │ Customers / Admins   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Frontend        │
                         │   User Interface     │
                         └──────────┬───────────┘
                                    │
                              HTTP / REST
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Backend API     │
                         │ Business Logic       │
                         │ Validation           │
                         │ Authentication       │
                         └───────┬───────┬──────┘
                                 │       │
                         JWT Auth │       │ Data Access
                                 │       │
                                 ▼       ▼
                         ┌──────────┐  ┌──────────────┐
                         │   JWT    │  │   Database   │
                         │ Security │  │              │
                         └──────────┘  └──────────────┘
