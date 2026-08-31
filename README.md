# Tenant Guard

Tenant Guard is a small, security-focused multi-tenant task-management application. It is designed as a practical SaaS reference project: users belong to organizations, every organization is a tenant boundary, permissions are role-based, and sensitive actions are recorded in an append-only audit log.

This is currently a personal project and MVP work in progress. It is suitable for local development and controlled pilots; production readiness still requires the deployment, monitoring, backup, and operational work described in [`docs/product/roadmap.md`](docs/product/roadmap.md).

Tenant Guard is a multi-tenant task management MVP built around tenant isolation, role-based access control, invite-based onboarding, and an append-only audit trail. It is a practical reference app for SaaS-style organization workspaces where every request must be scoped to the correct tenant before data is read or changed.

## Product flow

1. A user signs up or signs in with email and password.
2. The user creates an organization and becomes its `ADMIN`.
3. Admins and managers invite teammates by email or shareable invite link.
4. Members collaborate on tasks inside the organization.
5. Sensitive actions are written to the audit log for accountability.

## Features

Tenant Guard models a common B2B SaaS permission problem: one application serves many organizations, but users should only see and mutate data for organizations where they have a membership.

- Email/password authentication with NextAuth credentials and JWT sessions.
- Email verification and password recovery flows.
- Organizations and memberships with `ADMIN`, `MANAGER`, and `MEMBER` roles.
- Hashed, expiring, revocable invitation tokens.
- Task creation, filtering, pagination, assignment, status, priority, and due dates.
- Tenant-aware service-layer authorization.
- Append-only audit events for sensitive actions.
- PostgreSQL persistence through Prisma.
- Unit and database-backed service tests.
- GitHub Actions CI configuration.

## Tech stack

Next.js App Router · React · TypeScript · NextAuth · Prisma · PostgreSQL · Tailwind CSS · Vitest · Resend

## Local development

### Prerequisites

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Set a random `NEXTAUTH_SECRET` and local database URLs in `.env`.

### Demo data

Set `DEMO_EMAIL`, `DEMO_PASSWORD`, and `DEMO_ORG_NAME` in `.env`, then run:

```bash
npm run seed:demo
```

The seed script refuses the default demo password unless `ALLOW_DEMO_SEED=true` is explicitly set. Never use demo credentials in a shared or production environment.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npm run build` | Create a production build |
| `npm test` | Reset the dedicated test database and run Vitest |
| `npm run test:unit` | Run Vitest without resetting the database |
| `npx prisma validate` | Validate the Prisma schema |
| `npx prisma studio` | Inspect local database records |
| `npm run db:backup` | Create a local database backup |

### Running tests

Tests use `TEST_DATABASE_URL` and reset that database before execution. Create `.env.test` from `.env.test.example` and point it only at a disposable test database:

```bash
cp .env.test.example .env.test
npm test
```

The test runner refuses to reset a database whose URL does not look like a test database unless `ALLOW_UNSAFE_TEST_DB=true` is set. Do not use that override against shared or production data.

## Authorization model

All organization data must be accessed through a tenant-aware service path. The high-level permissions are:

| Capability | Admin | Manager | Member |
| --- | ---: | ---: | ---: |
| View and create tasks | Yes | Yes | Yes |
| Update any task | Yes | Yes | No |
| Update own or assigned task | Yes | Yes | Yes |
| Delete tasks | Yes | Yes | No |
| View members | Yes | Yes | No |
| Create invitations | Yes | Yes | No |
| Invite managers | Yes | Yes | No |
| Invite administrators | Yes | No | No |
| Change member roles | Yes | No | No |
| Read audit events | Yes | Yes | No |

See [`docs/architecture/tenancy-and-rbac.md`](docs/architecture/tenancy-and-rbac.md) before changing authorization behavior.

## Project structure

```text
src/app/                 Pages and API route handlers
src/components/          Reusable UI components
src/services/            Tenant-aware application services
src/server/              Auth, database, RBAC, logging, and server services
prisma/                  Schema and checked-in migrations
scripts/                 Test, seed, and backup utilities
docs/                    Product, architecture, security, and operations docs
```

## Deployment notes

Use `npx prisma migrate deploy` for staging and production. Do not use `prisma db push` against a production database. Keep test, preview, staging, and production databases and secrets separate.

Before onboarding external users, complete the work in [`docs/operations/deployment.md`](docs/operations/deployment.md) and [`docs/product/roadmap.md`](docs/product/roadmap.md).

## Documentation

Start with [`docs/README.md`](docs/README.md), then consult the product, architecture, security, and operations guides there.

## Contributing and security

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development checklist. Report security issues privately according to [`SECURITY.md`](SECURITY.md).

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE).

<!-- The detailed API, data model, and RBAC reference remains in docs/ for maintainers. -->

<!--
Additional reference detail is retained below for maintainers.
-->

- Email/password authentication with NextAuth credentials and JWT sessions.
- Organization creation and membership management.
- Invite creation, revocation, and acceptance using hashed invite tokens.
- Three roles: `ADMIN`, `MANAGER`, and `MEMBER`.
- Task creation, listing, filtering, updating, and deletion.
- Task status and priority fields.
- Audit events for important organization, invite, membership, and task actions.
- Service-layer tests that verify tenancy and permission behavior.
- GitHub Actions CI with linting, Prisma validation, and tests.

## User-facing pages

| Route | Purpose |
| --- | --- |
| `/` | Marketing/home page with auth-aware links. |
| `/signup` | Create an account. |
| `/signin` | Sign in with email/password. |
| `/dashboard` | List the current user's organizations and create a new organization. |
| `/orgs/:orgId` | Main workspace for tasks, invites, members, and role management. |
| `/invite/:token` | Accept an invitation after signing in. |

## Main workspace behavior

Inside an organization page, users can:

- View tasks scoped to that organization.
- Filter tasks by search text, status, assignee, and date range.
- Create tasks with title, description, status, priority, and optional assignee.
- See members if they are an admin or manager.
- Create invite links if they are an admin or manager.
- Change member roles if they are an admin.

Members have a narrower view. They can create tasks and update tasks they created or are assigned to, but they cannot invite users, view the full member roster, change roles, or delete tasks.

## Tech stack

- Next.js App Router
- React
- TypeScript
- NextAuth credentials provider with JWT sessions
- Prisma
- PostgreSQL
- Tailwind CSS v4
- Vitest
- GitHub Actions

## Architecture

Tenant Guard keeps tenant and permission checks out of route handlers as much as possible. Route handlers and server components call application services, and those services call lower-level database services only after membership or role checks pass.

```mermaid
flowchart LR
  User[User] --> UI[Next.js pages and components]
  UI --> Auth[NextAuth session]
  UI --> Routes[Route handlers / server actions]
  Routes --> AppServices[Application services]
  AppServices --> Tenancy[Membership and role checks]
  Tenancy --> DbServices[Database services]
  DbServices --> Prisma[Prisma Client]
  Prisma --> Postgres[(PostgreSQL)]
  DbServices --> Audit[Audit log writer]
  Audit --> Postgres
