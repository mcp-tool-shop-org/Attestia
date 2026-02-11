# Provable Guarantees

## Purpose

This document lists the guarantees Registrum provides, with evidence pointers. These are claims that can be verified by running the test suite.

**No stronger claims are implied.**

If a property is not listed here, Registrum does not guarantee it.

---

## Guarantee 1: Deterministic Judgment

### Statement

Given identical inputs (transition + registrar state), Registrum always produces identical outputs (accept/reject + violations).

### Technical Grounding

- All invariant predicates are pure functions
- No randomness in evaluation
- No environment-dependent behavior
- No hidden state affecting outcomes

### Evidence

- `tests/invariants.test.ts` — 27 constitutional tests
- `tests/parity/*.test.ts` — 72 parity tests proving legacy ≡ registry
- `tests/persistence/replay.test.ts` — Replay determinism tests

### What This Does Not Mean

- Registrum does not guarantee the same output for *different* inputs
- Registrum does not guarantee performance characteristics

---

## Guarantee 2: Behavioral Parity (Legacy ≡ Registry)

### Statement

The legacy TypeScript predicate system and the registry DSL system produce identical structural judgments for all inputs.

### Technical Grounding

- Both systems evaluate the same 11 invariants
- Parity tests compare normalized results
- No undocumented divergence exists

### Evidence

- `tests/parity/identity.parity.test.ts` — 13 tests
- `tests/parity/lineage.parity.test.ts` — 14 tests
- `tests/parity/ordering.parity.test.ts` — 12 tests
- `tests/parity/metadata.parity.test.ts` — 19 tests
- `tests/parity/registry-mode.parity.test.ts` — 14 tests

### What This Does Not Mean

- Parity does not imply the systems are interchangeable at the code level
- Parity does not guarantee identical error messages (only identical outcomes)

---

## Guarantee 3: Temporal Stability (Snapshot → Replay)

### Statement

A registrar can be snapshotted, serialized, rehydrated, and replayed with identical outcomes to the original execution.

### Technical Grounding

- Snapshots are bitwise deterministic (canonical field ordering)
- Rehydration is exact or fails completely
- Replay evaluates invariants fresh against the same transitions

### Evidence

- `tests/persistence/snapshot.test.ts` — 42 schema validation tests
- `tests/persistence/serializer.test.ts` — 18 serialization tests
- `tests/persistence/rehydrator.test.ts` — 19 rehydration tests
- `tests/persistence/replay.test.ts` — 18 replay tests
- `tests/parity/persistence.parity.test.ts` — 12 persistence parity tests

### What This Does Not Mean

- Temporal stability does not mean snapshots are portable across versions
- Temporal stability does not guarantee backward compatibility with future invariant changes

---

## Guarantee 4: Fail-Closed Behavior

### Statement

When Registrum encounters an invalid condition, it fails completely. No partial state is produced, no warnings are issued, and no fallback is attempted.

### Technical Grounding

- Snapshot validation rejects unknown fields
- Rehydration fails on registry hash mismatch
- Rehydration fails on mode mismatch
- Invariant violations produce explicit rejection

### Evidence

- `tests/persistence/snapshot.test.ts` — Schema rejection tests
- `tests/persistence/rehydrator.test.ts` — Fail-closed tests
- `tests/invariants.test.ts` — Violation tests

### What This Does Not Mean

- Fail-closed does not mean the system crashes
- Fail-closed does not mean errors are unrecoverable by the caller

---

## Guarantee 5: Auditability

### Statement

Every decision Registrum makes can be inspected, explained, and reproduced. The invariants that were checked, the violations that occurred, and the outcome are all explicit.

### Technical Grounding

- `RegistrationResult` includes `appliedInvariants` on acceptance
- `RegistrationResult` includes `violations` with `invariantId` on rejection
- `listInvariants()` returns all active invariant descriptors
- `getLineage()` returns traceable ancestry

### Evidence

- `tests/invariants.test.ts` — Violation reporting tests
- `tests/persistence/replay.test.ts` — Replay report tests

### What This Does Not Mean

- Auditability does not mean human-readable explanations
- Auditability does not include timestamps or provenance metadata

---

## Guarantee 6: No Semantic Access

### Statement

Registrum never inspects, reads, or reasons about semantic content (`state.data`, `state.content`, `state.embedding`).

### Technical Grounding

- DSL validator statically rejects semantic access patterns
- All invariants operate only on `state.id`, `state.structure`, `transition.from`
- `appliesTo` field explicitly lists structural fields only

### Evidence

- `tests/registry.test.ts` — Semantic access rejection tests
- `src/registry/predicate/validator.ts` — Static validation logic

### What This Does Not Mean

- Registrum does not prevent the caller from storing semantic data
- Registrum does not validate that `state.structure` is truly non-semantic

---

## Guarantee 7: Invariant Completeness

### Statement

Registrum enforces exactly 11 invariants across 3 groups (Identity, Lineage, Ordering), covering all structural constraints required for Phase 1.

### Technical Grounding

| Group | Invariants | IDs |
|-------|------------|-----|
| Identity | 3 | `state.identity.explicit`, `state.identity.immutable`, `state.identity.unique` |
| Lineage | 4 | `state.lineage.explicit`, `state.lineage.parent_exists`, `state.lineage.single_parent`, `state.lineage.continuous` |
| Ordering | 4 | `ordering.total`, `ordering.deterministic`, `ordering.monotonic`, `ordering.non_semantic` |

### Evidence

- `docs/INVARIANTS.md` — Normative invariant definitions
- `tests/parity/metadata.parity.test.ts` — Invariant list verification

### What This Does Not Mean

- Completeness does not mean these invariants are sufficient for all use cases
- Completeness does not mean the invariant set is final

---

## Summary Table

| Guarantee | Proven By | Test Count |
|-----------|-----------|------------|
| Deterministic judgment | Constitutional + parity tests | 99 |
| Behavioral parity | Parity test suite | 72 |
| Temporal stability | Persistence test suite | 109 |
| Fail-closed behavior | Schema + rehydration tests | 61 |
| Auditability | Violation + replay tests | 45 |
| No semantic access | Registry validation tests | 25 |
| Invariant completeness | Metadata parity tests | 19 |

**Total: 233 tests**

---

## No Stronger Claims Implied

The following are **not** guaranteed:

- Performance characteristics
- Backward compatibility across versions
- Human-readable error messages
- Integration with specific frameworks
- Persistence to specific storage backends
- Network transport safety
- Concurrency safety

If you require these properties, they must be provided by the system using Registrum.

---

*This document is the claim surface. It should be updated only when guarantees change.*
