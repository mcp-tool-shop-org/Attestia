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

---

## Phase 12 — External Verification & Governance Threats

### Components (Extended)

| ID | Component | Trust Boundary |
|----|-----------|---------------|
| C9 | Public verification API | External network (unauthenticated) |
| C10 | Merkle proof system | Cryptographic boundary |
| C11 | Compliance evidence generator | Cross-subsystem |
| C12 | SLA enforcement engine | Per-tenant isolation |
| C13 | Tenant governance | Multi-tenant boundary |
| C14 | External verifier network | External trust boundary |

### New STRIDE Threats

#### S — Spoofing

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Fake verifier submits false PASS report | C14 | Verifier identity tracking; minimum verifier count for consensus | `packages/verify/src/verification-consensus.ts` |

#### T — Tampering

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| State bundle manipulation by operator | C9 | Bundle hash is deterministic SHA-256; verifiers cross-reference | `packages/verify/src/state-bundle.ts` |
| Merkle proof forgery | C10 | SHA-256 collision resistance; proof verification against root | `packages/proof/src/merkle-tree.ts` |
| SLA policy substitution (lenient for strict) | C12 | `assignSlaPolicy` returns new immutable tenant; original unchanged | `packages/verify/src/sla/tenant-governance.ts` |

#### R — Repudiation

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Operator denies state at point in time | C9 | Exportable state bundles with timestamp and bundle hash | `packages/verify/src/state-bundle.ts` |
| Disputed compliance score | C11 | Deterministic evidence generation; same state → same score | `packages/verify/src/compliance/evidence-generator.ts` |

#### I — Information Disclosure

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Public API leaks internal details | C9 | Public summary strips evaluations and evidence details | `packages/node/src/routes/compliance.ts` |
| Cross-tenant governance leakage | C13 | Independent governance policies per tenant; store isolation | `packages/verify/src/sla/tenant-governance.ts` |

#### D — Denial of Service

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Public API flood (no auth) | C9 | IP-based token bucket rate limiter (10 req/min) | `packages/node/src/middleware/public-rate-limit.ts` |
| SLA gaming via NaN/Infinity metrics | C12 | Fail-closed: NaN/Infinity comparison → FAIL | `packages/verify/src/sla/sla-engine.ts` |

#### E — Elevation of Privilege

| Threat | Component | Control | File |
|--------|-----------|---------|------|
| Suspended tenant performs actions | C13 | `validateTenantGovernance` blocks all actions for suspended tenants | `packages/verify/src/sla/tenant-governance.ts` |
| Double-suspend to override reason | C13 | Already-suspended tenant cannot be re-suspended; throws error | `packages/verify/src/sla/tenant-governance.ts` |
| External verifier collusion | C14 | Minimum verifier count; dissenter tracking; on-chain cross-reference | `packages/verify/src/verification-consensus.ts` |

---

## Residual Risks

| Risk | Severity | Mitigation Path |
|------|----------|-----------------|
| JSONL file deleted entirely (not just tampered) | Medium | External backup; XRPL attestation provides independent proof |
| JWT secret leaked | High | Rotate secret; re-issue API keys; short JWT expiry |
| Witness XRPL account compromised | High | Multi-sig witness governance (implemented in Phase 11) |
| In-memory audit log lost on restart | Medium | Persist audit log to event store (future enhancement) |
| External verifier collusion (all verifiers compromised) | Medium | Require diverse verifier sources; on-chain anchoring |
| Merkle proof forgery via SHA-256 collision | Very Low | Computationally infeasible with current hardware |
| SLA gaming via carefully crafted metric values | Low | Fail-closed semantics; NaN/Infinity/missing metrics all FAIL |
| Operator serves manipulated state bundle | Medium | Cross-reference with previously published on-chain hashes |
