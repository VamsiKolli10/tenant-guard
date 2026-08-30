# Delivery Roadmap

**Status:** Proposed; sequence is more important than dates

## Milestone A — Safe staging baseline

**Outcome:** The existing MVP can be deployed, diagnosed, migrated, and restored safely.

- Separate test, preview/staging, and production configuration
- Managed PostgreSQL with automated backups and point-in-time recovery
- Reviewed Prisma migration workflow
- Error tracking, structured logs, request IDs, uptime monitoring
- Authentication/register/invite rate limits
- Cross-tenant integration-test matrix
- Dependency and secret scanning

**Exit:** staging deployment passes critical flows; a backup restore is demonstrated; P0 authorization tests pass in CI.

## Milestone B — Private pilot readiness

**Outcome:** A small external team can onboard and use the core workflow without database intervention.

- Email verification and password recovery
- Transactional invitation email and delivery visibility
- Last-admin protection, member removal, and ownership rules
- Assignment restricted to active same-organization members
- Transactional mutation/audit behavior
- Task edit/delete UI and audit-history UI
- Playwright coverage for sign-up, invitation, cross-tenant denial, and role enforcement
- Terms, privacy notice, and support channel

**Exit:** three design partners complete observed onboarding; no unresolved P0 defects.

## Milestone C — Workflow retention

**Outcome:** Managers return weekly to coordinate real work.

- Comments or activity timeline based on validated need
- Due-date/overdue views and notification preferences
- Saved filters and practical task navigation
- Accessible loading/error/empty states
- Product analytics dashboard using defined metrics
- Support and incident runbooks exercised

**Exit:** the pilot reaches agreed collaborative activation and retention targets.

## Milestone D — Commercial validation

**Outcome:** A narrow customer segment demonstrates willingness to pay.

- Select target segment and publish positioning
- Test per-seat versus per-workspace pricing manually
- Define entitlement boundaries without building complex billing
- Data export and account/organization deletion policy
- Formalize service expectations and customer onboarding

**Exit:** at least three customers pay or sign a clear paid-pilot commitment.

## Later, only with evidence

SSO/SCIM, webhooks, public API, attachments, custom roles, mobile applications, advanced reporting, and vertical-specific objects require repeated customer evidence and a written decision record.
