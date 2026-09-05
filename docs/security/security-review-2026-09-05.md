# Security Review — Tenant Isolation and Access Control

**Status:** Accepted — all eight findings remediated on branch `security/review-remediation`
**Date:** 2026-09-05
**Scope:** Full repository at commit `28e707d` — Prisma schema and both migrations, all API route handlers, both service layers, authentication/token/rate-limit modules, and org-scoped server components.
**Method:** Static review. The unit suite could not be executed in the review environment (`node_modules` installed for darwin-arm64, runner is linux-arm64 — rollup native binary missing). `tsc --noEmit` passes clean.

---

## Summary

No live cross-tenant read or write path was found. The per-request membership check is applied consistently: every organization-scoped route resolves the session user, passes through `requireMembership` / `requireRole`, and every task query carries `orgId` in its `where` clause (`findFirst`, never a bare `findUnique`, on task lookups). Token handling is sound — 256-bit random tokens, SHA-256 at rest, single-use consumption inside a transaction, bcrypt cost 12, and a password-reset flow that does not disclose account existence.

Two defects require immediate attention: password hashes are served over the members API, and email verification is written but never enforced, which opens an invite-hijack path. Beyond those, the isolation and audit guarantees claimed in `README.md` and the project description are weaker in implementation than they appear — the tenant-context module enforces nothing, and the audit log is not append-only at the database level.

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| 1 | Member API returns bcrypt password hashes | Critical | Fixed |
| 2 | Email verification never enforced → invite hijack | High | Fixed |
| 3 | Tenant context is write-only; no isolation backstop | High | Fixed |
| 4 | Revoke response leaks the invitation `tokenHash` | Medium | Fixed |
| 5 | Audit log not append-only; `ip`/`userAgent` never recorded | Medium | Fixed |
| 6 | Login rate limit keyed only on email → lockout DoS | Medium | Fixed |
| 7 | Assigned MEMBER can reassign a task away | Low | Fixed (behaviour decided) |
| 8 | Routes can bypass the guarded service facade | Low | Fixed |

