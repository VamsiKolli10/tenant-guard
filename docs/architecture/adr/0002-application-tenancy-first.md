# ADR 0002: Application-Enforced Tenancy First, Evaluate RLS

**Status:** Accepted  
**Date:** 2026-08-29

## Context

The current code authorizes membership in application services and scopes Prisma operations by `orgId`. PostgreSQL RLS can add defense in depth but interacts with connection pooling, transaction context, migrations, and workers.

## Decision

Require centralized membership/role checks, explicit `orgId` filters, and cross-tenant integration tests now. Prototype RLS separately and adopt it only after the selected production connection model is verified.

## Consequences

- The immediate model matches the existing repository and is easier to test and operate.
- Code review and tests remain critical because the database does not yet prevent every unscoped query.
- `AsyncLocalStorage` is not treated as a security mechanism.
- RLS remains a planned defense-in-depth milestone rather than an implied current capability.
