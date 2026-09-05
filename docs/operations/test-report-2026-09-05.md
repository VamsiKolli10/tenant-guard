# Test Report — 2026-09-05

**Build:** branch `security/review-remediation`
**Environment:** local dev server, hosted Supabase (project `Tenant Guard`), macOS, dark theme
**Method:** browser-driven smoke and regression testing against a running instance, plus API-level negative tests and direct database verification

---

## Summary

| Area | Result |
| --- | --- |
| Static checks (`tsc`, ESLint) | Pass |
| Tenant guard unit tests (24) | Pass |
| Integration suite | **Not run** — no local PostgreSQL yet |
| Smoke: core journeys | Pass |
| Security regressions (findings 1–5) | Pass, verified live |
| Validation and authorization | Pass |
| Accessibility | Pass after one fix |
| Responsive | Pass |
| Role-based access (ADMIN/MANAGER/MEMBER) | Pass — verified with real sessions |

Three defects were found and fixed during this round. Two further findings are
recorded below as open.

---

## Defects found and fixed

### 1. Hydration mismatch disabled all client interactivity — high

`WorkspaceTabs` computed the active tab from `usePathname()`. That hook is not
resolved while a layout renders on the server, so the server emitted no
`aria-current` and the client emitted one. React abandoned hydration for the
subtree and every client component below it stopped responding — the delete
confirmation did nothing when clicked.

The page looked completely correct throughout. Nothing in types, lint, or the
integration suite could detect this.

**Fixed:** `src/proxy.ts` now forwards the request path as `x-pathname`; the
layout resolves the active tab on the server and `WorkspaceTabs` is a plain
server component with no client hook. Verified: server and client markup now
agree, and all four workspace routes load with an empty console.

### 2. Duplicate records from double submission — medium

The create-organization form had no pending state. The server action takes
~2 seconds against the pooled Supabase connection, during which the page looked
inert, so a second click created a second workspace. Reproduced in real use:
two `BrandRisk` workspaces 3.3 seconds apart.

**Fixed:** a `SubmitButton` using `useFormStatus` disables itself and shows
progress; `createOrganization` additionally collapses a repeat of the same name
by the same user within 30 seconds. Verified live — the button now reads
"Creating…" and disables.

### 3. Light-mode contrast below AA — medium

The primary button rendered `#fff8f2` on `#c25529` — **4.32:1**, under the
4.5:1 required for 14px text. The same token is used for link text on the cream
surfaces, which measured 4.32 and 4.06.

**Fixed:** `--accent` darkened to `#b04a22` in the light palette (button text
5.19, links 4.89 and 5.25). Dark mode was already passing and is unchanged.

*Correction:* an earlier automated measurement in this session reported 2.6:1
for this pair. That was a bug in the measurement script's background walk-up,
not the real value. The true figure is 4.32.

### 4. Missing `main` landmark — low

Workspace and dashboard content sat in plain `div`s. **Fixed.**

---

## Open findings

### A. Registration discloses whether an account exists — medium

`POST /api/auth/register` returns **409 "Email already registered."** for a
known address. This is an enumeration oracle, and it contradicts the PRD, which
requires that "authentication errors do not reveal whether an account exists."

Password reset and verification resend are both careful here — identical bodies
for known and unknown addresses — so registration is the odd one out.

Not fixed, because the remedy is a product decision: accepting the registration
and sending a "you already have an account" email is the usual non-disclosing
pattern, but it changes the signup flow. Pre-existing, not introduced by recent
work.

### B. Timing side-channel on password reset — low

Reset for an existing address took 2455ms against 1300ms for an unknown one —
the existing path issues a token and attempts delivery. The response bodies are
identical, but the ~1.1s gap is measurable and undoes some of that care.

Mitigation would be to move delivery to a queue, or to pad the response. Note
that the sandbox mailer inflates this; with a working provider the gap narrows
but does not vanish.

---

## Verified working

### Core journeys
- Workspace creation, including the founding membership and audit row in one transaction
- Task create, inline status change, delete with confirmation
- Success and error notices render and are announced
- Empty states distinguish "no tasks yet" from "no matches"

### Destructive actions
- Confirmation is `role="alertdialog"`, names the target (`Delete "SMOKE-1 verify audit trail"?`), moves focus to the confirm button
- Cancel restores the trigger; Escape dismisses
  *(verified with a synthetic key event — the automation harness swallows real Escape presses)*