Remediation detail is recorded under each finding below, and the verification
status of this work is described in [Verification](#verification).

---

## 1. Member API returns bcrypt password hashes — Critical

**Location:** `src/server/services/memberships.ts:34`, surfaced by `src/app/api/orgs/[orgId]/members/route.ts:23`

`listMembers` selects with `include: { user: true }`, which materialises the entire `User` row, and the route returns that object verbatim. Every ADMIN or MANAGER therefore receives `user.passwordHash` and `user.emailVerifiedAt` for every member of their organization. `changeMemberRole` (`src/server/services/memberships.ts:68-72`) uses the same `include` and leaks identically through `PATCH /api/orgs/[orgId]/members/[userId]`.

**Impact.** An insider with MANAGER rights in a single organization obtains offline-crackable bcrypt hashes for users who may hold ADMIN roles in *other* organizations, since `User` is global across tenants. This is explicitly a "report immediately" class of issue under the repository's own `SECURITY.md` (credential disclosure).

**Recommendation.** Replace both `include: { user: true }` clauses with an explicit projection, and never return raw `User` rows from a service:

```ts
include: { user: { select: { id: true, name: true, email: true } } }
```

Consider adding a repository-wide lint rule or a test asserting that no API response body contains a `passwordHash` key.

**Remediation.** Both `include: { user: true }` clauses now project through a shared `PUBLIC_USER_SELECT` (`id`, `name`, `email`) exported from `src/server/services/memberships.ts`, with a comment recording why the constant exists. Regression tests in `src/services/security-regressions.test.ts` assert that neither the members list nor a role change returns `passwordHash` or `emailVerifiedAt`.

---

## 2. Email verification never enforced → invite hijack — High

**Location:** `src/server/auth.ts:64`; related `src/server/services/invitations.ts:105`

`emailVerifiedAt` is written by `verifyEmailWithToken` (`src/server/auth-tokens.ts:53`) and read nowhere in the application. A repository-wide search finds references only in that writer and in a test assertion. The credentials `authorize()` callback does not consult it, and neither does invitation acceptance.

**Impact.** Registration requires no proof of address ownership, yet an unverified account has full application privileges. An attacker registers `cfo@target-corp.com`, signs in, and accepts an invitation bound to that address; `acceptInvitation` compares only `invitation.email !== user.email.toLowerCase()`, which passes. The attacker gains a membership — at whatever role the invitation carried, up to ADMIN — inside a tenant they were never meant to enter. Invitations created without an email (`email: null`) are link-bearer credentials accepted by any authenticated user, which compounds this.

**Recommendation.**
- Reject unverified users in `authorize()`, or gate organization access on `emailVerifiedAt` at the tenancy guard.
- Re-check verification inside `acceptInvitation` regardless of the sign-in gate, so the tenant boundary does not depend on the login path.
- Decide explicitly whether link-only (`email: null`) invitations should remain supported; if so, document them as bearer tokens and shorten their expiry.

**Remediation.** `authorize()` now throws `EMAIL_NOT_VERIFIED` for an unverified account, and the sign-in page surfaces that as a distinct message rather than "invalid email or password". `acceptInvitation` checks verification independently, so the tenant boundary does not depend on the sign-in path. The demo seed marks its user verified. A `createVerifiedUser` factory was added at `src/test/factories.ts` for tests that need a usable account.

Link-only (`email: null`) invitations were left in place; they remain bearer credentials and are still accepted by any verified user holding the link. That is now a conscious decision rather than an oversight — revisit it if invites are ever sent through a channel less trusted than email.

---

## 3. Tenant context is write-only; no isolation backstop — High

**Location:** `src/server/tenant-context.ts:20`

Both tenancy guards call `setOrgContext(orgId)` (`src/services/tenancy.ts:29`, `src/server/services/tenancy.ts:40`), but `getOrgContext` and `TENANT_MODELS` have **zero consumers** anywhere in the codebase. There is no Prisma client extension (`$extends`) or middleware (`$use`) reading the AsyncLocalStorage value, and neither migration establishes row-level security or any per-tenant database policy.

**Impact.** Tenant isolation rests entirely on every service author remembering to pass `orgId` into every `where` clause. Today that discipline holds, but there is no mechanism that would stop a regression. A single future query written as `prisma.task.findUnique({ where: { id: taskId } })` instead of `findFirst({ where: { id, orgId } })` returns another tenant's row silently. The greater risk is that the AsyncLocalStorage scaffolding *reads* like an enforced guard during code review, so a reviewer may reasonably assume a backstop exists where none does.

**Recommendation.** Pick one and make it real:
- **Application layer:** a Prisma `$extends` query interceptor that consults `getOrgContext()` and injects or asserts `orgId` for every model in `TENANT_MODELS`, throwing when the context is unset.
- **Database layer:** Postgres RLS policies on `Membership`, `Invitation`, `Task`, and `AuditLog`, with the request's org set via `SET LOCAL`.

Until one exists, delete the unused module rather than leave scaffolding that implies a guarantee it does not provide, and correct the claim at `README.md:436`.

**Remediation.** Implemented as an application-layer guard (option one). `src/server/tenant-guard.ts` holds a pure `scopeArgs` function and a Prisma client extension applied in `src/server/db.ts`. For every operation on a model in `TENANT_MODELS` the guard pins `orgId` into the `where` clause or the `data` payload, throws `TenantIsolationError` when a query names a different organization, and throws `TenantContextError` when no organization is bound — including for any Prisma operation it does not recognise, so a future operation cannot slip through unscoped.

`orgId` is added at the top level of `where` rather than nested inside an `AND`, so `findUnique`, `update` and `delete` keep the unique field Prisma requires while still constraining any caller-supplied `OR`.

Call sites were reordered so context precedes the first tenant-scoped query: both tenancy guards bind the context before their own membership lookup, and `createOrganization` binds it once the organization row exists. The single legitimate unscoped read — resolving an invite token, where the token identifies the tenant — is wrapped in `runUnscoped()` with a reason string.

The extended client is cast back to `PrismaClient` in `db.ts` so the change does not ripple through every `DbClient` signature; the guard runs regardless of how the client is typed.

RLS was not added. If this application ever grows a second writer against the same database, revisit that — an application-layer guard protects only queries that go through this client.

---

## 4. Revoke response leaks the invitation `tokenHash` — Medium

**Location:** `src/server/services/invitations.ts:171`, surfaced by `src/app/api/orgs/[orgId]/invitations/[inviteId]/revoke/route.ts:24`

`revokeInvitation` performs `db.invitation.update(...)` with no `select`, so the full row — `tokenHash` included — is returned and passed directly to `jsonOk`. This breaks an invariant the module otherwise maintains carefully: both `createInvitation` (lines 42-52) and `listInvitations` (lines 197-207) use explicit projections precisely to keep `tokenHash` out of responses.

**Impact.** The SHA-256 hash of an invite token is placed in an API response body, and from there into browser history, proxy logs, and any client-side error reporting. The hash is not directly redeemable without a preimage, so exposure is limited — but it is a secret-derived value crossing a trust boundary for no reason, and the token it belongs to may still be live at the moment of revocation.

**Recommendation.** Add the same explicit `select` used by the sibling functions.

**Remediation.** The inline projections in `createInvitation` and `listInvitations` were hoisted into a single `PUBLIC_INVITATION_SELECT` constant, and `revokeInvitation` now uses it too, so all three paths share one definition of what is safe to return.

---

## 5. Audit log not append-only; `ip`/`userAgent` never recorded — Medium

**Location:** `src/services/audit.ts:33`; migrations under `prisma/migrations/`

Two separate gaps between claim and implementation:

**Not append-only.** `README.md:3`, `README.md:7`, `README.md:27`, `README.md:230` and the project description all describe an append-only audit trail. Neither migration adds a trigger, a rule, or a revoked `UPDATE`/`DELETE` grant on `"AuditLog"`. The application's database role can freely rewrite or delete audit history.

**Request context never captured.** `auditService.write` is the only code path that populates the `ip` and `userAgent` columns, and it is never called — every route reaches `logAuditEvent` through the domain services, which omit those fields. Both columns are always `NULL` in practice.

**Impact.** Anything holding the application's database credentials — including a compromised application container — can issue `DELETE FROM "AuditLog" WHERE ...` to erase evidence of a privilege escalation. The records that survive carry no IP or user-agent, removing the primary means of correlating an actor across events during an incident response.

**Recommendation.**
- Enforce append-only in the database: a `BEFORE UPDATE OR DELETE` trigger that raises, or revoking `UPDATE`/`DELETE` on `"AuditLog"` from the application role and inserting through a `SECURITY DEFINER` function. Application-level discipline is not sufficient for a tamper-evidence claim.
- Thread request context into the audit calls, or remove the `ip`/`userAgent` columns and the unused `auditService.write` so the schema does not imply capture that is not happening.
- If neither is done near-term, soften the "append-only" language in `README.md` to match reality.

**Remediation.** Both halves addressed.

Migration `20260905000000_audit_append_only` adds a `BEFORE UPDATE OR DELETE` trigger on `"AuditLog"` that raises `restrict_violation`. The migration documents the privileged procedure for retention pruning, and notes that a future user-deletion feature must anonymise rather than delete, since the `SET NULL` cascade onto `actorUserId` would now be refused.

`src/server/request-context.ts` reads the caller's IP and user agent from Next's ambient request headers, and `logAuditEvent` falls back to it when a caller does not pass them explicitly — so every audited action carries request context without threading parameters through every service signature. Outside a request scope (tests, seeds) it records nulls, which is the honest answer for an event with no HTTP caller.

Test cleanup moved from a chain of `deleteMany` calls to a single `TRUNCATE`, which sits below both the Prisma extension and the row-level trigger.

---

## 6. Login rate limit keyed only on email → lockout DoS — Medium

**Location:** `src/server/auth-rate-limit.ts:41`, called from `src/server/auth.ts:41`

The `credentials-login` limiter consumes with `identifier: email` and no IP dimension — notably inconsistent with the registration route (`src/app/api/auth/register/route.ts:43-56`), which correctly limits on email *and* client IP. A throttled attempt returns `null` from `authorize()`, indistinguishable from a wrong password.

**Impact.** Five deliberately-wrong login attempts against a known address lock the legitimate user out for the remainder of the 15-minute window. The attack requires no credentials, works from any IP, and is repeatable indefinitely. The victim receives no signal explaining the failure.

**Recommendation.** Add an IP-keyed limiter alongside the email-keyed one, mirroring the registration route. Consider a longer window with a higher threshold for the email dimension, and surface a distinct message for throttling so users are not left debugging a password they typed correctly.

**Remediation.** `authorize()` now consumes two limiters, mirroring the registration route: 20 attempts per email and 10 per client IP in a 15-minute window. The email budget is deliberately generous — it exists to bound credential stuffing against one account, while the IP dimension does the actual throttling — so five wrong guesses from a stranger no longer lock out the owner.

---

## 7. Assigned MEMBER can reassign a task away — Low

**Location:** `src/server/services/tasks.ts:94-100`

`updateTask` authorises a MEMBER to edit any task they created **or** are assigned to, then applies the entire payload with no field-level restriction. `assignedToUserId` is therefore writable by an ordinary member.

**Impact.** A MEMBER assigned work they do not want can `PATCH` `assignedToUserId` to another member — or to `null` — moving the task off their queue. The change is audited, so it is traceable rather than silent, and the assignee must be a member of the same organization (validated at lines 103-115), so there is no tenant-boundary consequence.

**Note.** This may be intended behaviour; the repository documentation does not state a rule either way. Flagged so the decision becomes explicit.

**Recommendation.** If members should only advance status on tasks assigned to them, restrict the writable field set by role rather than gating the operation as a whole.

**Decision and remediation.** Confirmed as unintended. A member who merely holds a task may now change only `status` and `priority`; any other field in the payload is rejected with an `AuthorizationError`. Members keep full edit rights on tasks they created themselves. The permitted set is a named constant, `ASSIGNEE_EDITABLE_FIELDS`, so the rule is visible at the point it is enforced.

---

## 8. Routes can bypass the guarded service facade — Low

**Location:** `src/services/tenancy.ts:11`

The codebase carries two parallel service layers. `src/services/*` is the guard-enforcing facade that calls `requireMembership` / `requireRole` before delegating; `src/server/services/*` holds the raw domain functions, which accept `orgId` and `actorRole` as plain arguments and trust them completely. Nothing prevents importing the raw layer directly, and two call sites already do: `src/app/api/orgs/route.ts:5-8` and `src/app/dashboard/page.tsx:5-8`.

**Impact.** Both existing bypasses are safe — `listOrganizationsForUser` scopes by `userId`, and `createOrganization` makes the caller the ADMIN of a new org. But the pattern is established, so a new route that imports `@/server/services/tasks` in the same style receives `createTask` / `listTasks` with no membership check at all. The naming (`src/services` vs `src/server/services`) gives a reader no cue about which layer is the safe one.

**Recommendation.**
- Add an ESLint `no-restricted-imports` rule confining `@/server/services/*` to `@/services/*` and test files.
- Rename to make the boundary self-describing (for example `src/server/repositories/*` for the raw layer).
- Move the two existing direct imports behind the facade for consistency.

**Remediation.** An ESLint `no-restricted-imports` rule now blocks `src/app/**` and `src/components/**` from importing the tenant-scoped modules under `@/server/services/*`, with a message pointing at the facade. `@/server/services/users` is exempt: account creation has no tenant dimension and legitimately runs before any membership exists. The two pre-existing direct imports were moved behind the facade, which gained `orgService.createOrg` and `orgService.listOrgsForUser`. The rule was confirmed to fire by temporarily introducing a violating import.

The rename of `src/server/services/*` to something self-describing was not done — it touches every service file and is better as its own commit.

---

## What the review confirmed as sound

Recorded so future reviews do not re-litigate these:

- **Membership enforcement is consistent.** All fourteen API route handlers resolve the session user and return 401 before any data access; every organization-scoped operation passes through a tenancy guard.
- **Task queries are correctly scoped.** `getTask`, `updateTask`, and `deleteTask` all use `findFirst({ where: { id, orgId } })` rather than a bare `findUnique`, so a task ID from another tenant yields a 404, not a leak.
- **Token hygiene is good.** 256-bit random tokens, stored as SHA-256 hashes, marked consumed inside the same transaction that acts on them, with prior unconsumed tokens invalidated on reissue.
- **Password handling is correct.** bcrypt at cost 12; the reset-request endpoint returns an identical response whether or not the account exists.
- **Role escalation via invitation is blocked.** `INVITE_ROLES_BY_ACTOR` prevents a MANAGER from issuing an ADMIN invitation.
- **Last-admin protection holds.** Both `changeMemberRole` and `removeMember` count admins inside the transaction before demoting or removing.
- **No enumeration through error codes.** Non-members receive 403 for both existing and non-existent organizations.
- **Security headers are configured** in `next.config.ts`, with HSTS applied in production.
- **Secrets are not committed.** Only `.env.example` and `.env.test.example` are tracked.

## Verification

What was actually run, and what was not:

- **`tsc --noEmit` — clean.** Run against the full tree after every change.
- **ESLint — clean**, and the new import-boundary rule was confirmed to fire by temporarily introducing a violating import.
- **`src/server/tenant-guard.test.ts` — 17 tests, all passing.** The guard's argument rewriting is a pure function precisely so it can be tested without a database: coverage includes the unique-field-at-top-level requirement, cross-org rejection on both reads and writes, `createMany` row pinning, `upsert`'s two halves, and refusal of unrecognised operations.
- **The database-backed suite was not run.** The review and remediation environment could not host it: Prisma's engine downloads are blocked by network policy, and the machine running the tests has no PostgreSQL instance. `src/services/security-regressions.test.ts` is therefore written but unexecuted.

**Before merging, run `npm test` locally**, where PostgreSQL and a generated Prisma client are available. The changes most worth watching there are the ones that alter live query shapes: the guard's `where`-clause rewriting against real Prisma validation (particularly `findUnique`/`update`/`delete`, which rely on Prisma's extended-unique-filter support), and the audit trigger's interaction with `TRUNCATE`-based test cleanup.

