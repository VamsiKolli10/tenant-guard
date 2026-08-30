# Data Classification and Retention

**Status:** Proposed; obtain legal review before public commercial launch

## Classification levels

| Level | Description | Examples | Handling |
| --- | --- | --- | --- |
| Public | Intended for public disclosure | Marketing copy, public documentation | Normal integrity controls |
| Internal | Operational but not sensitive | Feature flags, aggregate metrics | Authenticated staff access |
| Confidential | Customer or user information | Emails, names, tasks, memberships, audit events | Tenant scope, encryption, access logs, limited processors |
| Restricted | Credentials or high-impact secrets | Password hashes, session secrets, invite tokens, provider/API credentials | Never analytics/audit logs; least privilege; managed secrets; rotation |

## Data inventory

| Data | Class | Source | Purpose | Proposed retention |
| --- | --- | --- | --- | --- |
| User email/name | Confidential | User | Identity, invitation, communication | Account lifetime plus defined deletion window |
| Password hash | Restricted | Derived | Credentials authentication | Until password/account replacement or deletion |
| Organization/membership | Confidential | Users/admins | Tenant access control | Organization lifetime plus defined recovery window |
| Task content | Confidential | Users | Work coordination | Organization lifetime unless customer deletes it |
| Audit events | Confidential | System | Security/accountability | Default 12 months; validate customer/legal need |
| Invite token hash | Restricted | System | One-time onboarding | Delete or archive after expiry plus short abuse-investigation window |
| IP/user agent | Confidential | Request | Security investigation | Short period such as 30–90 days, based on documented need |
| Product analytics | Internal/confidential | System | Product improvement | Aggregate/minimize; define provider retention |
| Logs/traces | Internal/confidential | System | Reliability/security | 30 days by default; redact sensitive fields |
| Backups | Confidential/restricted mix | System | Recovery | Per backup/PITR policy; encrypted and access-restricted |

Retention values are starting proposals. Final periods must account for customer commitments, applicable law, cost, and incident-response needs.

## Handling requirements

- Encrypt transport with HTTPS and rely on managed storage encryption at rest.
- Do not store raw invitation tokens; do not log passwords, tokens, cookies, or credentials.
- Limit production access to named operators and record administrative access.
- Maintain a subprocessor list for hosting, database, email, monitoring, and analytics vendors.
- Provide user/account export and deletion processes before public launch.
- Ensure deletion propagates to primary storage promptly and backups expire according to policy.
- Review new free-text fields because users may place personal or sensitive information in them.

## Data-subject/customer request workflow

1. Verify requester identity and authority for the organization.
2. Record request type, scope, and deadline without copying unnecessary data.
3. Export, correct, or delete through an approved tool/runbook.
4. Confirm completion and record exceptions or backup-expiry behavior.
5. Audit the administrative action without including the exported/deleted content.
