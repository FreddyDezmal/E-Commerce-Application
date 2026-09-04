# Archived: Node.js / Express / Prisma Backend

This folder contains the **original Milestone 2 backend implementation**,
built against the pre-amendment Milestone 1 System Plan (Node.js + Express
+ Prisma + PostgreSQL).

## Why this is archived, not deleted

Milestone 1 was formally amended (see
`../Documentation/M1_SystemPlan_v1.1.md`) to replace the backend
implementation technology with **C# + ASP.NET Core Web API + Entity
Framework Core**, for the reasons documented in that amendment (Deliverable
1). The functional requirements, database domain model, and architectural
*pattern* (MVC + Service + Repository) did not change — only the language
and framework implementing them did.

This code is kept rather than deleted because:
- It's real, working, previously-tested implementation history (see the
  Git log for this folder) — deleting it would erase legitimate TDD/Agile
  evidence from earlier in the project.
- It's a useful side-by-side reference while building the ASP.NET Core
  equivalent — the business rules (cart stock validation, order state
  machine, checkout atomicity, ownership checks) are the same rules,
  just re-expressed in C#.

## Status

**Not maintained.** This code is not part of the active build, is not
deployed, and should not be modified going forward. All active backend
development happens in `/src` (ASP.NET Core).

## Running this archived version (if ever needed for reference)

```bash
cd legacy-nodejs
npm install
cp .env.example .env   # fill in a local DATABASE_URL / JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm test
```
