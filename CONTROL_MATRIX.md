# Attestia — Control Matrix

Maps each threat to its control, implementation file, and test coverage.

---

| # | Threat | Control | File | Test |
|---|--------|---------|------|------|
| 1 | API spoofing | API key + JWT auth | `packages/node/src/middleware/auth.ts` | `packages/node/tests/middleware/auth.test.ts` |
| 2 | Cross-tenant access | Auth-derived tenant isolation | `packages/node/src/middleware/tenant.ts` | `packages/node/tests/middleware/tenant.test.ts` |
| 3 | Event log tampering | SHA-256 hash chain | `packages/event-store/src/hash-chain.ts` | `packages/event-store/tests/hash-chain.test.ts` |
| 4 | Event log tampering (property) | Hash chain invariants | `packages/event-store/src/hash-chain.ts` | `packages/event-store/tests/hash-chain-property.test.ts` |
| 5 | Snapshot tampering | stateHash on save/load | `packages/event-store/src/snapshot-store.ts` | `packages/event-store/tests/snapshot-integrity.test.ts` |
| 6 | JSONL corruption | Truncated/corrupt line recovery | `packages/event-store/src/jsonl-store.ts` | `packages/event-store/tests/corruption-recovery.test.ts` |
| 7 | Ledger mutation | Append-only (no UPDATE/DELETE) | `packages/ledger/src/ledger.ts` | `packages/ledger/tests/ledger.test.ts` |
| 8 | Request flood | Token-bucket rate limiter | `packages/node/src/middleware/rate-limit.ts` | `packages/node/tests/edge-cases/rate-limit-recovery.test.ts` |
| 9 | Privilege escalation | Role-based permission guard | `packages/node/src/middleware/auth.ts` | `packages/node/tests/middleware/auth.test.ts` |
| 10 | Intent state bypass | Vault state machine enforcement | `packages/vault/src/vault.ts` | `packages/node/tests/edge-cases/concurrent-mutations.test.ts` |
| 11 | Registrum invariant bypass | 11 structural invariants | `packages/registrum/src/structural-registrar.ts` | `packages/registrum/tests/` (297 tests) |
| 12 | Replay inconsistency | Deterministic GlobalStateHash | `packages/verify/src/global-state-hash.ts` | `packages/verify/tests/global-state-hash.test.ts` |
| 13 | Repudiation of actions | Append-only audit log | `packages/node/src/services/audit-log.ts` | `packages/node/tests/audit-log.test.ts` |
| 14 | On-chain repudiation | XRPL witness transaction | `packages/witness/src/submitter.ts` | `packages/witness/tests/submitter-mocked.test.ts` |
| 15 | Witness network failure | Exponential backoff retry | `packages/witness/src/retry.ts` | `packages/witness/tests/retry.test.ts` |
| 16 | Witness timeout | Retry with degraded result | `packages/witness/src/submitter.ts` | `packages/witness/tests/timeout.test.ts` |
| 17 | Idempotency violation | Idempotency-Key header cache | `packages/node/src/middleware/idempotency.ts` | `packages/node/tests/edge-cases/idempotency-conflict.test.ts` |
| 18 | Error info disclosure | Structured error envelope | `packages/node/src/types/error.ts` | `packages/node/tests/middleware/error-handler.test.ts` |
| 19 | Startup with corrupt store | Integrity check on initialize | `packages/node/src/services/attestia-service.ts` | `packages/node/tests/health-deep.test.ts` |
| 20 | Schema drift | Event catalog with versioned migrations | `packages/event-store/src/attestia-events.ts` | `packages/event-store/tests/migration-roundtrip.test.ts` |
| 21 | State bundle manipulation | Deterministic SHA-256 bundle hash | `packages/verify/src/state-bundle.ts` | `packages/verify/tests/state-bundle.test.ts` |
| 22 | Merkle proof forgery | SHA-256 collision resistance + proof verification | `packages/proof/src/merkle-tree.ts` | `packages/proof/tests/merkle-tree.test.ts` |
| 23 | External verifier collusion | Minimum verifier count + dissenter tracking | `packages/verify/src/verification-consensus.ts` | `packages/verify/tests/verification-consensus.test.ts` |
| 24 | Public API flood | IP-based token bucket rate limiter | `packages/node/src/middleware/public-rate-limit.ts` | `packages/node/tests/middleware/public-rate-limit.test.ts` |
| 25 | SLA gaming (NaN/Infinity) | Fail-closed: non-finite values → FAIL | `packages/verify/src/sla/sla-engine.ts` | `packages/verify/tests/sla/governance-hardening.test.ts` |
| 26 | Suspended tenant escalation | All actions blocked for suspended tenants | `packages/verify/src/sla/tenant-governance.ts` | `packages/verify/tests/sla/governance-hardening.test.ts` |
| 27 | SLA policy substitution | Immutable tenant objects (assignSlaPolicy returns copy) | `packages/verify/src/sla/tenant-governance.ts` | `packages/verify/tests/sla/governance-hardening.test.ts` |
| 28 | Governance version rollback | Policy version monotonically increases | `packages/witness/src/governance/governance-store.ts` | `packages/verify/tests/sla/governance-hardening.test.ts` |
| 29 | Cross-tenant governance leak | Independent governance per store instance | `packages/witness/src/governance/governance-store.ts` | `packages/verify/tests/sla/governance-hardening.test.ts` |
| 30 | Compliance score manipulation | Deterministic evidence generation | `packages/verify/src/compliance/evidence-generator.ts` | `packages/verify/tests/compliance/evidence-generator.test.ts` |