## Original recommended sequence

Retained for the record; all items are now complete.

1. Finding 1 — projection fix on both membership queries. Small, contained, removes a credential-disclosure path.
2. Finding 2 — enforce `emailVerifiedAt` at sign-in and at invite acceptance.
3. Finding 4 — projection fix on invitation revoke, same shape as 1.
4. Finding 3 — decide between a Prisma extension and RLS, then implement one; the isolation claim rests on it.
5. Finding 5 — database-level append-only enforcement, and either capture request context or drop the columns.
6. Finding 6 — add the IP dimension to the login limiter.
7. Findings 7 and 8 — decide the member-edit rule; add the import-boundary lint rule.

## Post-remediation defect: the guard's context mechanism (2026-09-05)

**Found in use.** Accepting an invitation failed with `Unscoped
Invitation.findUnique: the query names no organization and none is bound to the
request.`

The original finding-3 fix leaned on `AsyncLocalStorage` to carry the current
organization to the Prisma extension. That binding **is not visible to queries
executing inside a Prisma interactive transaction**, whether established with
`enterWith` or with `run`. The invite-token lookup is the one query that
genuinely cannot name an organization, so it was where the gap became fatal —
but the same gap meant `setOrgContext` and `runWithOrg` were largely inert
everywhere else. Organization creation only ever worked because those queries
pass `orgId` explicitly and the guard's explicit-scope branch accepted them, not
because any context propagated.

