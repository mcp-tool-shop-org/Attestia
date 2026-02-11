# Changelog

All notable changes to Attestia, organized by development phase.

---

## Phase 9 — Production Pilot, Audit Readiness & Reference Deployment

### 9.1 — Pilot Use Case & Export API
- Defined "monthly payroll reconciliation" pilot scope
- Added `GET /api/v1/export/events` (NDJSON stream)
- Added `GET /api/v1/export/state` (snapshot + GlobalStateHash)
- End-to-end payroll lifecycle test (declare → approve → execute → verify → reconcile → attest → export → replay verify)

### 9.2 — Event Store Hash Chaining & Integrity
- SHA-256 hash chain on all appended events (RFC 8785 canonicalization)
- `verifyIntegrity()` on both InMemory and JSONL event stores
- Snapshot `stateHash` computed on save, verified on load
- Backward-compatible: pre-chain events load without hashes

### 9.2 — Witness Retry & Graceful Degradation
- Exponential backoff retry with jitter for XRPL submissions
- Configurable `RetryConfig` (max attempts, base delay, max delay, jitter)
- `WitnessSubmitResult` union: `submitted` | `degraded`
- Permanent XRPL errors skip retry

### 9.3 — Startup Self-Check, Health & Business Metrics
- `initialize()` verifies event store integrity on startup
- `/ready` reports per-subsystem status (503 if critical subsystem down)
- Business metrics: `attestia_intents_total`, `attestia_reconciliation_total`, `attestia_attestation_total`, `attestia_witness_total`
- Append-only audit log with actor + timestamp

### 9.4 — Edge Case Testing
- Hash chain property tests (fast-check): any N events → valid chain; tamper any → break
- JSONL corruption recovery: truncated lines, corrupt middle, empty files
- Concurrent mutation tests: race conditions on approve, duplicate declares
- Idempotency conflict behavior documented
- Witness timeout → retry → degraded result
- Rate limit exhaustion → 429 + Retry-After → recovery
- Event catalog migration roundtrip for all 20 event types

### 9.5 — Performance Baseline & CI Gate
- Benchmarks: event store append/read, hash chain verification, GlobalStateHash, intent lifecycle
- `PERFORMANCE_BASELINE.md` with recorded numbers
- CI benchmark step (Node 22 only)

### 9.6 — Auditor Artifacts & Documentation
- `THREAT_MODEL.md` — STRIDE analysis per component
- `CONTROL_MATRIX.md` — 20 threat → control → file → test mappings
- `VERIFICATION_GUIDE.md` — Auditor step-by-step replay guide
- `UPGRADE_GUIDE.md` — Deploy without losing state
- `ARCHITECTURE.md` — Package graph, data flows, security model
- `SECURITY.md` — Responsible disclosure policy

**Tests added in Phase 9:** ~94 new tests (1,176 total)

---

## Phase 8 — Service Layer, API Surface & Operator Tooling

- `@attestia/node` — Hono REST API with 17 endpoints
- API-key + JWT authentication
- Auth-derived multi-tenancy via `TenantRegistry`
- Token-bucket rate limiting per identity
- Idempotency-Key header with TTL cache
- ETag generation for intent state
- Prometheus metrics (HTTP counters + histograms)
- Structured request logging (pino) with X-Request-Id
- Multi-stage Dockerfile + Docker Compose
- Env-based configuration via Zod schema
- Graceful shutdown on SIGTERM/SIGINT

**Tests at Phase 8 exit:** 1,013

---

## Phase 7 — Persistence & Event Sourcing

- `@attestia/event-store` — append-only event persistence
- `InMemoryEventStore` and `JsonlEventStore` implementations
- `EventStore` interface: `append()`, `read()`, `readAll()`, `subscribe()`
- `SnapshotStore` interface with InMemory and File implementations
- Event catalog: 20 domain event types with schema versioning
- Event migration support via chained upcasters

**Tests at Phase 7 exit:** 947+

---

## Phase 6 — Hardening

- RFC 8785 (JSON Canonicalization Scheme) for deterministic hashing
- `@attestia/verify` — replay verification + GlobalStateHash
- `@attestia/types` runtime tests (type guards, factories)
- Property-based testing (fast-check) for ledger + registrum
- CI pipeline: GitHub Actions, Node 20 + 22 matrix, coverage gates
- Docker-based XRPL integration testing (standalone rippled)

---

## Phase 5 — Cross-System Verification

- `@attestia/reconciler` — 3D cross-system matching (vault ↔ ledger ↔ chain)
- `@attestia/witness` — XRPL on-chain attestation via payment memos
- Reconciliation scoring: match, mismatch, partial per dimension
- Report hashing for tamper detection

---

## Phase 4 — Products

- `@attestia/vault` — Personal vault with envelope budgeting, intent lifecycle, portfolio observation
- `@attestia/treasury` — Org treasury with payroll, distributions, dual-gate funding

---

## Phase 3 — Core Engines

- `@attestia/ledger` — Append-only double-entry engine (ported from Python)
- `@attestia/chain-observer` — Multi-chain read-only observation (EVM + XRPL)

---

## Phase 2 — Foundation

- `@attestia/registrum` — Constitutional governance with 11 invariants, dual-witness, XRPL attestation (ported from standalone repo)
- `@attestia/types` — Shared domain types (zero deps)
- Monorepo scaffold with pnpm workspaces

---

## Phase 1 — Genesis

- Initial mission statement and research
- Architecture decisions documented in `DESIGN.md`
