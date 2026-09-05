# Smoke Test

**Status:** Accepted
**Last updated:** 2026-09-05
**Run against:** a running instance, before merging anything touching the UI, auth, or the request path

Roughly fifteen minutes by hand. Each step lists what to do and what must be
true — a step that renders but misbehaves silently is a failure, so several
checks are on the response or the database rather than the screen.

Use a disposable database, or prefix everything you create with `SMOKE-` and
clean up afterwards with the SQL at the end.

## 0. Preconditions

- [ ] `npx prisma migrate deploy` reports the schema is up to date
- [ ] Server starts with no errors and the browser console is clean on first load
- [ ] **Console shows no hydration warnings.** A hydration mismatch disables
      client interactivity below the mismatch, and the page still looks correct

## 1. Registration and verification

- [ ] Register a new account. The page confirms creation and says to check email
- [ ] It does **not** say "sign-in failed" — that path is expected, not an error
- [ ] Sign-in with the unverified account is refused, and the message names
      verification rather than "invalid password"
- [ ] "Send a new verification link" reaches the resend page
- [ ] With no mailer configured, the verification link is printed to the server log
- [ ] Verify via that link, then sign in successfully

## 2. Workspace creation

- [ ] Create a workspace. The button shows a pending state and disables itself
- [ ] You land in the workspace as **Admin**
- [ ] Submitting the same name twice in quick succession creates **one**
      workspace, not two
- [ ] Audit shows `Workspace created`

## 3. Tasks

- [ ] Create a task; a success notice appears and the count increments
- [ ] Status and priority render as labelled badges, not colour alone
- [ ] Change status inline; the badge updates and a notice confirms
- [ ] Filters work: status, assignee, search, date range
- [ ] Clearing filters restores the full list, and the empty state distinguishes
      "no tasks yet" from "no matches"
- [ ] Pagination appears past one page and Previous/Next both work

## 4. Destructive actions

- [ ] Delete asks for confirmation naming the task, rather than deleting immediately
- [ ] Cancel aborts; Escape also aborts
- [ ] Confirm deletes, and audit records `Task deleted`

## 5. Invitations

- [ ] Create an email invitation; it appears as **Pending**
- [ ] Create a link-only invitation; the UI warns that anyone holding the link can join
- [ ] The invite link is shown once and can be copied
- [ ] **No `tokenHash` appears in any response** — check the network tab for
      create, list, and revoke
- [ ] Revoke moves it to **Revoked** and audit records it
- [ ] Accepting an invitation with an unverified account is refused

## 6. Roles and authorization

Needs a second account. This is the section most worth not skipping.

- [ ] A MEMBER sees only the Tasks tab — no Members, Invitations, or Audit
- [ ] A MEMBER visiting `/members`, `/invitations`, `/audit` directly gets an
      explanation, not a crash or a silent redirect
- [ ] A MEMBER assigned a task can change status and priority
- [ ] A MEMBER **cannot** reassign or retitle a task assigned to them
- [ ] A MEMBER can fully edit a task they created
- [ ] A MANAGER can view members but not change roles
- [ ] A MANAGER cannot invite an ADMIN
- [ ] The final ADMIN cannot be demoted or removed, and the UI explains why

## 7. Tenant isolation

The property the product exists for. Verify by request, not by clicking.

- [ ] `GET /api/orgs/<orgA>/tasks/<taskIdFromOrgB>` returns **404**, not the task
- [ ] `GET /api/orgs/<orgYouAreNotIn>/tasks` returns **403**
- [ ] `GET /api/orgs/<org>/members` contains no `passwordHash` and no
      `emailVerifiedAt`; user objects carry only `id`, `name`, `email`

## 8. Audit trail

- [ ] Every action above appears, newest first
- [ ] Actor names resolve; `ip` and `userAgent` are populated
- [ ] Metadata shows safe context only — no tokens, no password material
- [ ] "Load older events" pages correctly and "Back to newest" returns
- [ ] A MEMBER cannot reach the audit feed

## 9. Accessibility and presentation

- [ ] Every control is reachable by keyboard, with a visible focus ring
- [ ] The confirmation dialog is announced and takes focus
- [ ] Errors are announced (`role="alert"`), successes politely
- [ ] Both light and dark themes are legible — switch the OS setting
- [ ] Nothing scrolls horizontally at a 375px viewport

## Cleanup

```sql
-- The append-only trigger blocks audit deletes by design, so this must be run
-- by the table owner, never the application role.
begin;
alter table "AuditLog" disable trigger "audit_log_append_only_guard";
delete from "AuditLog"    where "orgId" in (select id from "Organization" where name like 'SMOKE-%');
delete from "Task"        where "orgId" in (select id from "Organization" where name like 'SMOKE-%');
delete from "Invitation"  where "orgId" in (select id from "Organization" where name like 'SMOKE-%');
delete from "Membership"  where "orgId" in (select id from "Organization" where name like 'SMOKE-%');
delete from "Organization" where name like 'SMOKE-%';
alter table "AuditLog" enable trigger "audit_log_append_only_guard";
commit;
```
