# Product Gaps

**Status:** Proposed — input to `roadmap.md`, not a commitment
**Date:** 2026-09-05
**Basis:** Hands-on use of the running application during the 2026-09-05 test rounds, read against `prd.md`, `personas-and-journeys.md`, and the implementation

Every item below was either encountered while actually using the product or is
required by a journey the product documents. Nothing here is a generic feature
suggestion; where an item traces to a persona or journey, that trace is named.

Items the PRD deliberately excludes — project planning, time tracking, chat,
document editing, native mobile, custom roles, SSO/SCIM, billing — are not
listed. Those are decisions, not gaps.

---

## 1. Correctness defects

These produce wrong behaviour rather than missing behaviour, and both are small.

### 1.1 All dates render in the server's timezone — high

Every date in the application is formatted inside a server component:
`task.dueDate.toLocaleDateString()`, `entry.createdAt.toLocaleString()`,
`org.createdAt.toLocaleDateString()`. Server components format using the
*server's* locale and timezone, not the viewer's.

In development the server is the developer's own machine, so this looks correct
and is easy to miss — it did look correct throughout testing. Deployed to a
host running UTC, every user in every timezone will see UTC timestamps.

This matters more here than in most products. The audit trail exists to answer
"who did what, when"; a reviewer in Los Angeles reading a UTC timestamp with no
indication that it is UTC will draw wrong conclusions about sequence and timing.

**Fix:** pass ISO strings to the client and format in the browser, or render
`<time dateTime={iso}>` and format client-side. Blocks: Journey D.

### 1.2 A password reset does not end existing sessions — medium

Sessions are JWTs with a twelve-hour lifetime and no server-side revocation. A
user who resets their password because they believe they are compromised leaves
the attacker's session working for up to twelve hours.

Already recorded in the security review's follow-ups; repeated here because it
is a user-facing safety expectation, not only a technical note. Most people
assume a password change logs everyone else out.

**Fix:** a `sessionsValidAfter` timestamp on the user, checked in the JWT
callback, or a switch to database sessions.

---

## 2. Promised by the documentation, absent from the product

### 2.1 No notifications of any kind — high

`personas-and-journeys.md`, Journey B, step 4: *"Assignee receives a
notification."* Nothing exists.

Observed directly: three tasks were assigned to a manager during testing, and
that account had no way to learn of it other than opening the workspace and
looking. The same is true of being invited, having your role changed, or being
removed.

Without this the product is a shared list that people must remember to check,
rather than something that coordinates work. It is the single largest functional
gap.

**Minimum viable version:** transactional email on assignment, on invitation,
and on role change. The mailer, the templates pattern, and the audit events that
would trigger them all already exist.

Blocks: Journey B, Team Manager and Team Member personas.

### 2.2 No cross-workspace view of your own work — high

The dashboard lists workspaces. Every task view is scoped to one workspace. A
person who belongs to three workspaces has no single answer to "what needs me
today"; they must open each workspace and filter to "Me" in turn.

The Team Member persona is defined by wanting exactly this: *"know what needs
attention and update it quickly"*, with success measured as *"assigned work can
be understood and updated with minimal navigation."* Today that journey has the
most navigation in the product.

**Fix:** a "My tasks" view on the dashboard, querying tasks assigned to the user
across the organizations they belong to. Note this deliberately crosses tenant
boundaries in one direction — it must be scoped by membership, and is a good
test of the tenant guard rather than a reason to avoid the feature.

### 2.3 Due dates carry no urgency, and lists cannot be sorted — medium

`dueDate` exists on the schema with an index. The UI prints it as plain text.
Nothing marks a task overdue or due soon, and there is no sort control anywhere
— every list is newest-created first.

The Team Manager persona is described as needing *"current tasks, owners, due
dates, and blockers visible in one place."* Two of those three signals are
present but inert, and the third (blockers) has no representation at all.

**Fix:** overdue and due-soon styling on the task row, and a sort control for
due date, priority, and created date. The filters already accept a date range
and a `dateField`, so the query support is largely there.

### 2.4 Audit history cannot be filtered or searched — medium

`personas-and-journeys.md`, Journey D, step 2: *"Reviewer filters or pages to
the relevant event."* Only paging exists.