The honest summary: the guard has been enforcing "every tenant-scoped query must
name its organization", which is real and worth having, while the documentation
claimed a second ambient mechanism that mostly did not run.

**Fixed by:**

- Replacing the `runUnscoped` escape hatch with a separate `prismaUnscoped`
  client carrying no guard. A distinct client is explicit, greppable, and cannot
  silently fail to apply the way an ALS binding can.
- Restructuring `acceptInvitation`: the token resolves to an organization id on
  the unguarded client, selecting nothing but `orgId`, and the transaction then
  re-reads the invitation explicitly scoped, keeping validation and acceptance
  atomic against a concurrent revoke.
- Removing `runUnscoped` and `isUnscoped` rather than leaving a mechanism that
  implies a guarantee it cannot deliver.
- Documenting on `getOrgContext` itself that the ambient context is a
  convenience, not the guarantee.

**Process note.** This is the second defect in this work caused by assuming
AsyncLocalStorage propagation without testing it against a real database. Both
would have been caught immediately by the integration suite.

## Post-remediation defect (found in use, 2026-09-05)

**Verification lockout — introduced by finding 2's fix.** Requiring a verified
address to sign in made an existing gap severe: `issueEmailVerificationToken`
was only ever called at registration, so an account whose verification email
failed to arrive could never sign in and had no way to request another link.
This was hit immediately in local use, where `EMAIL_FROM` is Resend's sandbox
sender and can only deliver to the Resend account owner's address.

