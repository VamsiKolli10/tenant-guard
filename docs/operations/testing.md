# Testing

**Status:** Accepted
**Last updated:** 2026-09-05

## What runs where

| Layer | Command | Needs | Verifies |
| --- | --- | --- | --- |
| Types | `npx tsc --noEmit` | nothing | Compilation across the whole tree |
| Lint | `npm run lint` | nothing | Style, unused code, the service-layer import boundary |
| Unit (pure) | `npx vitest run src/server/tenant-guard.test.ts` | nothing | Tenant guard argument rewriting — no database needed |
| Integration | `npm test` | PostgreSQL | Services, tenancy, RBAC, invitations, audit, security regressions |

The pure unit tests are deliberately separable. The tenant guard's argument
rewriting is the highest-risk logic in the codebase and is written as a pure
function precisely so it can be exercised without a database — including in
environments where one is not available.

## Local PostgreSQL

The integration suite drops and rebuilds its database on every run, so it must
never point at anything you care about. `scripts/run-tests.mjs` refuses to run
against a URL that does not look like a test database unless
`ALLOW_UNSAFE_TEST_DB=true`; do not set that against a hosted project.

```bash
brew install postgresql@16
brew services start postgresql@16

# `whoami` becomes the superuser role on a Homebrew install
createdb tenant_guard_test
```

Then confirm `.env.test` points at it — the checked-in example already matches a
default Homebrew install:

```
DATABASE_URL=postgresql://<your-mac-username>@127.0.0.1:5432/tenant_guard_test
DIRECT_URL=postgresql://<your-mac-username>@127.0.0.1:5432/tenant_guard_test
TEST_DATABASE_URL=postgresql://<your-mac-username>@127.0.0.1:5432/tenant_guard_test
NEXTAUTH_SECRET=tenant-guard-test-only-secret
```

`NEXTAUTH_SECRET` is not optional: the auth rate limiter derives its key HMAC
from it and throws without one.

Run it:

```bash
npm test
```

## Why the runner replays migrations

`scripts/run-tests.mjs` uses `prisma migrate reset`, not `prisma db push`.

`db push` syncs the declarative schema in `schema.prisma` and nothing else. Raw
SQL that lives only in a migration — the append-only trigger on `"AuditLog"`,
and anything like it added later — would not exist in the test database while
existing in production. That is the most dangerous kind of test environment: one
that passes because a guarantee is absent.

Replaying migrations makes the test database the same shape production has, and
means a migration that fails to apply fails the suite rather than surfacing on
deploy.

## Fixtures

`src/test/factories.ts` provides `createVerifiedUser`. Sign-in and invitation
acceptance both require a verified address, so most tests want this rather than
the raw `createUser`; reach for `createUser` only when the unverified state is
what is under test.

Cleanup between tests is a single `TRUNCATE` rather than a chain of
`deleteMany` calls, for two reasons that both follow from hardening the
application: model queries pass through the tenant guard, which refuses a
tenant-scoped delete with no organization bound; and the append-only trigger
rejects row `DELETE` on `"AuditLog"`. Raw SQL sits below the Prisma extension,
and `TRUNCATE` does not fire row-level triggers, so the audit table can still be
reset between tests without weakening the production guarantee.

## Smoke testing a running instance

The integration suite does not exercise the rendered application — server
actions, hydration, and role-gated navigation are outside its reach. Before
merging anything that touches the UI or the request path, run
`docs/operations/smoke-test.md` against a running instance.

Two classes of defect found on 2026-09-05 were invisible to types, lint, and the
integration suite, and would have reached a user:

- A hydration mismatch in the workspace tabs, which silently disabled every
  client component on the page.
- A server action with no pending state, which produced duplicate records when
  a user clicked twice.

Neither is detectable without loading the page in a browser.