### Security regressions
| Finding | Check | Result |
| --- | --- | --- |
| 1 — password hash exposure | `GET /members` user objects | `id`, `name`, `email` only |
| 2 — verification gate | sign-in and invite acceptance while unverified | refused |
| 3 — tenant isolation | org B's task id under org A's scope | 404, not leaked |
| 3 — membership | org the caller is not in | 403 |
| 4 — token hash exposure | invite create, list, revoke | absent from all three |
| 5 — append-only audit | `UPDATE`/`DELETE` on `"AuditLog"` | both rejected, SQLSTATE 23001 |
| 5 — request context | `ip` and `userAgent` on audit rows | populated (`::1`) |

### Validation
Short title, over-long title, invalid status, invalid priority, invalid role,
and malformed JSON all return 400 with a generic message. Assigning a task to a
non-member returns 403 "Assignee must be an organization member."

### Authentication
All nine API endpoints return 401 without a session.

### Lists
- Pagination: 24 tasks across 2 pages, page 3 empty with correct totals, `limit=500` clamped to 50
- Search case-insensitive; status, assignee (`me` / `unassigned`), and the `open`→`TODO` alias all correct
- Audit cursor paging: no overlap between pages, newest-first, `limit=999` rejected

### Accessibility
Every input labelled, headings ordered, all controls have accessible names,
landmarks present, no touch target under 24px, no horizontal scroll at 375px.
Dark-mode contrast passes AA throughout (lowest measured 6.25).

---

## Round 3 — role-based access control

Three real accounts now exist in `SMOKE-Alpha`: an ADMIN, a MANAGER, and a
MEMBER, all verified. Invite acceptance was performed by the account owner and
recorded correctly (`org.invite.accepted`, 08:59:01, with IP captured) —
independent confirmation that the `prismaUnscoped` fix works.

### ADMIN — verified

| Check | Result |
| --- | --- |
| Demote the final admin | 403 "The final admin cannot be demoted." |
| Remove the final admin | 403 "The final admin cannot be removed." |
| Change another member's role | 200, both directions |
| Assign a task to a non-member (real user, no membership) | 403 "Assignee must be an organization member." |
| Invite an ADMIN | 201, role ADMIN |
| Revoke that invitation | 200 |

The **last-admin invariant is now verified for the first time**. It is a PRD
requirement that had never been exercised, because until now no workspace had
more than one member.

Audit metadata for role changes records `priorRole`, `newRole`, and
`memberUserId` as the PRD's event catalogue requires. Invitation events record
role and email. Roles were restored to their original values after testing.

### MEMBER — verified under a temporarily flipped role

Run earlier by setting the ADMIN's own membership to MEMBER, then restoring it.
API: members, invitations, and audit all 403; invitation creation 403; task
creation 201; full edit of a self-created task 200; deletion 403 for both own
and others' tasks; self-promotion to ADMIN, self-removal, and invite revocation
all 403. UI: only the Tasks tab renders, no delete controls, no assignee
control, and the three gated routes explain rather than crash.

### MANAGER — verified with a real session

| Check | Result |
| --- | --- |
| View members / audit / invitations | 200 |
| Invite a MEMBER, invite a MANAGER | 201 each |
| Invite an ADMIN | **403 "Only admins can invite admins."** |
| Change a member's role | **403** |
| Demote the admin | **403** |
| Remove a member | **403** |
| Update, reassign, delete another user's task | 200 each |

UI: all four tabs render; the Members page shows the roster with no role selects
and no remove buttons; the invitation role dropdown offers only MANAGER and
MEMBER. The interface hides precisely what the server refuses.

### MEMBER — verified with a real session

| Check | Result |
| --- | --- |
| Members / audit endpoints | 403 each |
| Update a task neither created nor assigned | 403 "Not allowed to update this task." |
| Delete any task, including their own | 403 "Not allowed to delete tasks." |
| Create a task | 201 |
| On a task they created: title, priority, reassignment | 200 each |

UI: badge reads Member, only the Tasks tab renders, no delete controls, no
assignee control on the create form.

### Finding 7 — verified

Setup: `SMOKE-A1`, created by the admin, assigned to the member.

| Field changed by the assignee | Result |
| --- | --- |
| `status` | 200 |
| `priority` | 200 |
| `title` | 403 |
| `assignedToUserId` | 403 |
| `description` | 403 |
| `dueDate` | 403 |
| `status` **and** `title` together | 403 — rejected whole |
| delete | 403 |

