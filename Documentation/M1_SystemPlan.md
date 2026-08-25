# Milestone 1: System Plan
### E-Commerce Web Application — Architectural & Engineering Foundation

## 1. Executive Summary
 
This document is the System Plan for a full-stack e-commerce web application built for our SEN371. It produces the blueprint for the architecture, technology stack, database design, API contract, security model, UI/UX strategy, testing strategy, version control workflow, and deployment plan that will govern Milestones 2–6.
 
The recommended stack is **React (frontend) + Node.js/Express (backend) + PostgreSQL (database)**, structured around **MVC with a Service and Repository layer**, secured with **JWT-based authentication**, developed using **Agile/Scrum with Test-Driven Development**, and deployed via **GitHub Actions CI/CD** to **Vercel/Netlify (frontend)** and **Render/Railway (backend + managed Postgres)**.
 
No implementation begins in this milestone. Every decision below is justified, scoped to what our 4 people student team is able to realistically deliver across 3 weeks, and traceable from requirement → architecture → API → database → UI → test → deployment.

## 2. System Overview

**What the system does:** A web-based storefront where customers browse a product catalog, manage a shopping cart, and place orders, while administrators manage products, categories, and order fulfillment.
 
**Users:**
- **Customer (guest/registered):** browses and purchases products.
- **Administrator:** manages catalog and order lifecycle.
- (No third role such as "seller" or "courier" is included since that would be out of scope, see section 4 assumptions.)
**Business problem solved:** Provides a minimal but complete online retail workflow; discovery, cart, checkout, order tracking. Demonstrating a real e-commerce transaction lifecycle rather than a generic CRUD demo.
 
**Major capabilities:** authentication & authorization, product catalog with search/filter, cart management, order placement and history, and an admin back-office for catalog/order management.
 
**System boundary:** The system owns product, user, cart, and order data. It does **not** integrate a real payment gateway. Checkout produces an order record with a simulated payment status, which is realistic for an academic deployment and avoids PCI-DSS scope. It does not include shipping-carrier integration, email delivery infrastructure beyond a stub, or multi-tenant/marketplace features.
 
**High-level technical architecture:** A single-page React frontend consumes a REST API exposed by an Express backend structured in MVC (Controllers → Services → Repositories → Models), backed by PostgreSQL, with JWT-based stateless authentication and role-based authorization for admin routes.

## 3. Requirements Analysis
 
### 3.1 Explicit Requirements
Agile process, TDD, MVC architecture, full-stack app, REST API, database persistence, authentication/security, responsive UI, automated testing, Git/GitHub collaboration, CI/CD principles, production-oriented deployment.
 
### 3.2 Implicit Requirements
- Passwords must never be stored in plaintext
- The system must distinguish authenticated vs. unauthenticated access
- Data must remain consistent across cart → order transitions
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
1. **No real payment gateway** — checkout is simulated (status: `pending` to `paid`) to avoid PCI scope.
2. **Single currency, single locale** — no i18n/multi-currency requirement stated.
3. **Two roles only** — `customer` and `admin`
4. **Guest browsing allowed**, but cart persistence and checkout require authentication
5. **Soft-delete for products** — admins "deactivate" rather than hard-delete, to preserve referential integrity with historical orders.
6. **Email is out of scope for real delivery** — password reset / order confirmation emails are stubbed/logged, not sent via a live SMTP provider, unless we say otherwise?.
### 3.5 Functional Requirements
 
MoSCoW: **M**ust, **S**hould, **C**ould, **W**on't (this iteration)
 
| ID | Description | Actor | Priority | Acceptance Criteria |
|---|---|---|---|---|
| T-01 | Register a new account | Customer | Must | Given valid email/password, account is created, password hashed, duplicate email rejected with 409 |
| T-02 | Login | Customer/Admin | Must | Valid credentials return JWT; invalid returns 401 |
| T-03 | Logout (client-side token discard) | Customer/Admin | Must | Token removed client-side; protected routes reject old token after expiry |
| T-04 | Browse products | Customer | Must | GET /products returns paginated, active products only |
| T-05 | Search products by name | Customer | Must | Query param filters results case-insensitively |
| T-06 | Filter products by category/price | Customer | Should | Filters combine with AND logic |
| T-07 | View product details | Customer | Must | GET /products/:id returns 404 for missing/inactive product |
| T-08 | Add product to cart | Customer | Must | Authenticated only; quantity ≥1; stock validated |
| T-09 | Update cart item quantity | Customer | Must | Quantity 0 removes item; exceeds stock is 400 |
| T-10 | Remove item from cart | Customer | Must | Item removed; cart total recalculated |
| T-11 | Checkout (create order from cart) | Customer | Must | Cart must not br empty; stock validated; order created atomically then cart cleared |
| T-12 | View order history | Customer | Must | Returns only the authenticated user's orders |
| T-13 | View order details | Customer | Must | 403 if order belongs to another user |
| T-14 | Manage profile (name, address) | Customer | Should | Updates persisted; email change requires re-verification (Could) |
| T-15 | Admin login (same endpoint, role-checked) | Admin | Must | Role claim in JWT gates admin routes |
| T-16 | Create product | Admin | Must | Validates required fields; 201 on success |
| T-17 | Update product | Admin | Must | Partial update supported (PATCH semantics) |
| T-18 | Deactivate product | Admin | Must | Soft delete; hidden from customer catalog |
| T-19 | Manage categories (CRUD) | Admin | Should | Category deletion blocked if products reference it |
| T-20 | View all orders | Admin | Must | Paginated; filterable by status |
| T-21 | Update order status | Admin | Must | Enforced state machine (Pending to Paid to Shipped then finally Delivered or cancelled) |
| T-22 | View basic system info (order/user counts) | Admin | Could | Simple dashboard metrics, not full analytics |
 
### 3.6 Won't Have
Multi-seller marketplace, live payment gateway, real-time stock websockets, product reviews/ratings, wishlist, coupon/discount engine, recommendation engine. These are  excluded because adding them would inflate the scope