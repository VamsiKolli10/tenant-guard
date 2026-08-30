# Database Setup

**Status:** Implemented initial schema; deployment target is PostgreSQL/Supabase

## Source of truth

`prisma/schema.prisma` is the application data-model source of truth. Checked-in SQL under `prisma/migrations` is the database migration history. Do not maintain a separate hand-edited Supabase schema for the same tables.

The initial migration creates:

- `User`
- `Organization`
- `Membership`
- `Invitation`
- `Task`
- `AuditLog`
- `Role`, `TaskStatus`, and `TaskPriority` PostgreSQL enums
- Tenant-oriented indexes, uniqueness constraints, and foreign keys

## Local PostgreSQL

Set a development connection string in `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tenant_guard
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/tenant_guard
```

Apply migrations:

```bash
npx prisma migrate dev
```

For CI and production, use:

```bash
npx prisma migrate deploy
```

Do not use `prisma db push` for production because it does not provide reviewed migration history.

## Supabase PostgreSQL

The Tenant Guard Supabase project reference is `qtojzeemeqcrbhjwkilg`. Store the database password only in local/hosting secret configuration. Prisma uses the transaction pooler for application traffic and the session pooler for migrations:

```env
DATABASE_URL="postgresql://postgres.qtojzeemeqcrbhjwkilg:YOUR_URL_ENCODED_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.qtojzeemeqcrbhjwkilg:YOUR_URL_ENCODED_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

Then apply the checked-in migration using `npx prisma migrate deploy` from a trusted deployment environment. The SQL migration can also be reviewed in the Supabase SQL editor, but Prisma should remain responsible for recording and applying migration history.

If the password contains reserved URL characters, URL-encode it before placing it in the connection strings. Never commit `.env`. The session pooler is used here for migration connectivity over IPv4; the transaction pooler is used for short-lived application traffic.

## Authentication boundary

This schema continues to use the application's `User` table and NextAuth credentials flow. It does not integrate `auth.users` from Supabase Auth. Supabase is initially acting as managed PostgreSQL only. Migrating authentication is a separate design change because it affects user IDs, sessions, password ownership, registration, and existing relations.

## Row-level security

RLS is intentionally not enabled by the initial migration. The application currently connects through Prisma and enforces membership in application services. Enabling RLS without transaction-local organization context and compatible pooling would block valid operations or create misleading protection.

Before enabling RLS:

1. Select the production connection/pooling model.
2. Prototype organization context inside a Prisma transaction.
3. Create a restricted runtime database role distinct from the migration role.
4. Add policies and integration tests for correct, missing, and malicious tenant context.
5. Verify background jobs and administrative operations explicitly.

## Verification

After migration:

```bash
npx prisma validate
npx prisma generate
npm test
```

Use a dedicated test database. Never point the test runner at a Supabase production database.
