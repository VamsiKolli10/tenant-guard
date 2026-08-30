# API Conventions

**Status:** Proposed contract for new and normalized endpoints

## Resource shape

Use organization-scoped URLs for tenant data:

```text
/api/orgs/{orgId}/tasks
/api/orgs/{orgId}/tasks/{taskId}
/api/orgs/{orgId}/members
/api/orgs/{orgId}/audit
```

The URL `orgId` is an input to validate, not proof of access.

## Authentication and authorization

- `401 Unauthorized`: no valid authenticated session.
- `403 Forbidden`: authenticated actor cannot perform this organization-level action.
- `404 Not Found`: resource is absent within the authorized organization scope.
- Avoid distinguishing “exists in another organization” from “does not exist.”

## Response envelope

Preferred success forms:

```json
{ "data": { "id": "..." } }
```

```json
{
  "data": [],
  "page": { "nextCursor": "...", "hasMore": false }
}
```

Preferred error form:

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found.",
    "requestId": "..."
  }
}
```

Messages are safe for users; internal stack traces remain in correlated server telemetry.

## Validation

- Validate params, query, and JSON body at the route boundary using Zod.
- Reject unknown fields on security-sensitive mutations when practical.
- Apply string trimming, email normalization, length limits, enum checks, and date-range validation explicitly.
- Business invariants remain in application/domain services even if inputs are syntactically valid.

## Pagination and filtering

- Keep page-number pagination for small task lists if required by the existing UI.
- Use opaque cursor pagination for audit, activity, and high-growth feeds.
- Cap page size server-side.
- Define filter semantics for null values, date inclusivity, sorting, and case-insensitive search.

## Idempotency and concurrency

- Accept an `Idempotency-Key` for retryable creates and externally triggered mutations.
- Scope keys by actor, organization, and operation.
- Reject reuse with a different request fingerprint.
- Use conditional updates/transactions for invite acceptance, last-admin changes, and state transitions.

## Versioning

Do not version the internal UI API pre-pilot. Preserve compatibility while web clients and server deploy together. Introduce `/api/v1` before publishing an external API and maintain an explicit deprecation policy.

## Endpoint documentation template

For each endpoint document purpose, authentication, authorized roles, path/query/body schema, response schema, errors, tenant-scope rule, transaction behavior, audit event, idempotency, rate limit, and example.
