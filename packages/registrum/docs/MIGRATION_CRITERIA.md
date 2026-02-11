# Migration Decision Criteria

## Purpose

This document defines the conditions under which the registry-based invariant system may replace the legacy TypeScript invariant system.

**This decision is evidence-based, not aesthetic.**

## Definitions

| Term | Definition |
|------|------------|
| **Legacy system** | `src/invariants.ts` — TypeScript predicate functions |
| **Registry system** | `invariants/registry.json` + DSL + loader + evaluator |
| **Parity** | Identical structural outcomes for the same inputs |
| **Divergence** | Any difference in accept/reject/halt outcomes or invariant IDs |

## Migration Preconditions (All Required)

The registry system may replace the legacy system **only if** all conditions below are met.

### 1. Behavioral Parity

- [x] All legacy invariants are represented in the registry
- [x] Parity tests exist for every invariant
- [x] No undocumented divergence exists
- [x] Parity tests pass for all 11 invariants across 3 groups:
  - Identity (3 invariants)
  - Lineage (4 invariants)
  - Ordering (4 invariants)

### 2. Explicit Divergence Resolution

If divergence exists, **one** of the following must be true:

| Condition | Action |
|-----------|--------|
| Legacy system is underspecified | Documentation is updated to clarify intent |
| Registry DSL needs extension | DSL extended without violating safety constraints |
| Fundamental incompatibility | Migration is postponed or aborted |

**Silent divergence is forbidden.**

Any divergence must be:
1. Documented in tests with explicit comments
2. Reviewed and approved
3. Justified with rationale

### 3. Auditability Advantage

The registry system must demonstrably provide:

- [x] **Independent inspectability**: Registry can be read/validated without executing code
- [x] **Static rejection of unsafe predicates**: DSL validator rejects semantic access patterns
- [x] **No regression in test coverage**: All existing invariant tests continue to pass

If these advantages are not realized, migration is unjustified.

### 4. No Semantic Expansion

The registry system must **not**:

- Introduce optimization logic
- Introduce heuristics
- Introduce evaluation or preference mechanisms
- Increase expressiveness beyond declared invariants
- Access semantic content (state.data, state.content, state.embedding)

The DSL is intentionally limited. This is a feature, not a bug.

## Decision Outcomes

| Condition | Outcome | Action |
|-----------|---------|--------|
| Full parity achieved | **PROCEED** | Registry becomes default implementation |
| Minor gaps exist | **FIX** | Extend DSL or clarify spec, repeat parity tests |
| Fundamental mismatch | **ABORT** | Document limits, retain legacy system |

## Authority

Migration approval requires:

1. ✅ Passing parity test suite (`tests/parity/*.test.ts`)
2. ✅ Review of documented divergences (none at current time)
3. ✅ Explicit versioned decision

**No silent cutover is permitted.**

## Current Status

### Parity Test Results

```
Test Files: 7 passed
Tests:      124 passed
```

### Test Structure

```
tests/
├── invariants.test.ts              # 27 constitutional tests (legacy)
├── registry.test.ts                # 25 registry system tests
└── parity/
    ├── parity.helpers.ts           # Normalization utilities
    ├── identity.parity.test.ts     # 13 identity invariant parity tests
    ├── lineage.parity.test.ts      # 14 lineage invariant parity tests
    ├── ordering.parity.test.ts     # 12 ordering invariant parity tests
    ├── metadata.parity.test.ts     # 19 metadata parity tests
    └── registry-mode.parity.test.ts # 14 registry mode tests (C.5)
```

### Invariant Coverage

| Group | Invariants | Parity Status |
|-------|------------|---------------|
| Identity | 3 | ✅ PARITY |
| Lineage | 4 | ✅ PARITY |
| Ordering | 4 | ✅ PARITY |
| **Total** | **11** | **✅ FULL PARITY** |

### Documented Divergence

**None.** Both systems produce identical structural judgments for all tested inputs.

### Auditability Checklist

- [x] Registry is machine-readable JSON
- [x] DSL expressions are parsed and statically validated
- [x] Semantic access patterns are rejected at load time
- [x] Predicate evaluation is pure (no side effects)
- [x] No optimization or heuristic logic

## Phase C Status

Phase C is **COMPLETE**. The StructuralRegistrar now supports:

- [x] C.1: Root State Registration
- [x] C.2: State Identity Tracking
- [x] C.3: Lineage Storage & Querying
- [x] C.4: Deterministic Ordering Engine
- [x] C.5: Registry System Cut-In (Behind Flag)

### Registry Mode

The `StructuralRegistrar` now accepts a `mode` option:

```typescript
// Legacy mode (default) — uses TypeScript predicates
const legacy = new StructuralRegistrar();
const legacy = new StructuralRegistrar({ mode: "legacy" });

// Registry mode — uses compiled registry DSL
const registry = new StructuralRegistrar({
  mode: "registry",
  compiledRegistry: loadInvariantRegistry(rawJson),
});
```

**Default remains "legacy".** Registry mode is opt-in only.

## Phase E Status

Phase E is **COMPLETE**. Registrum now supports persistence, serialization, and replay:

- [x] E.1: Registrar Snapshot Schema
- [x] E.2: Deterministic Serialization
- [x] E.3: Registrar Rehydration (fail-closed)
- [x] E.4: Transition Replay Engine (read-only)
- [x] E.5: Persistence Parity Harness

### Persistence API

```typescript
// Snapshot current state
const snapshot = registrar.snapshot();

// Serialize to JSON (deterministic)
const json = serializeSnapshot(snapshot);

// Rehydrate from snapshot (fail-closed)
const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
  mode: "legacy",
  invariants: INITIAL_INVARIANTS,
});

// Replay transitions (read-only, proves determinism)
const report = replay(transitions, {
  mode: "legacy",
  invariants: INITIAL_INVARIANTS,
});
```

### Persistence Guarantees

- Snapshots are bitwise deterministic
- Rehydration is exact or fails completely
- Replay produces identical outcomes to live execution
- Legacy mode ≡ registry mode under replay

## Recommendation

**PHASE E COMPLETE** — Registrum is now a historical infrastructure.

Any decision Registrum made can be:
1. Serialized
2. Reloaded
3. Replayed
4. Audited

with identical outcomes.

## Test Summary

```
Test Files: 12 passed
Tests:      233 passed
```

| Category | Tests |
|----------|-------|
| Constitutional | 27 |
| Registry system | 25 |
| Identity parity | 13 |
| Lineage parity | 14 |
| Ordering parity | 12 |
| Metadata parity | 19 |
| Registry mode (C.5) | 14 |
| Snapshot schema | 42 |
| Serializer | 18 |
| Rehydrator | 19 |
| Replay | 18 |
| Persistence parity | 12 |
| **Total** | **233** |

## Cutover Checklist (Phase D)

Before making registry mode the default:

- [ ] Final parity test run
- [ ] Stakeholder sign-off
- [ ] Version bump to 1.0.0
- [ ] Legacy mode marked deprecated (not removed)
- [ ] Migration documented in CHANGELOG

---

## Document Version

| Field | Value |
|-------|-------|
| **Version** | 1.1.0 |
| **Status** | LOCKED |
| **Locked Date** | 2025-02-05 |
| **Phase** | E Complete |

*This document is binding once committed.*