Investigating a specific incident today means clicking "Load older events"
repeatedly through every task creation in the workspace. During testing, 24
routine task events buried the access-related events that a reviewer would
actually be looking for.

**Fix:** filter by action type, actor, and date range. The service already takes
a `where` clause; the UI is the missing half. Consider grouping access events
(invitations, role changes, removals) separately from task activity, since they
are what the Reviewer persona comes for.

Blocks: Journey D, Reviewer persona.

---

## 3. Things users cannot fix about themselves

Individually small, collectively the difference between a product and a demo.

- **No profile editing.** Display name is captured at signup and never again.
  Two of the test accounts show raw email addresses in every task list and
  member roster because the name field was left blank, and there is no way to
  correct that.
- **No password change while signed in.** Only the forgot-password flow exists,
  which requires signing out and receiving an email.
- **No way to correct a mistyped email.** A typo at signup produces an account
  that can never be verified, can never sign in, and cannot be edited or
  deleted. The user's only recourse is registering again — and the original row
  holds that address forever, so a later correct signup with the intended
  address still works, but the orphan persists.

---

## 4. PRD open decisions that surfaced in practice

`prd.md` lists these as undecided. Each one was hit during ordinary use, which
suggests they are not hypothetical.

**Organization deletion and renaming.** A duplicate workspace was created by a
double-click early in testing. It cannot be deleted or even renamed through the
application. Deletion is additionally constrained by the append-only audit
trigger, which correctly refuses to let audit rows be removed — so organization
deletion needs a deliberate design (archive rather than delete is the obvious
candidate, and preserves the audit guarantee).

**Member departure.** A member cannot leave a workspace. Only an admin can
remove them. Someone who joins the wrong workspace, or leaves a company, depends
entirely on an admin noticing.

**Task ownership transfer.** When an admin removes a member, that member's
assigned tasks are silently set to unassigned. No prompt, no reassignment step,
and no audit metadata recording which tasks were orphaned. Work quietly loses
its owner at exactly the moment someone leaves.

---

## 5. One design question to decide deliberately

A MEMBER cannot see the member roster, and the create-task form hides the
assignee control from them entirely. The consequence is that a member can create
work but cannot hand it to a colleague, or even discover who their colleagues
are.

This may well be intentional — it follows from treating the roster as
administrative information. But it is currently a side effect of the permission
model rather than a stated decision, and it is a daily friction for the persona
who uses the product most.

The options are roughly: leave it as is and document the reasoning; let members
see names and assign within their workspace while keeping emails and roles
administrative; or introduce a per-workspace setting. Worth deciding explicitly
rather than by default.

---

## Addressed on 2026-09-05

| Item | Status |
| --- | --- |
| 1.1 Timezone rendering | Fixed — `FormattedDate` renders in the viewer's timezone |
| 1.2 Session invalidation on reset | Fixed — `sessionsValidAfter` enforced in the JWT callback |
| 2.3 Due-date urgency and sorting | Fixed — overdue/due-soon badges and a sort control |
| 3 Profile and password self-service | Fixed — `/settings` |

Remaining: 2.1 notifications, 2.2 cross-workspace "My tasks", 2.4 audit
filtering, 4 departure and ownership transfer, 5 the roster-visibility decision.

## Suggested order

| # | Item | Effort | Why first |
| --- | --- | --- | --- |
| 1 | 1.1 Timezone rendering | Small | Silently corrupts the audit trail, the product's differentiator |
| 2 | 2.1 Assignment and invitation emails | Medium | Journey B does not function without it |
| 3 | 2.2 Cross-workspace "My tasks" | Medium | The primary persona's main journey |
| 4 | 1.2 Session invalidation on reset | Small | Security expectation users already assume holds |
| 5 | 2.4 Audit filtering | Medium | Journey D is unusable at realistic volumes |
| 6 | 2.3 Due-date urgency and sorting | Small | Data already exists and is inert |
| 7 | 3 Profile and password self-service | Small | Cheap, visible, removes obvious rough edges |
| 8 | 4 Departure and ownership transfer | Medium | Needs design, not just code |
| 9 | 5 Member roster visibility | Decision | Costs nothing to decide, changes daily feel |

Items 1, 4, 6, and 7 are all small and together would remove most of what makes
the application feel unfinished in ordinary use.