```

Key directories:

| Path | Responsibility |
| --- | --- |
| `src/app` | Next.js pages, layouts, server actions, and API route handlers. |
| `src/components` | Reusable UI components such as invite and sign-out controls. |
| `src/services` | Application-facing service layer with tenant and role checks. |
| `src/server/services` | Lower-level database services and domain operations. |
| `src/server` | Auth config, Prisma client, session helpers, RBAC helpers, and errors. |
| `prisma/schema.prisma` | Database schema and enum definitions. |
| `scripts` | Test runner and demo seed script. |
| `docs/architecture.mmd` | Mermaid architecture diagram source. |

## Data model

Tenant Guard has six core tables:

| Model | Description |
| --- | --- |
| `User` | Account identity with email, optional name, and password hash. |
| `Organization` | Tenant boundary. Most application data belongs to an organization. |
| `Membership` | Join table connecting users to organizations with a role. |
| `Invitation` | Invite records with optional email lock, role, expiration, revocation, acceptance, and hashed token. |
| `Task` | Organization-scoped work item with status, priority, assignee, creator, and due date. |
| `AuditLog` | Append-only record of important actions with actor, entity, metadata, IP, user agent, and timestamp. |

Current enums:

```ts
Role = "ADMIN" | "MANAGER" | "MEMBER"
TaskStatus = "TODO" | "IN_PROGRESS" | "DONE"
TaskPriority = "LOW" | "MEDIUM" | "HIGH"
```

## RBAC matrix

| Action | Admin | Manager | Member |
| --- | --- | --- | --- |
| View organizations they belong to | Yes | Yes | Yes |
| View tasks in their organization | Yes | Yes | Yes |
| Create tasks | Yes | Yes | Yes |
| Update any task | Yes | Yes | No |
| Update own or assigned task | Yes | Yes | Yes |
| Delete tasks | Yes | Yes | No |
| View member roster | Yes | Yes | No |
| Create invites | Yes | Yes | No |
| Invite admins | Yes | No | No |
| Invite managers | Yes | Yes | No |
| Invite members | Yes | Yes | No |
| Change member roles | Yes | No | No |
| View audit log through API | Yes | Yes | No |

## API overview

Authentication:

- `POST /api/auth/register` - Create a user account.
- `POST /api/auth/[...nextauth]` - NextAuth sign-in/sign-out endpoints.

Organizations:

- `GET /api/orgs` - List organizations for the current user.
- `POST /api/orgs` - Create an organization.
- `GET /api/orgs/:orgId` - Get organization details.

Members:

- `GET /api/orgs/:orgId/members` - List members. Requires admin or manager.
- `PATCH /api/orgs/:orgId/members/:userId` - Change a member role. Requires admin.

Invitations:

- `GET /api/orgs/:orgId/invitations` - List invitations. Requires admin or manager.
- `POST /api/orgs/:orgId/invitations` - Create an invitation. Requires admin or manager.
- `POST /api/orgs/:orgId/invitations/:inviteId/revoke` - Revoke an invitation. Requires admin or manager.
- `POST /api/invitations/accept` - Accept an invitation as the logged-in user.

Tasks:

- `GET /api/orgs/:orgId/tasks` - List tasks for an organization.
- `POST /api/orgs/:orgId/tasks` - Create a task.
- `GET /api/orgs/:orgId/tasks/:taskId` - Get one task.
- `PATCH /api/orgs/:orgId/tasks/:taskId` - Update a task.
- `DELETE /api/orgs/:orgId/tasks/:taskId` - Delete a task. Requires admin or manager.

Task listing supports pagination and filters:

```text
GET /api/orgs/:orgId/tasks?page=1&limit=20&status=TODO&assignedToUserId=user_id&search=deploy&from=2026-01-01&to=2026-02-01&dateField=dueDate
```

Audit:

- `GET /api/orgs/:orgId/audit?cursor=...&limit=50` - Read audit events. Requires admin or manager.

## Local setup

Prerequisites:

- Node.js 20+
- npm
- PostgreSQL

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Set the required variables:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tenant_guard
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tenant_guard_test
NEXTAUTH_SECRET=replace-me-with-a-random-string
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Push the Prisma schema to your local database:

```bash
npx prisma db push
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Demo seed

