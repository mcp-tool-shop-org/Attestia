# Attestia API Versioning Strategy

## URL-Path Versioning

All API endpoints are prefixed with their version: `/api/v1/`, `/api/v2/`, etc.

The URL prefix is the version boundary. Non-API routes (`/health`, `/ready`, `/metrics`) are unversioned.

## Coexistence

When v2 is introduced, v1 routes remain mounted alongside v2:

```typescript
app.route("/api/v1", v1Routes);
app.route("/api/v2", v2Routes);
```

Both versions run in the same process and share the service layer. Version-specific adapters translate between DTOs and domain calls.

## Deprecation Timeline

- **v(N-1)** is supported for **6 months** after v(N) ships.
- Deprecated endpoints return `Deprecation: true` and `Sunset: <date>` headers.
- Deprecation warnings appear in structured logs.

## What Triggers a New Version

**Breaking changes** (require version bump):
- Removing or renaming response fields
- Changing field types
- Altering error codes or error envelope structure
- Changing authentication/authorization flows
- Removing endpoints

**Non-breaking changes** (stay in current version):
- Adding optional request fields
- Adding new response fields
- Adding new endpoints
- Adding new error codes (existing ones unchanged)
- Relaxing validation (accepting broader input)

## Current Status

- **v1**: Active (this document)
- **v2**: Not yet planned
