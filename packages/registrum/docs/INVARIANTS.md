# Initial Invariant Set

## Purpose of This Document

This document defines the initial invariant set for Registrum.

It is normative and sufficient for Phase 1.
These invariants define the irreducible structural guarantees of Registrum.

If any of these are violated, Registrum is no longer a registrar.

Nothing here encodes value, preference, or optimization.

---

## Invariant Group A — Identity

### A.1 Identity Immutability Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.identity.immutable` |
| **Scope** | Transition |
| **Failure Mode** | Reject |

**Description:**
A registered State's identity must be immutable.
A Transition may not alter the identity of an existing State.

**Condition (Boolean):**
```
IF transition.from != null
THEN transition.to.id == transition.from.id
```

**Rationale:**
Identity is the anchor of legibility.
If identity mutates, lineage and inspection collapse.

---

### A.2 Identity Declaration Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.identity.explicit` |
| **Scope** | State |
| **Failure Mode** | Reject |

**Description:**
Every State must declare an explicit identity.

**Condition (Boolean):**
```
state.id is defined AND state.id is non-empty
```

**Rationale:**
Implicit identity introduces ambiguity and hidden coupling.

---

### A.3 Identity Uniqueness Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.identity.unique` |
| **Scope** | Registration |
| **Failure Mode** | Halt |

**Description:**
No two registered States may share the same identity.

**Condition (Boolean):**
```
state.id NOT IN registrar.registered_state_ids
```

**Rationale:**
Identity collision destroys traceability.

**Note:** Halt indicates systemic corruption, not a local error.

---

## Invariant Group B — Lineage

### B.1 Explicit Parent Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.lineage.explicit` |
| **Scope** | Transition |
| **Failure Mode** | Reject |

**Description:**
Every Transition must explicitly declare its parent State, except for root States.

**Condition (Boolean):**
```
transition.from != null OR transition.to is declared_root
```

**Rationale:**
Implicit ancestry creates unverifiable history.

---

### B.2 Parent Existence Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.lineage.parent_exists` |
| **Scope** | Transition |
| **Failure Mode** | Reject |

**Description:**
A Transition's parent State must exist and be registered.

**Condition (Boolean):**
```
transition.from == null OR transition.from IN registrar.registered_state_ids
```

**Rationale:**
Lineage must be grounded in actual history, not reference by name only.

---

### B.3 Single-Parent Lineage Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.lineage.single_parent` |
| **Scope** | Transition |
| **Failure Mode** | Reject |

**Description:**
A Transition may reference only one parent State.

**Condition (Boolean):**
```
transition.from is a single StateID or null
```

**Rationale:**
Multi-parent merges introduce semantic interpretation unless explicitly modeled later.

---

### B.4 Lineage Continuity Invariant

| Field | Value |
|-------|-------|
| **ID** | `state.lineage.continuous` |
| **Scope** | Registration |
| **Failure Mode** | Halt |

**Description:**
Every accepted Transition must extend an unbroken lineage chain.

**Condition (Boolean):**
```
get_lineage(transition.to.id) forms a continuous sequence with no gaps
```

**Rationale:**
Broken lineage eliminates temporal legibility.

---

## Invariant Group C — Ordering

### C.1 Total Ordering Invariant

| Field | Value |
|-------|-------|
| **ID** | `ordering.total` |
| **Scope** | Registration |
| **Failure Mode** | Halt |

**Description:**
All accepted Transitions must be totally ordered.

**Condition (Boolean):**
```
order_index is defined AND comparable for all registered states
```

**Rationale:**
Partial ordering creates ambiguity in inspection and replay.

---

### C.2 Deterministic Ordering Invariant

| Field | Value |
|-------|-------|
| **ID** | `ordering.deterministic` |
| **Scope** | Registration |
| **Failure Mode** | Halt |

**Description:**
Ordering must be deterministic given identical inputs.

**Condition (Boolean):**
```
same inputs → same order_index
```

**Rationale:**
Non-determinism destroys reproducibility and auditability.

---

### C.3 Monotonic Ordering Invariant

| Field | Value |
|-------|-------|
| **ID** | `ordering.monotonic` |
| **Scope** | Registration |
| **Failure Mode** | Reject |

**Description:**
Order indices must increase monotonically.

**Condition (Boolean):**
```
new_order_index > max(existing_order_indices)
```

**Rationale:**
Time must not move backward.

---

### C.4 Ordering Neutrality Invariant

| Field | Value |
|-------|-------|
| **ID** | `ordering.non_semantic` |
| **Scope** | Registrar |
| **Failure Mode** | Halt |

**Description:**
Ordering must not depend on State content or meaning.

**Condition (Boolean):**
```
ordering_key uses only structural metadata
```

**Rationale:**
Content-based ordering introduces implicit evaluation.

---

## Explicitly Forbidden "Invariants"

The following are not allowed, even if expressed declaratively:

- ❌ "Prefer lower entropy"
- ❌ "Reject unstable states"
- ❌ "Optimize lineage clarity"
- ❌ "Minimize branching"
- ❌ "Encourage convergence"

These encode value judgments, not structure.

---

## Minimal Completeness Guarantee

If all invariants above hold, Registrum guarantees:

- Identity is stable
- History is traceable
- Time is well-defined
- Inspection is possible
- Entropy is bounded structurally, not semantically

Nothing more is claimed.

---

## Invariant Summary Table

| ID | Scope | Failure Mode |
|----|-------|--------------|
| `state.identity.immutable` | Transition | Reject |
| `state.identity.explicit` | State | Reject |
| `state.identity.unique` | Registration | Halt |
| `state.lineage.explicit` | Transition | Reject |
| `state.lineage.parent_exists` | Transition | Reject |
| `state.lineage.single_parent` | Transition | Reject |
| `state.lineage.continuous` | Registration | Halt |
| `ordering.total` | Registration | Halt |
| `ordering.deterministic` | Registration | Halt |
| `ordering.monotonic` | Registration | Reject |
| `ordering.non_semantic` | Registrar | Halt |

---

## Status

This invariant set is:

- Normative
- Sufficient for Phase 1
- Frozen unless explicitly amended

Any Phase 1 implementation that violates any invariant above is incorrect, regardless of convenience or performance.