The mixed request is the important one: submitting a permitted field alongside a
forbidden one is refused in its entirety rather than partially applied. Database
inspection afterwards confirms no partial write — the title, description, and
due date were untouched, while the two legitimately changed fields retained
their new values.

The rule is therefore exactly as intended: a member may advance work assigned to
them, but may not re-plan or re-route it, and keeps full authority over anything
they created themselves.

## Not tested

**Role-based access control.** Everything involving a MEMBER or MANAGER account
is untested: member field restrictions (finding 7), manager invite limits, the
last-admin invariant under real conditions, and tab visibility by role. This
needs a second verified account, which requires completing a sign-up flow.

This is the largest remaining gap. The integration suite covers this ground at
the service layer — running it is the cheapest way to close it.

**Integration suite.** Blocked on a local PostgreSQL. Setup is in
`docs/operations/testing.md`. The runner now replays migrations rather than
using `db push`, so the audit trigger is present in the test database.

---

## Round 4 — after the gaps batch

Re-ran the security and role regressions, and verified the four changes from
`docs/product/gaps.md`.

### Verified

| Area | Result |
| --- | --- |
| Finding 1 — member API | user objects are `id, name, email` only |
| Finding 4 — invitations | no `tokenHash` in list or revoke |
| Finding 3 — cross-org task by id | 404 |
| Finding 3 — non-member organization | 403 |
| Last-admin invariant | demote and remove both 403 |
| Assignee guard | 403 for a real user with no membership |
| Unauthenticated access | 401 |
| Validation | short title, bad status both 400; unknown `sort` ignored |
| Audit paging | no overlap, `limit=999` rejected |
| Audit request context | ip populated on 8 of 8 recent events |
| Audit role metadata | `priorRole`, `newRole`, `memberUserId` present |
| Append-only trigger | UPDATE rejected, SQLSTATE 23001 |
| `main` landmark | present on all six routes |
| Timezone | dates render localised from a full ISO `datetime` attribute |
| Due-date badges | overdue / today / tomorrow / in N days, none beyond a week |
| Due-date sorting | correct ascending order, nulls last |
| Account settings | whitespace and over-long names 400; wrong current password 403; short new password 400; unauthenticated 401; valid update 200 |

### Open defect — intermittent hydration stall on workspace routes

**Symptom.** On `/orgs/[orgId]` and its sub-routes, the page segment sometimes
never hydrates: the layout hydrates (39 elements — header and tabs), the page
content does not (0 of ~300–430), and the `loading.tsx` fallback stays in the
DOM. Observed persisting beyond 90 seconds across repeated navigations.

**Impact when it occurs.** Every client component inside the segment is inert —
delete confirmations, submit pending states, the invite panel. The page looks
completely normal, which is what makes it dangerous.

**Isolated to the Suspense boundary, not the date component.** `/dashboard`
uses the same `FormattedDate` client component and hydrates fully every time
(46 of 82 elements, localised output). The difference is that the workspace
segment has a `loading.tsx`, which wraps it in a Suspense boundary. The RSC
stream completes cleanly (127 KB, ~2.9 s, well-formed tail) and the console
shows no hydration errors.

**It is intermittent.** The same route hydrated instantly earlier in the same
session, with all client behaviour working. Something about ordering or timing
decides it.

**Unknown: whether this is dev-only.** Turbopack's dev server recompiles per
route and the workspace payload is large (233–387 KB of HTML). A production
build may not reproduce it. This has not been tested, because `next build`
cannot run in the review environment.

**Next steps, in order:**

1. Run `npm run build && npm start` and retry the workspace routes. If
   hydration is reliable there, this is a dev-only annoyance.
2. If it reproduces in production, temporarily remove
   `src/app/orgs/[orgId]/loading.tsx` and retest. That isolates the Suspense
   boundary as the cause.
3. If removing it fixes the problem, replace the route-level fallback with
   per-section Suspense inside the page, so the PRD's loading-state requirement
   is still met without one boundary owning the whole segment.

## Performance note

Workspace page render takes ~2.5s server-side against the pooled Supabase
connection, and the page is not interactive for several seconds in dev. Each
route issues several sequential queries and the pooler adds round-trip latency.
Worth measuring against a production build before drawing conclusions, but the
2.5s server figure is real and is what made the double-submit defect so easy to
trigger.
