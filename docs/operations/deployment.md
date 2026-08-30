# Deployment and Environment Guide

**Status:** Proposed target process

## Environments

| Environment | Purpose | Database |
| --- | --- | --- |
| Local | Developer iteration | Local disposable development DB |
| Test | Automated integration tests | Dedicated disposable test DB only |
| Preview | Pull-request UI/smoke testing | Isolated or safely seeded preview DB |
| Staging | Production-like release and migration rehearsal | Dedicated staging DB |
| Production | Customer workload | Managed production DB with PITR |

No environment shares a database or secrets with production. The test runner must retain its protection against resetting a database that does not look like a test database.

## Required configuration

- Database URL and pool settings
- Authentication/session secret and canonical application URL
- Transactional email credentials and sender configuration
- Monitoring/logging DSNs or API keys
- Rate-limit/queue configuration when introduced

Secrets belong in the hosting provider's secret manager. They must not be committed, printed, copied into analytics, or exposed through `NEXT_PUBLIC_*` variables.

## CI gates

1. Reproducible dependency install
2. Lint and TypeScript/build checks
3. Prisma schema validation and migration checks
4. Unit and database integration tests
5. Critical Playwright smoke tests against preview/staging
6. Dependency and secret scan

## Release procedure

1. Confirm CI and review approval.
2. Review schema changes, estimated locks/runtime, and rollback or forward-fix plan.
3. Verify current backup/PITR health.
4. Rehearse migrations in staging with production-like data volume when relevant.
5. Deploy compatible schema changes, then application code.
6. Run sign-in, organization, task, invitation, and authorization smoke tests.
7. Observe errors, latency, jobs, and database health through the defined monitoring window.
8. Record release version, migration, owner, and known issues.

## Rollback

Application rollback must not assume that destructive schema migrations can be reversed. Use expand/contract migrations so the previous application remains compatible. Prefer a forward fix when data transformations make rollback unsafe. Escalate to the incident plan if security or data integrity is at risk.

## Production access

Use individual named accounts, multi-factor authentication, least privilege, and an auditable access path. Avoid routine manual database edits. Emergency changes require a recorded reason, peer review when possible, verification, and an audit note.