Fixed by:

- `POST /api/auth/verify-email/resend` — rate-limited on email and IP, with a
  response identical whether or not the address exists or is already verified,
  matching the password-reset endpoint's disclosure behaviour.
- A `/resend-verification` page, linked from both the sign-in error and the
  post-registration message.
- The signup page no longer reports "sign-in failed" after registering. Sign-in
  failing there is the expected path now, so it says the account was created and
  points at verification.
- `sendEmail` prints the message to the server log instead of throwing when no
  mailer is configured outside production, so a local setup cannot dead-end.
- `password-reset/request` now catches send failures. Previously an
  unconfigured mailer threw, making a 500 mean "this account exists" and a 200
  mean it does not — an enumeration oracle created by an operational fault.

**Process note.** This was predicted when the fix was written and should have
been remediated in the same change rather than flagged for later.

## Follow-up worth considering

- **Session invalidation on password reset.** The JWT strategy with a 12-hour `maxAge` means sessions issued before a reset stay valid afterwards. If reset is expected to evict an attacker, it currently does not.
- **Deleted or removed users keep working sessions.** `getSessionUserId` trusts the JWT without confirming the user still exists; membership is re-checked per request, so tenant access does revoke promptly, but authentication itself does not.
- **No test asserts the absence of `passwordHash` in responses.** The existing suite covers cross-tenant task scoping (`src/services/service-layer.test.ts:204`) but not response-shape leakage, which is why finding 1 went unnoticed.
