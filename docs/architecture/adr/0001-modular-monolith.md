# ADR 0001: Use a Modular Monolith

**Status:** Accepted  
**Date:** 2026-08-29

## Context

Tenant Guard is an early-stage product operated by a small team. Its principal complexity is authorization and tenant safety, not independent scaling of subsystems.

## Decision

Use one Next.js deployment and one PostgreSQL database. Enforce module boundaries between HTTP/UI, application policy, and domain persistence. Add an independently running worker only when asynchronous delivery is introduced.

## Consequences

- Local development, deployment, transactions, and debugging remain simple.
- Modules can evolve without network APIs between them.
- The team must actively enforce import and responsibility boundaries.
- A future service extraction requires evidence: independent scaling, security isolation, ownership, or deployment needs.

## Alternatives considered

- **Microservices:** rejected because operational and consistency costs exceed current benefits.
- **Serverless functions per domain:** rejected as an architectural boundary because functions still share data and policy.
