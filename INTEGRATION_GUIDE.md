# Attestia — Integration Guide

How to connect your application to Attestia.

---

## Prerequisites

- A running Attestia node (see `docker-compose.yml`)
- An API key with appropriate role (`admin`, `operator`, or `viewer`)

---

## Authentication

All API requests require authentication via one of:

**API Key** (recommended for service-to-service):
```bash
curl -H "X-Api-Key: YOUR_KEY" http://localhost:3000/api/v1/intents
```

**JWT Bearer** (for user-facing applications):
```bash
curl -H "Authorization: Bearer YOUR_JWT" http://localhost:3000/api/v1/intents
```

### Roles

| Role | Permissions |
|------|-------------|
| `admin` | Full access: create, approve, execute, verify, reconcile, attest, export |
| `operator` | Create and manage intents, run reconciliation |
| `viewer` | Read-only: list intents, view events, export data |

---

## Intent Lifecycle

### 1. Declare an Intent

```bash
curl -X POST http://localhost:3000/api/v1/intents \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "transfer",
    "description": "Monthly payroll distribution",
    "params": {
      "from": "treasury",
      "to": "payroll",
      "amount": "50000.00",
      "currency": "USDC"
    }
  }'
```

Response: `201 Created` with the intent object including its `id`.

### 2. Approve the Intent

```bash
curl -X POST http://localhost:3000/api/v1/intents/{id}/approve \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "reason": "Approved per Q1 budget" }'
```

### 3. Record Execution

After executing the transaction on-chain:

```bash
curl -X POST http://localhost:3000/api/v1/intents/{id}/execute \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": "evm:1",
    "txHash": "0xabc123..."
  }'
```

### 4. Verify the Outcome

```bash
curl -X POST http://localhost:3000/api/v1/intents/{id}/verify \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "matched": true
  }'
```

If `matched` is `false`, include `discrepancies`:
```json
{
  "matched": false,
  "discrepancies": ["Amount differs: expected 50000.00, actual 49999.50"]
}
```

---

## Reconciliation & Attestation

### Run Reconciliation

```bash
curl -X POST http://localhost:3000/api/v1/reconcile \
  -H "X-Api-Key: YOUR_KEY"
```

Returns a `ReconciliationReport` with match results across all three dimensions (intent ↔ ledger ↔ chain).

### Attest the Result

```bash
curl -X POST http://localhost:3000/api/v1/attest \
  -H "X-Api-Key: YOUR_KEY"
```

If a witness is configured, this also submits the attestation hash to the XRPL.

### List Attestations

```bash
curl http://localhost:3000/api/v1/attestations \
  -H "X-Api-Key: YOUR_KEY"
```

---

## Event Export (for Auditors)

### Export Event Stream

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  http://localhost:3000/api/v1/export/events \
  -o events.ndjson
```

Returns NDJSON (one JSON object per line). Each line contains the full stored event with hash chain fields.

### Export State Snapshot

```bash
curl -H "X-Api-Key: YOUR_KEY" \
  http://localhost:3000/api/v1/export/state \
  -o state.json
```

Returns the current state including:
- `ledgerSnapshot` — all accounts, entries, and balances
- `registrumSnapshot` — all structural states and lineage
- `globalStateHash` — the combined SHA-256 digest

### Verify Independently

See [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) for the complete auditor replay procedure.

---

## Idempotency

For mutation endpoints (POST), include an `Idempotency-Key` header to prevent duplicate operations:

```bash
curl -X POST http://localhost:3000/api/v1/intents \
  -H "X-Api-Key: YOUR_KEY" \
  -H "Idempotency-Key: unique-request-id-123" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

If the same key is sent again, the server returns the cached response without re-executing the operation.

---

## Health Monitoring

### Liveness

```bash
curl http://localhost:3000/health
# { "status": "ok" }
```

### Readiness (Deep Check)

```bash
curl http://localhost:3000/ready
# { "status": "ready", "subsystems": { "eventStore": "ok", "ledger": "ok", ... } }
```

Returns `503` if any critical subsystem is unhealthy.

### Prometheus Metrics

```bash
curl http://localhost:3000/metrics
```

Returns Prometheus text format. See [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) for the full metrics catalog.

---

## Error Handling

All errors follow the structured envelope format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid intent parameters",
    "details": { ... }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `VALIDATION_ERROR` | 400 | Request body failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Concurrency conflict or invalid state transition |
| `RATE_LIMITED` | 429 | Too many requests (check `Retry-After` header) |

---

## Rate Limiting

The API enforces per-identity rate limits using a token-bucket algorithm. When rate-limited:

- Response: `429 Too Many Requests`
- Header: `Retry-After: <seconds>`

Wait the specified duration before retrying.

---

## Pagination

List endpoints use cursor-based pagination:

```bash
curl "http://localhost:3000/api/v1/intents?limit=10" \
  -H "X-Api-Key: YOUR_KEY"
```

Response:
```json
{
  "data": [ ... ],
  "pagination": {
    "cursor": "eyJpZCI6MTB9",
    "hasMore": true
  }
}
```

To get the next page:
```bash
curl "http://localhost:3000/api/v1/intents?limit=10&cursor=eyJpZCI6MTB9" \
  -H "X-Api-Key: YOUR_KEY"
```
