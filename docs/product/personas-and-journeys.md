# Personas and User Journeys

**Status:** Proposed research hypotheses

## Personas

### Workspace administrator

- **Context:** Owner, operations lead, or senior team member responsible for access.
- **Goal:** Create a controlled workspace and onboard the right people.
- **Pain:** Existing lightweight tools do not make permissions or sensitive changes sufficiently clear.
- **Success:** The team joins without support, roles are understandable, and access changes are traceable.

### Team manager

- **Context:** Coordinates work but should not control ownership-level settings.
- **Goal:** Assign, prioritize, and follow up on work.
- **Pain:** Work status is scattered or accountability is unclear.
- **Success:** Current tasks, owners, due dates, and blockers are visible in one place.

### Team member

- **Context:** Completes operational tasks and occasionally creates new ones.
- **Goal:** Know what needs attention and update it quickly.
- **Pain:** Complex project-management tools create administrative overhead.
- **Success:** Assigned work can be understood and updated with minimal navigation.

### Reviewer or business owner

- **Context:** Needs oversight but may not participate in daily task work.
- **Goal:** Verify that important actions occurred appropriately.
- **Pain:** Existing records do not clearly identify who changed what.
- **Success:** Audit history answers access and change questions without engineering support.

## Critical journeys

### Journey A: first workspace activation

1. User registers and verifies email.
2. User creates an organization and becomes admin.
3. User creates the first task.
4. User invites a teammate.
5. Teammate accepts and updates a task.

**Completion signal:** the organization has at least two members and one task mutation by the invitee within seven days.

### Journey B: manager coordinates work

1. Manager opens the organization workspace.
2. Manager filters incomplete or overdue work.
3. Manager creates or reassigns a task.
4. Assignee receives a notification.
5. Assignee updates status; manager can see the change.

### Journey C: admin changes access safely

1. Admin reviews current membership.
2. Admin changes a member role or removes access.
3. System checks the final-admin invariant.
4. User loses or gains capabilities immediately.
5. Change appears in the audit feed.

### Journey D: investigate an incident

1. Admin or manager opens audit history.
2. Reviewer filters or pages to the relevant event.
3. Reviewer identifies actor, time, action, target, and safe change metadata.
4. Reviewer escalates through the support channel if more investigation is needed.

## Research plan

Interview 10–15 participants across no more than two candidate segments. Ask them to demonstrate their present workflow rather than describe hypothetical preferences. Validate:

- How they separate clients, departments, or workspaces
- Who invites and removes people
- The last incident where access or change history mattered
- Whether all members should see all tasks
- Which notifications are essential versus noisy
- Current tool cost and switching trigger
- Willingness to trial and pay

Record evidence, contradictions, and decisions. Do not treat feature requests from one interview as roadmap commitments.
