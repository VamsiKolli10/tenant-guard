# Product Requirements Document

**Product:** Tenant Guard  
**Status:** Proposed for pilot  
**Owner:** Product owner (assign before pilot)  
**Target release:** Private pilot

## Product thesis

Small operational teams need a straightforward place to assign work while administrators retain clear control over who can access each workspace and can reconstruct important changes. Tenant Guard combines lightweight task coordination with tenant isolation, role-based access, and an audit trail.

## Initial market assumption

The initial wedge is **small operational teams of 5–50 users that collaborate across controlled workspaces and consider access accountability important**. Agencies and internal operations teams are the first research candidates. Property management and IT service management should be treated as separate vertical hypotheses until research proves a shared workflow.

## Goals

- Let an administrator create a workspace and onboard a team safely.
- Let members understand, create, and update permitted work without training.
- Prevent users from reading or changing another organization's information.
- Give managers a reliable record of access-related and work-related changes.
- Establish enough operational reliability to support a small private pilot.

## Non-goals for the pilot

- Full project planning, Gantt charts, time tracking, chat, or document editing
- Native mobile applications
- Custom roles or per-field permissions
- Enterprise SSO/SCIM
- Public API marketplace or complex third-party integrations
- Automated usage billing

## Core user stories and acceptance criteria

### Registration and authentication

As a new user, I can register and sign in so that I can create or join a workspace.

- Email addresses are normalized and unique.
- Password requirements are explained and enforced.
- Login and registration are rate-limited.
- Before public launch, email verification and password recovery are available.
- Authentication errors do not reveal whether an account exists.

### Organization creation

As an authenticated user, I can create an organization and become its administrator.

- Organization creation and the initial `ADMIN` membership are atomic.
- The creator can open the workspace immediately.
- Organization creation produces an audit event.

### Invitations

As an admin or manager, I can invite a teammate with an allowed role.

- Admins may invite admins, managers, or members.
- Managers may invite managers or members, never admins.
- Tokens are random, stored only as hashes, expire, and can be revoked.
- An email-bound invitation can be accepted only by the matching normalized email.
- Acceptance is atomic and idempotent; concurrent acceptance creates at most one membership.
- Creation, revocation, and acceptance produce audit events.

### Membership administration

As an admin, I can change roles and remove members without orphaning the organization.

- Only admins change roles or remove members.
- The final admin cannot be demoted or removed.
- An admin cannot accidentally remove their own access without an explicit transfer path.
- Removing membership invalidates organization access immediately.
- Role and removal events record actor, target, prior role, new role, and organization.

### Task management

As a member, I can create tasks and work on tasks that I own or that are assigned to me.

- Every task belongs to exactly one organization.
- All members can list organization tasks and create tasks.
- Managers and admins can update and delete any organization task.
- Members can update only tasks they created or are assigned to; they cannot delete tasks.
- Assignees must be active members of the same organization.
- Lists support pagination, search, status, assignee, and date filtering.
- Create, update, status-change, reassignment, and deletion events are audited as defined in the event catalog.

### Audit history

As a manager or admin, I can inspect sensitive organization activity.

- Members cannot access the organization audit feed.
- Events use cursor pagination and newest-first order.
- Display includes action, actor, target, timestamp, and safe contextual metadata.
- Passwords, credentials, invite tokens, and sensitive request bodies never appear in metadata.
- Export is deferred until a retention and authorization policy is accepted.

## Required product states

Every page and mutation must provide accessible loading, empty, success, validation-error, authorization-error, and unexpected-error behavior. Destructive actions require confirmation. The UI must hide unavailable actions for clarity, while server-side policy remains authoritative.

## Analytics events

The initial event list is defined in `metrics-plan.md`. Analytics must use internal IDs, avoid task descriptions and invitation tokens, and support organization-level funnel analysis.

## Dependencies

- Managed PostgreSQL with backups
- Transactional email provider
- Error monitoring and structured logs
- Rate limiting
- Preview/staging/production environments
- Playwright coverage for critical journeys

## Pilot launch criteria

- All P0 tenancy, authorization, authentication, and audit-consistency work is complete.
- Critical cross-tenant and role tests pass in CI.
- Email invitation and account recovery paths work in staging and production.
- Backup restoration has been tested.
- Error, availability, and authentication-abuse alerts have named responders.
- Privacy notice, terms, and pilot support channel are available.
- At least three design partners have completed an observed onboarding session.

## Open decisions

- Confirm the first target segment through interviews.
- Select per-seat versus per-workspace pricing hypothesis.
- Decide whether members should see all organization tasks or only relevant tasks.
- Define organization deletion, member departure, and task ownership-transfer behavior.
- Choose hosted authentication versus continuing to operate credentials authentication.
