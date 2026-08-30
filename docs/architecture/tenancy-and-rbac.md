# Tenancy and RBAC Contract

**Status:** Accepted security contract

## Tenant model

`Organization` is the tenant boundary. Every tenant-owned record includes `orgId`, references an organization, and has an access path that begins with a verified membership.

Tenant-owned models currently include `Membership`, `Invitation`, `Task`, and `AuditLog`. Future comments, attachments, notifications, API keys, webhooks, and exports must follow the same rule.

## Mandatory query rules

- Read a tenant-owned record by `{ id, orgId }`, not `id` alone.
- List, count, update, delete, relation loading, exports, and jobs all include `orgId`.
- Obtain the actor ID from the authenticated server session.
- Obtain role from the current membership row, never from client input or a long-lived token claim.
- Return `404` for a missing organization-scoped resource after tenant access is established; do not reveal that it exists elsewhere.
- Direct Prisma access from routes and UI modules is prohibited for tenant-owned data.

## Role policy

| Action | Admin | Manager | Member |
| --- | --- | --- | --- |
| Read organization and tasks | Allow | Allow | Allow |
| Create task | Allow | Allow | Allow |
| Update any task | Allow | Allow | Deny |
| Update own/assigned task | Allow | Allow | Allow |
| Delete task | Allow | Allow | Deny |
| List members and audit | Allow | Allow | Deny |
| Invite member or manager | Allow | Allow | Deny |
| Invite admin | Allow | Deny | Deny |
| Change roles/remove members | Allow | Deny | Deny |

## Invariants

- Every organization has at least one active admin.
- A task assignee is either null or an active member of the same organization.
- Accepted, revoked, or expired invitations cannot create additional membership state.
- Membership uniqueness is enforced by `(userId, orgId)`.
- Removal takes effect on the next request because membership is checked against the database.
- All authorization-relevant mutations produce an audit record.

## Policy API direction

Prefer named policy functions over scattered role arrays:

```ts
canCreateInvitation(actorRole, invitedRole)
canUpdateTask(actorMembership, task)
canRemoveMembership(actorMembership, targetMembership, adminCount)
canReadAudit(actorRole)
```

The UI may call equivalent capability helpers for display, but services must perform authoritative checks.

## Defense in depth

Application-layer scoping plus integration tests is the immediate standard. PostgreSQL row-level security is a later security milestone:

1. Prototype on one low-risk tenant table.
2. Set organization context transaction-locally through a trusted service path.
3. Verify behavior with the selected Prisma pooling/deployment configuration.
4. Use a restricted web database role and distinct migration/administration role.
5. Add tests for missing context, wrong context, jobs, and migrations before wider rollout.

`AsyncLocalStorage` context is diagnostic unless and until a database/client enforcement layer consumes it.

## Required test matrix

For every tenant-owned operation test:

- Authorized role in organization A succeeds.
- Unauthorized role in organization A fails.
- Authenticated non-member fails.
- Member of organization B cannot use B's route with A's resource ID.
- Deleted membership fails immediately.
- Duplicate or concurrent mutation preserves invariants where applicable.
