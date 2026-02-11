# Attestia — Threat Model

STRIDE analysis per component. Each threat maps to specific code controls.

---

## Scope

This analysis covers the Attestia runtime: `@attestia/node` REST API, backing domain packages, and the XRPL witness channel. It does not cover infrastructure (TLS termination, DNS, container orchestration).

---

## Components

| ID | Component | Trust Boundary |
|----|-----------|---------------|
| C1 | HTTP API (`@attestia/node`) | External network |
| C2 | Auth middleware | API gateway |
| C3 | Vault (intent lifecycle) | Per-tenant isolation |
| C4 | Ledger (double-entry) | Per-tenant isolation |
| C5 | Reconciler | Cross-subsystem |
| C6 | Event store (JSONL) | Filesystem |
| C7 | Witness (XRPL submitter) | External chain |
| C8 | Registrum (governance) | Constitutional boundary |

---

## STRIDE Analysis

### S — Spoofing

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Attacker impersonates API client | C1, C2 | API key + JWT auth middleware | `packages/node/src/middleware/auth.ts` |
| Attacker uses stolen API key | C2 | Key-scoped tenant isolation; keys are role-bound | `packages/node/src/types/auth.ts` |
| Forged witness attestation | C7 | XRPL transaction signed by witness private key | `packages/witness/src/submitter.ts` |

### T — Tampering

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Modified JSONL event file | C6 | SHA-256 hash chain; `verifyIntegrity()` on startup | `packages/event-store/src/hash-chain.ts` |
| Modified snapshot file | C6 | `stateHash` computed on save, verified on load | `packages/event-store/src/snapshot-store.ts` |
| Tampered reconciliation report | C5 | Report hash computed at creation, verified at attestation | `packages/reconciler/src/attestor.ts` |
| Modified ledger entries | C4 | Append-only; no UPDATE or DELETE operations | `packages/ledger/src/ledger.ts` |

### R — Repudiation

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Operator denies approving intent | C3 | Append-only audit log with actor + timestamp | `packages/node/src/services/audit-log.ts` |
| Disputed attestation | C7 | On-chain XRPL witness record (immutable) | `packages/witness/src/submitter.ts` |
| Event deletion | C6 | Append-only event store; hash chain detects gaps | `packages/event-store/src/jsonl-store.ts` |

### I — Information Disclosure

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Cross-tenant data access | C1, C3 | Tenant isolation via auth-derived tenant ID | `packages/node/src/middleware/tenant.ts` |
| Sensitive data in error responses | C1 | Error envelope strips internal details | `packages/node/src/types/error.ts` |
| API key in logs | C1 | Structured logging excludes auth headers | `packages/node/src/middleware/logger.ts` |

### D — Denial of Service

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Request flood | C1 | Token-bucket rate limiter per identity | `packages/node/src/middleware/rate-limit.ts` |
| Large request body | C1 | Hono body size limits; Zod validation rejects oversized payloads | `packages/node/src/middleware/validate.ts` |
| XRPL witness exhaustion | C7 | Exponential backoff retry with max attempts | `packages/witness/src/retry.ts` |

### E — Elevation of Privilege

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Viewer tries admin action | C2 | Role-based permission guard (`requirePermission`) | `packages/node/src/middleware/auth.ts` |
| Bypass intent state machine | C3 | Vault enforces state transitions; invalid transitions throw | `packages/vault/src/vault.ts` |
| Registrum invariant bypass | C8 | 11 structural invariants enforced on every transition | `packages/registrum/src/structural-registrar.ts` |

---

## Residual Risks

| Risk | Severity | Mitigation Path |
|------|----------|-----------------|
| JSONL file deleted entirely (not just tampered) | Medium | External backup; XRPL attestation provides independent proof |
| JWT secret leaked | High | Rotate secret; re-issue API keys; short JWT expiry |
| Witness XRPL account compromised | High | Multi-sig witness governance (Phase 10 roadmap) |
| In-memory audit log lost on restart | Medium | Persist audit log to event store (future enhancement) |
