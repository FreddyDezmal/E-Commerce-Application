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
 
**System boundary:** The system owns product, user, cart, and order data. It does **not** integrate a real payment gateway (see assumptions, section 4). Checkout produces an order record with a simulated payment status, which is realistic for an academic deployment and avoids PCI-DSS scope. It does not include shipping-carrier integration, email delivery infrastructure beyond a stub, or multi-tenant/marketplace features.
 
**High-level technical architecture:** A single-page React frontend consumes a REST API exposed by an Express backend structured in MVC (Controllers → Services → Repositories → Models), backed by PostgreSQL, with JWT-based stateless authentication and role-based authorization for admin routes.