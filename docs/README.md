# Tenant Guard Documentation

This directory is the working source of truth for product, engineering, security, and operations decisions.

## Start here

1. Read [`product/prd.md`](product/prd.md) for the product scope and launch criteria.
2. Read [`architecture/system-design.md`](architecture/system-design.md) and [`architecture/tenancy-and-rbac.md`](architecture/tenancy-and-rbac.md) before changing application behavior.
3. Use [`product/roadmap.md`](product/roadmap.md) to sequence work.
4. Use the security and operations checklists before onboarding external users.

## Document map

| Area | Documents |
| --- | --- |
| Product | PRD, personas and journeys, metrics plan, roadmap, positioning and research plan, product gaps |
| Architecture | System design, tenancy/RBAC, data model, database setup, API conventions, ADRs |
| Security | Threat model, data classification, incident response, security review findings |
| Operations | Deployment, disaster recovery, support runbook, testing, smoke test |
| High-level references | `project-blueprint.md`, `architecture-guide.md`, `architecture.mmd` |

## Document status convention

- **Proposed:** a recommendation awaiting validation or an owner decision.
- **Accepted:** the current decision and implementation target.
- **Implemented:** verified in production, not merely present in code.
- **Superseded:** retained for history and linked to the replacement.

All business metric targets in these documents are initial hypotheses. Replace them with observed baselines after the first pilot cohort.
