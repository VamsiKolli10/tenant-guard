# Support Runbook

**Status:** Proposed for pilot

## Support principles

- Verify identity before discussing organization membership or user data.
- Use organization/user/resource IDs in internal investigation, not copied sensitive content.
- Never request passwords, raw invite tokens, session cookies, or full database exports.
- Do not manually bypass authorization to solve a support request.
- Record administrative changes and escalate security concerns through incident response.

## Intake information

Collect the user's account email, organization name or ID, approximate timestamp/time zone, action attempted, safe screenshot/error message, and request ID if displayed. Classify severity and data/security implications before troubleshooting.

## Common cases

### Invitation not received

1. Verify sender identity and organization role.
2. Check invitation state, expiration, revocation, email normalization, and provider delivery status.
3. Do not reveal an invitation to an unverified third party.
4. Revoke and recreate through normal product controls if appropriate.
5. Escalate repeated provider failures or abuse patterns.

### Invitation cannot be accepted

Check authenticated email match, accepted/revoked/expired state, existing membership, rate limits, and correlated logs. Never mark an invite accepted manually without reproducing the same invariants and audit behavior as the service.

### User cannot access an organization

Verify active membership using the user and organization IDs, then check session freshness and role. If membership was removed, do not restore it without an authorized admin request.

### Role or capability appears incorrect

Compare the current membership row with the accepted RBAC matrix, reproduce through the same service path, and review the role-change audit event. Treat unexpected elevated access as a security incident.

### Missing or incorrect task

Verify the organization scope before looking up the task. Review task/audit events and recent deployments. Never search across organizations and disclose the result to the requester.

### Account or organization deletion/export

Follow the approved data-request workflow. Until automated functionality exists, require documented owner authorization, a scoped export/deletion plan, peer review where possible, and confirmation of backup-retention behavior.

## Escalation

Escalate immediately for suspected cross-tenant visibility, unexplained privilege escalation, credential exposure, destructive data loss, repeated authentication abuse, or broad availability failure. Attach request IDs and timestamps, not secret values.

## Resolution record

Record problem statement, verified identity/authority, impacted organization, investigation evidence, action taken, customer response, linked defect/incident, and follow-up owner. Convert recurring cases into product fixes or documented self-service guidance.
