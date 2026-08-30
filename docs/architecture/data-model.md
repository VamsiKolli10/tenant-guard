# Data Model Guide

**Status:** Accepted current model with proposed extensions

## Current entities

| Entity | Responsibility | Key constraints/indexes |
| --- | --- | --- |
| `User` | Global identity | Unique normalized email; password hash never exposed |
| `Organization` | Tenant root | Creator reference; lifecycle policy required before deletion |
| `Membership` | User-to-organization authorization | Unique `(userId, orgId)`; index `(orgId, role)` |
| `Invitation` | Time-bound onboarding grant | Unique token hash; organization/time index; expiry/revocation/acceptance state |
| `Task` | Organization work item | Organization-scoped status, assignee, due-date, creator indexes |
| `AuditLog` | Append-oriented security/business event | Organization/time index; safe JSON metadata |

## Modeling rules

- Tenant-owned models include `orgId` even when it can be reached through another relation. This enables direct policy, indexing, and future RLS.
- Foreign keys should define intentional deletion behavior; do not rely on accidental database defaults.
- Use database constraints for uniqueness and referential integrity, and service transactions for multi-row invariants.
- Store timestamps in UTC and render them in the user's locale.
- Prefer immutable identifiers. Do not encode organization or user information into public IDs.
- Index from the tenant boundary: common composite indexes should begin with `orgId`.

## Invitation state

An invitation is valid only when:

```text
acceptedAt is null
AND revokedAt is null
AND expiresAt > now
AND optional email matches the authenticated user's normalized email
```

Acceptance must lock or conditionally update the invitation within a transaction so concurrent requests cannot both perform side effects.

## Audit event catalog

| Action | Required metadata |
| --- | --- |
| `org.created` | organization name or safe display value |
| `org.invite.created` | invitation ID, role, email domain or redacted email if needed |
| `org.invite.revoked` | invitation ID, prior state |
| `org.invite.accepted` | invitation ID, resulting membership ID |
| `org.member.role_updated` | target user ID, prior role, new role |
| `org.member.removed` | target user ID, prior role |
| `task.created` | task ID |
| `task.updated` | changed field names and safe before/after scalar values |
| `task.status.changed` | prior status, new status |
| `task.deleted` | task ID and safe title snapshot if policy permits |

Audit metadata must never contain passwords, password hashes, session/JWT values, raw invite tokens, provider credentials, or unrestricted request bodies.

## Proposed additions

- `OutboxEvent`: reliable external side effects, with unique event ID, `orgId`, type, safe payload, attempts, and publication state.
- `TaskComment`: organization/task/author-scoped discussion, only after user research validates it.
- `NotificationPreference`: per-user/per-organization channel preferences.
- `IdempotencyRecord`: request scope, actor, organization, key, request fingerprint, response reference, and expiry.
- `OrganizationStatus`: active, suspended, and pending-deletion lifecycle if commercial operation requires it.

## Migration policy

Use checked-in Prisma migrations. Prefer expand/backfill/switch/contract changes. Each production migration must include expected runtime/locking behavior, rollback or forward-fix strategy, and verification query. Never use `prisma db push` against production.
