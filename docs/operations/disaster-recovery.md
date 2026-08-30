# Disaster Recovery Plan

**Status:** Proposed; values require provider validation

## Objectives

- **Proposed RPO:** 15 minutes maximum data loss for production.
- **Proposed RTO:** 4 hours to restore core service for the private pilot.

These are internal targets. Do not publish them as contractual guarantees until infrastructure and restore exercises demonstrate them consistently.

## Covered scenarios

- Accidental deletion or bad migration
- Database corruption or managed-provider failure
- Application deployment causing destructive writes
- Credential or operator compromise
- Region/provider outage

## Backup requirements

- Managed PostgreSQL point-in-time recovery and automated snapshots
- Encryption at rest and in transit
- Backup access separated from normal application credentials
- Retention verified against data policy
- Provider status and backup failures monitored

The current Supabase Free plan does not include automatic backups or PITR. Run
`npm run db:backup` to create a verified, ignored PostgreSQL custom-format dump
under `backups/`. Copy important backups to encrypted off-site storage; a file
remaining only on the development laptop is not a sufficient disaster-recovery
copy.

## Restore procedure

1. Declare an incident and stop destructive writers/jobs if necessary.
2. Identify the last known good time and expected data-loss window.
3. Restore into a new isolated database; never overwrite the only remaining copy.
4. Validate schema/migrations, row counts, tenant samples, membership, tasks, and audit continuity.
5. Point staging or a controlled application instance at the restored database and run critical smoke tests.
6. Obtain incident-commander approval, switch production safely, and monitor.
7. Reconcile jobs/external effects and communicate confirmed impact.

## Restore exercise

Perform at least quarterly and after material database/provider changes. Record backup timestamp, restore duration, achieved RPO/RTO, validation results, failures, and corrective actions.

## Application continuity

Source code and infrastructure configuration must be recoverable from version control. Document DNS, hosting, database, email, monitoring, and secret-management ownership. Maintain a current inventory of credentials that would need rotation after compromise.
