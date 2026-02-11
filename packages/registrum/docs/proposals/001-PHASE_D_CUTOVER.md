# Proposal: Phase D Cutover

**Proposal Number:** 001
**Date:** 2025-02-05
**Author:** Constitutional Steward
**Classification:** Class B — Semantic-Preserving Structural Change
**Status:** Pending Approval

---

## Summary

Make registry mode the default implementation, deprecate (not remove) legacy mode, and release v1.0.0.

---

## Classification Rationale

**Why Class B?**

- [x] Behavior already proven equivalent (parity harness)
- [x] Changes default authority source, not semantics
- [x] Legacy mode remains available (deprecation, not removal)
- [x] No guarantee changes

This is a structural change with proven behavioral equivalence.

---

## Motivation

**Why is this change needed?**

Registry mode provides:
- JSON-inspectable invariant definitions
- External auditability without code reading
- Constitutional surface in declarative form
- Foundation for future governance tools

Phase E has proven temporal equivalence:
- Live execution ≡ replayed execution
- Legacy mode ≡ registry mode under all conditions

The system is ready for registry mode to become authoritative.

---

## Scope

**What changes?**

| Component | Change |
|-----------|--------|
| Default mode | `legacy` → `registry` |
| Legacy mode | Available but deprecated |
| Version | Pre-1.0 → v1.0.0 |
| `STOP.md` | Removed (freeze lifted) |

**What does NOT change?**

- Invariant definitions (identical in both modes)
- Predicate evaluation semantics
- Snapshot schema
- Replay behavior
- Fail-closed guarantees
- Test suite (all tests remain)

---

## Evidence

**Parity Evidence:**

- [x] Parity tests pass: `tests/parity/` (58 tests)
- [x] Replay parity: `tests/parity/persistence.parity.test.ts` (12 tests)
- [x] Migration criteria met: `MIGRATION_CRITERIA.md` (all items checked)

**Test Evidence:**

| Test Suite | Status | Count |
|------------|--------|-------|
| Constitutional | Pass | 27 |
| Registry system | Pass | 25 |
| Parity (all groups) | Pass | 58 |
| Registry mode (C.5) | Pass | 14 |
| Persistence | Pass | 97 |
| Persistence parity | Pass | 12 |
| **Total** | **Pass** | **233** |

**Additional Evidence:**

- `docs/PROVABLE_GUARANTEES.md` — Formal claim surface
- `docs/MIGRATION_CRITERIA.md` — Checklist complete
- Phase E commits — Full persistence proof

---

## Guarantee Impact

### Unchanged

All guarantees remain identical:

- [x] Determinism — Same inputs → same outputs
- [x] Replayability — Historical decisions reproducible
- [x] Fail-closed — Invalid input causes hard failure
- [x] Auditability — Structural judgments reproducible
- [x] Parity — Legacy ≡ registry behavior

### Modified

None.

### Added

None.

### Removed

None.

---

## Rollback Plan

**Trigger Conditions:**

- Parity divergence discovered post-cutover
- Registry mode defect not present in legacy
- User-reported behavioral difference

**Rollback Steps:**

1. Revert default mode flag to `legacy`
2. Re-run full test suite
3. Verify parity tests pass
4. Release patch version
5. Document in decision record

**State Implications:**

- No data migration required
- Snapshots remain compatible
- Users can explicitly set `mode: "legacy"` at any time

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parity divergence | Very Low | High | Full parity test coverage |
| User confusion | Low | Low | Clear deprecation notice |
| Legacy dependency | Low | Medium | Legacy mode still available |

---

## Implementation Plan

If approved:

1. Update `StructuralRegistrar` default mode to `registry`
2. Add deprecation notice for `mode: "legacy"`
3. Update documentation to reflect new default
4. Remove `STOP.md`
5. Bump version to v1.0.0
6. Create release tag
7. Update changelog

---

## Open Questions

None. All prerequisites are satisfied.

---

## References

- `docs/MIGRATION_CRITERIA.md` — Cutover checklist
- `docs/PROVABLE_GUARANTEES.md` — Guarantee surface
- `docs/GOVERNANCE_HANDOFF.md` — Phase D path description
- `tests/parity/` — Parity test suite
- `tests/parity/persistence.parity.test.ts` — Temporal parity

---

*This proposal exercises the governance process for the first time.*
