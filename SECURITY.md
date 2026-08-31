# Security Policy

Tenant Guard is a personal project and is not yet a guaranteed production service. Do not submit real customer data, credentials, invite tokens, or security testing against shared environments.

## Reporting a vulnerability

Report vulnerabilities privately to the repository owner through the private security contact configured for this repository. Include the affected route or version, reproducible steps, impact, and any suggested mitigation. Do not open a public issue for an undisclosed vulnerability or include secrets in the report.

## Report immediately

Please escalate suspected cross-tenant data exposure, privilege escalation, authentication bypass, credential or token disclosure, destructive data loss, or production secret exposure.

## Security expectations

- Keep secrets in environment or hosting-provider secret management.
- Use separate databases for development, testing, staging, and production.
- Never point the test runner at production data.
- Review migrations and authorization changes before deployment.
- Preserve audit records for sensitive administrative actions.
