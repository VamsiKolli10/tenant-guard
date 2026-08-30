# Product Metrics Plan

**Status:** Proposed baseline targets

## North-star behavior

**Weekly collaborative organizations:** organizations with at least two distinct active members and at least three meaningful task actions in a seven-day period.

This measures recurring team use rather than registrations or page views.

## Pilot funnel

| Stage | Definition | Initial target |
| --- | --- | --- |
| Registration | User account created successfully | Establish baseline |
| Organization activation | Organization and first task created within 24 hours | 60% of registrations |
| Collaborative activation | Invitation accepted and invitee performs a task action within 7 days | 40% of activated organizations |
| Week-4 retention | Organization is collaborative-active in week four | 30% of collaborative activations |
| Reliability | Successful core requests, excluding expected 4xx responses | 99.9% |

Targets are hypotheses for the private pilot, not promises. Re-baseline after 20 activated organizations.

## Core events

| Event | Required properties |
| --- | --- |
| `account_registered` | user ID, timestamp, source |
| `organization_created` | user ID, organization ID, timestamp |
| `task_created` | organization ID, actor ID, task ID, timestamp |
| `invitation_created` | organization ID, actor ID, role, timestamp; never token/email |
| `invitation_accepted` | organization ID, actor ID, invitation ID, timestamp |
| `task_assigned` | organization ID, actor ID, task ID, timestamp |
| `task_status_changed` | organization ID, actor ID, task ID, prior/new status, timestamp |

## Operational indicators

- p50/p95/p99 latency by route and operation
- Error rate by release and organization, with privacy-safe identifiers
- Login failure and rate-limit counts
- Invitation delivery, bounce, and acceptance rates
- Background-job success, retry, age, and dead-letter counts
- Database connection use, slow queries, storage growth, and backup status

## Measurement rules

- Audit logs are security records; product analytics are behavioral aggregates. Do not make one table serve both purposes.
- Do not send task titles/descriptions, email addresses, tokens, passwords, or free-form audit metadata to analytics.
- Document event schema changes and avoid silently changing funnel definitions.
- Provide a way to disable nonessential analytics where privacy requirements demand it.
