# Proposal: Phase 10.5 Category Standardization

**Proposal Number:** 003
**Date:** 2026-02-11
**Author:** Constitutional Steward
**Classification:** Class A — Non-Semantic Change
**Status:** Pending Approval

---

## Summary

Introduce formal RFC-style specifications, a reference architecture, integration guide, governance RFC process, and institutional readiness checklist. These are documentation-only artifacts. No code changes, no behavioral changes, no test changes.

---

## Classification Rationale

**Why Class A?**

- [x] No code changes of any kind
- [x] No behavioral change possible
- [x] All 1,176 tests remain identical and passing
- [x] Pure documentation additions
- [x] No invariant definitions changed
- [x] No predicate evaluation semantics changed

This is strictly a documentation addition. The specifications describe existing behavior — they do not prescribe new behavior.

---

## Motivation

**Why is this change needed?**

Attestia has 12 packages, 1,176 tests, and production-grade operational infrastructure (Phase 9). However, it lacks:

1. **Formal specifications** — No implementation-agnostic description of what Attestia does. An independent party cannot build a compatible implementation from existing documentation alone.
2. **Category definition** — Attestia fills a specific gap in the on-chain financial stack (the "control layer"), but this position is not formally described.
3. **Governance for specs** — The change class system governs code changes, but no process exists for how specifications evolve.
4. **Institutional readiness** — No single document helps organizations evaluate adoption readiness.

Phase 10.5 addresses all four gaps with documentation artifacts only.

---

## Scope

**What is added?**

| Artifact | Path | Purpose |
|----------|------|---------|
| Normative definitions | `specs/DEFINITIONS.md` | Shared terms across all RFCs |
| RFC-001: Event model | `specs/RFC-001-DETERMINISTIC-EVENT-MODEL.md` | Event structure, hash chain, append-only semantics |
| RFC-002: Reconciliation | `specs/RFC-002-PROOF-OF-RECONCILIATION.md` | 3D matching, report hashing, attestation |
| RFC-003: Intent control | `specs/RFC-003-INTENT-CONTROL-STANDARD.md` | Intent lifecycle, state machine, accounting |
| RFC-004: State hash | `specs/RFC-004-GLOBAL-STATE-HASH.md` | Deterministic replay verification |
| RFC-005: Witness | `specs/RFC-005-WITNESS-PROTOCOL.md` | XRPL attestation encoding and retry |
| Reference architecture | `REFERENCE_ARCHITECTURE.md` | Stack position, deployment patterns |
| Integration guide | `INTEGRATION_GUIDE.md` | API integration with curl examples |
| RFC process | `packages/registrum/docs/governance/RFC_PROCESS.md` | How specs evolve |
| Readiness checklist | `INSTITUTIONAL_READINESS.md` | Adoption evaluation guide |
| This proposal | `packages/registrum/docs/proposals/003-PHASE_10_CATEGORY_STANDARD.md` | Governance record |

**What does NOT change?**

- All source code (zero files modified)
- All tests (1,176 unchanged)
- All existing documentation (no modifications)
- Package dependencies
- Build configuration
- CI pipeline

---

## Evidence

**Test Evidence:**

| Test Suite | Status | Count |
|------------|--------|-------|
| All existing tests | Pass | 1,176 |
| New tests added | N/A | 0 |
| Tests modified | N/A | 0 |

No test evidence is required for Class A changes. Tests are listed for completeness.

**Documentation Evidence:**

- Each RFC references normative interfaces from existing source code
- All TypeScript interfaces cited in specs exist in the codebase
- Algorithm descriptions match implementations in referenced source files
- `specs/DEFINITIONS.md` terms are consistent with `packages/registrum/docs/DEFINITIONS.md`

---

## Guarantee Impact

### Unchanged

All guarantees remain identical:

- [x] Determinism — Same inputs → same outputs
- [x] Replayability — Historical decisions reproducible
- [x] Fail-closed — Invalid input causes hard failure
- [x] Auditability — Structural judgments reproducible
- [x] Invariants — All 11 structural invariants enforced
- [x] Tamper evidence — SHA-256 hash chain on event log

### Modified

None.

### Added

None. (Documentation describes existing guarantees; it does not add new ones.)

### Removed

None.

---

## Rollback Plan

**Trigger Conditions:**

- Specification error discovered that contradicts implementation
- Normative interface cited in RFC does not match source code

**Rollback Steps:**

1. Correct the spec (Class A — editorial fix)
2. If spec and code genuinely diverge, file a separate proposal for the code fix

**State Implications:**

- No data impact (no code changes)
- No deployment impact (no runtime changes)
- Specs can be corrected independently of code releases

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Spec contradicts implementation | Low | Medium | Each RFC references specific source files; cross-checked during authoring |
| Spec creates false expectations | Low | Medium | All RFCs marked "Draft" status; institutional readiness doc notes this |
| RFC process adds overhead | Very Low | Low | Process is lightweight; Class A changes have minimal requirements |

---

## Implementation Plan

Delivered across 4 commits:

1. Formal specifications (RFC-001 through RFC-005 + DEFINITIONS.md)
2. Reference architecture and integration guide
3. Governance RFC process, institutional readiness, and this proposal
4. Roadmap update for Phase 10.5

---

## References

- `specs/` — All RFC documents
- `REFERENCE_ARCHITECTURE.md` — Stack position and deployment
- `INTEGRATION_GUIDE.md` — API integration guide
- `INSTITUTIONAL_READINESS.md` — Adoption readiness checklist
- `packages/registrum/docs/governance/RFC_PROCESS.md` — RFC lifecycle
- `packages/registrum/docs/governance/CHANGE_CLASSES.md` — Change taxonomy

---

*This proposal documents Phase 10.5's documentation artifacts. As a Class A change, it adds no code, modifies no behavior, and requires no test changes.*
