# Decision: Phase D Cutover (Decision 1A′)

**Decision Number:** 001
**Date:** 2025-02-05
**Proposal Reference:** `docs/proposals/001-PHASE_D_CUTOVER.md`
**Classification:** Class B — Semantic-Preserving Structural Change
**Decision:** APPROVED

---

## Decision Statement

Registry mode becomes the default constitutional authority. Legacy mode is preserved as an independent secondary witness. XRPL attestation is enabled as an optional, non-authoritative external witness.

---

## Proposal Summary

Make registry mode the default implementation while preserving legacy as a secondary witness. Enable optional XRPL attestation for external witnessing.

This is a Class B change: structural shift with proven behavioral equivalence.

---

## Evidence Reviewed

| Evidence | Location | Status |
|----------|----------|--------|
| Parity tests | `tests/parity/` | ✅ Verified (71 tests) |
| Replay parity | `tests/parity/persistence.parity.test.ts` | ✅ Verified (12 tests) |
| Attestation tests | `tests/attestation/` | ✅ Verified (40 tests) |
| Migration criteria | `MIGRATION_CRITERIA.md` | ✅ Met (all items) |
| Full test suite | All test files | ✅ 274 passing |

---

## Rationale

1. **Registry provides superior auditability** — JSON-inspectable invariants vs opaque TypeScript
2. **Behavioral equivalence is proven** — 71 parity tests confirm identical outcomes
3. **Dual-witness architecture preserved** — No safety regression
4. **Rollback remains trivial** — Legacy mode selectable via flag
5. **XRPL attestation is properly bounded** — Optional, non-blocking, non-authoritative

---

## Conditions

The following conditions were attached to approval:

1. **Legacy must remain functional** — Not deprecated, not removed
2. **Parity enforcement must continue** — Both engines evaluate every transition
3. **Attestation must remain optional** — Default disabled, never blocking
4. **Rollback must be instant** — No migration required to revert

All conditions were met by Phase H implementation.

---

## Implementation Authorization

**Authorized Actions (Completed):**

- [x] Update default mode to `registry`
- [x] Preserve legacy mode as secondary witness
- [x] Update documentation
- [x] Remove `STOP.md`
- [x] Enable optional XRPL attestation
- [x] Add attestation configuration and emitter

**Not Authorized:**

- ❌ Removal of legacy mode
- ❌ Changes to invariant definitions
- ❌ Changes to snapshot schema
- ❌ Any untested behavioral changes
- ❌ Making attestation mandatory

---

## Effective Date

2025-02-05 (Phase H completion)

---

## Version Impact

| Current Version | New Version | Bump Type |
|-----------------|-------------|-----------|
| 0.x.x (pre-1.0) | 1.0.0 | Major (stability milestone) |

Note: Version bump in package.json deferred pending release process.

---

## XRPL Attestation Constraints

Added to this decision record for explicit governance:

| Constraint | Status |
|------------|--------|
| Attestation is optional | ✅ Enforced (default: disabled) |
| Attestation is non-blocking | ✅ Enforced (failures logged, not thrown) |
| Attestation is non-authoritative | ✅ Enforced (never consulted by invariants) |
| Attestation cannot influence registration | ✅ Enforced (separate code path) |

If any constraint is violated in future, it becomes a Class C change.

---

## Rollback Clause

If parity divergence is discovered post-cutover:

1. Revert default mode to `legacy` via config change
2. No data migration required
3. No code changes required
4. Document incident in decision record

Rollback can be executed instantly by any authorized maintainer.

---

## Steward Signature

**Constitutional Steward:** [SIGNATURE REQUIRED]
**Date:** 2025-02-05

---

## Post-Decision Notes

### Implementation Record

Phase H implemented this decision in 5 commits:

| Commit | Description |
|--------|-------------|
| H.1 | Registry default cutover |
| H.2 | Dual-witness policy codification |
| H.3 | Optional XRPL attestation enablement |
| H.4 | Documentation updates |
| H.5 | Validation and sign-off |

### Test Evidence

Final test count: 274 tests across 14 test suites

All parity tests pass. All attestation tests pass. No regressions.

### Phase Report

See `docs/PHASE_H_REPORT.md` for complete implementation evidence.

---

*This decision is now closed and authoritative.*
*Future changes to these surfaces require new governance proposals.*
