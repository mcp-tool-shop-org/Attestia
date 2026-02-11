# Proposal: Phase 9 Operational Changes

**Proposal Number:** 002
**Date:** 2026-02-11
**Author:** Constitutional Steward
**Classification:** Class B — Semantic-Preserving Structural Change
**Status:** Pending Approval

---

## Summary

Add operational infrastructure for production readiness: tamper-evident event storage, resilient witness submission, startup integrity verification, and auditor-facing export APIs. No changes to domain semantics or structural invariants.

---

## Classification Rationale

**Why Class B?**

- [x] No invariant definitions changed
- [x] No predicate evaluation semantics changed
- [x] Structural guarantees remain identical
- [x] Changes are additive (new capabilities) not semantic (new rules)
- [x] All existing tests continue to pass unchanged

This adds operational infrastructure around the existing constitutional layer without modifying it.

---

## Motivation

**Why are these changes needed?**

Attestia's domain logic is complete and tested (1,176 tests). However, production deployment requires:

1. **Tamper evidence** — Events stored without cryptographic linking can be silently modified
2. **Resilient witness** — A single XRPL submission failure currently halts attestation
3. **Startup verification** — No integrity check runs before the system accepts requests
4. **Auditor access** — No API exists for independent state verification

These gaps prevent credible deployment for financial infrastructure.

---

## Scope

**What changes?**

| Component | Change |
|-----------|--------|
| Event store | SHA-256 hash chain on appended events |
| Snapshot store | `stateHash` on save/load |
| Witness submitter | Exponential backoff retry with degradation |
| Attestia service | `initialize()` verifies integrity before accepting requests |
| Health endpoint | `/ready` reports per-subsystem status |
| Export endpoints | `GET /export/events` (NDJSON), `GET /export/state` (snapshot + hash) |
| Metrics | Business-level counters (intents, reconciliation, attestation, witness) |
| Audit log | Append-only in-memory action log |

**What does NOT change?**

- Registrum invariant definitions (all 11 unchanged)
- Predicate evaluation semantics
- Snapshot schema (additive `stateHash` field only)
- Replay behavior and determinism
- Fail-closed guarantees
- Ledger append-only semantics
- Vault state machine transitions
- Reconciler matching algorithm

---

## Evidence

**Test Evidence:**

| Test Suite | Status | Count |
|------------|--------|-------|
| Hash chain unit | Pass | 18 |
| Hash chain property (fast-check) | Pass | 6 |
| Snapshot integrity | Pass | 4 |
| Witness retry | Pass | 12 |
| Startup self-check | Pass | 6 |
| Audit log | Pass | 10 |
| Export API | Pass | 4 |
| Pilot lifecycle (E2E) | Pass | 1 |
| Edge cases | Pass | 33 |
| **Phase 9 total** | **Pass** | **~94** |
| **All tests** | **Pass** | **1,176** |

**Benchmark Evidence:**

Performance baselines recorded in `PERFORMANCE_BASELINE.md`. CI gate prevents >20% regression.

---

## Guarantee Impact

### Unchanged

All existing guarantees remain identical:

- [x] Determinism — Same inputs → same outputs
- [x] Replayability — Historical decisions reproducible
- [x] Fail-closed — Invalid input causes hard failure
- [x] Auditability — Structural judgments reproducible
- [x] Invariants — All 11 structural invariants enforced

### Added

- [x] Tamper evidence — SHA-256 hash chain on event log
- [x] Startup integrity — Event store verified before accepting requests
- [x] Witness resilience — Retry with graceful degradation
- [x] Independent verification — Export API for auditor replay

### Modified

None.

### Removed

None.

---

## Rollback Plan

**Trigger Conditions:**

- Hash chain computation introduces performance regression beyond baseline
- Witness retry interferes with XRPL submission semantics
- Startup integrity check produces false positives

**Rollback Steps:**

1. Revert Phase 9 commits (hash chain, retry, startup check)
2. Re-run full test suite (1,013 pre-Phase 9 tests)
3. Verify all existing behavior preserved
4. Release patch version

**State Implications:**

- JSONL files with hash fields load fine without hash chain code (fields are ignored)
- Snapshots with `stateHash` load fine without verification (field is ignored)
- No data migration required in either direction

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Hash computation slows append | Low | Medium | Benchmarked; SHA-256 is fast |
| Retry masks permanent XRPL failure | Low | Medium | `shouldRetry` distinguishes permanent vs transient |
| Startup check false positive | Very Low | High | Property tests prove chain validity |
| Export API leaks tenant data | Low | High | Auth-guarded; viewer+ permission required |

---

## Implementation Plan

Delivered across 7 commits:

1. Event store hash chaining & snapshot integrity
2. Witness retry & graceful degradation
3. Startup self-check, deep health & business metrics
4. Pilot use case & export API
5. Edge case testing & hash chain property tests
6. Performance baseline & CI gate
7. Auditor artifacts, governance & public docs (this proposal)

---

## References

- `THREAT_MODEL.md` — STRIDE analysis
- `CONTROL_MATRIX.md` — Threat → control mapping
- `VERIFICATION_GUIDE.md` — Auditor replay guide
- `UPGRADE_GUIDE.md` — Deploy without losing state
- `PERFORMANCE_BASELINE.md` — Benchmark results
- `packages/event-store/src/hash-chain.ts` — Hash chain implementation
- `packages/witness/src/retry.ts` — Retry implementation
- `packages/node/src/services/attestia-service.ts` — Startup self-check

---

*This proposal documents operational changes that strengthen Attestia's production readiness without modifying its constitutional guarantees.*
