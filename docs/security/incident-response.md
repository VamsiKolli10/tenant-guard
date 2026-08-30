# Incident Response Plan

**Status:** Proposed; assign names and contacts before pilot

## Severity

| Severity | Examples | Initial response target |
| --- | --- | --- |
| SEV-1 | Confirmed/suspected cross-tenant exposure, credential compromise, destructive data loss, broad outage | Acknowledge within 15 minutes |
| SEV-2 | Major feature unavailable, invitation/authentication failure affecting many users, degraded database | Acknowledge within 1 hour |
| SEV-3 | Limited defect with workaround, isolated job failure | Review within one business day |

Targets are internal pilot objectives, not customer SLAs.

## Roles

- **Incident commander:** owns decisions, timeline, and status.
- **Technical lead:** investigates and mitigates.
- **Communications owner:** updates customers/stakeholders.
- **Scribe:** records evidence, actions, and timestamps.

For a solo operation one person may hold all roles, but the responsibilities remain explicit.

## Response process

1. **Detect and classify:** create an incident record, assign severity, preserve alerts and request IDs.
2. **Contain:** disable a route/feature, revoke secrets/sessions, suspend jobs, or restrict access as needed.
3. **Investigate:** use immutable logs, audit history, deployment changes, and database evidence; do not modify evidence casually.
4. **Eradicate and recover:** patch the cause, restore data/service, rotate affected credentials, and validate tenant boundaries.
5. **Communicate:** provide known facts, impact, mitigation, and next update time; avoid speculation.
6. **Review:** within five business days document timeline, contributing conditions, detection gaps, corrective actions, and owners.

## Security-specific actions

For suspected tenant exposure, preserve relevant application/database logs, identify affected organizations and fields, block the vulnerable path, invalidate related exports/tokens, and determine notification obligations with qualified legal guidance.

## Required preparation

- Named on-call contact and private incident channel
- Provider support contacts and status pages
- Ability to revoke sessions and rotate every production secret
- Feature flag or deployment rollback capability
- Tested database restoration procedure
- Customer contact list and message templates
