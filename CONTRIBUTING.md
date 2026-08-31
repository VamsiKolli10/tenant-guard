# Contributing to Tenant Guard

Tenant Guard is a focused personal MVP. Keep changes small, tested, and aligned with the current product scope.

## Development workflow

1. Create a feature branch from `main`.
2. Configure `.env` and `.env.test` from the example files.
3. Update tests and documentation when behavior or configuration changes.
4. Run the checks below before opening a pull request.

```bash
npm run lint
npx prisma validate
npm run build
npm test
```

`npm test` resets the configured test database. Use a disposable database only.

## Security-sensitive changes

For authentication, organization access, invitations, memberships, roles, tasks, or audit logs:

- Enforce organization membership before reading or mutating data.
- Test both allowed and denied roles, including cross-tenant denial.
- Never log passwords, raw tokens, session cookies, or sensitive payloads.
- Keep audit behavior consistent with the mutation.
- Prefer service-layer checks over duplicating authorization in route handlers.

## Pull requests

Describe user impact, implementation, test coverage, migration impact, and environment-variable changes. Include screenshots for meaningful UI changes. Do not commit `.env`, credentials, database dumps, generated build output, or production data.