The seed script creates a demo admin user, organization, and sample tasks.

Set a non-default demo password:

```env
DEMO_EMAIL=demo@tenantguard.dev
DEMO_PASSWORD=change-this-password
DEMO_ORG_NAME=Tenant Guard Demo
```

Then run:

```bash
npm run seed:demo
```

For local-only experiments, you can allow the default demo password by setting:

```env
ALLOW_DEMO_SEED=true
```

## Testing

Run all tests:

```bash
npm test
```

The test runner resets the database before running Vitest. Use a dedicated test database through `TEST_DATABASE_URL`.

Safety behavior:

- If `.env.test` exists, it is loaded first.
- If `TEST_DATABASE_URL` is not set, the runner falls back to `DATABASE_URL`.
- The runner refuses to reset a database that does not look like a test database unless `ALLOW_UNSAFE_TEST_DB=true`.

Run Vitest directly without the reset wrapper:

```bash
npm run test:unit
```

Run linting:

```bash
npm run lint
```

Validate the Prisma schema:

```bash
npx prisma validate
```

## CI

GitHub Actions runs on pull requests and performs:

1. `npm ci`
2. `npm run lint`
3. `npx prisma validate`
4. `npm test`

The CI workflow starts a PostgreSQL 16 service container and points `DATABASE_URL` at the CI test database.

## Deployment notes

A typical deployment uses Vercel plus managed PostgreSQL such as Neon or Supabase.

Required production environment variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_APP_URL`

Recommended deployment flow:

1. Provision PostgreSQL.
2. Set environment variables in the hosting provider.
3. Deploy the Next.js app.
4. Apply schema changes.

The repository includes checked-in Prisma migrations. Use `npx prisma migrate dev` during development and `npx prisma migrate deploy` in staging and production.

## Security notes

- Tenant isolation is enforced by checking membership before organization-scoped reads and writes.
- Role checks are centralized in service functions such as `requireMembership` and `requireRole`.
- Invite tokens are generated randomly and stored only as SHA-256 hashes.
- Email-bound invites can only be accepted by a user with the matching email.
- Audit logs are written for sensitive lifecycle events.
- Test database resets are guarded to reduce the risk of wiping a non-test database.

## Current limitations

This is an MVP, so a few production-grade features are intentionally out of scope:

- No OAuth providers are configured yet.
- No email delivery is wired up for invites; invite links are shown in the UI.
- No background jobs for invite expiration cleanup.
- No full admin audit-log UI yet, although the API and database model exist.
- Production deployment, monitoring, backup-restore rehearsal, and pilot operations still need to be completed.
