# Phase 1 Specification — Registrar Core

## Purpose of This Document

This document defines the implementation specification for Phase 1.

It is normative for Phase 1 only.
It must not be extended without review against all Phase 0.5 documents.

---

## Phase 1 Goal

Implement a minimal Structural Registrar that:

- accepts transitions
- enforces invariants
- preserves determinism
- exposes no behavior beyond that

**Core Design Rule:**
Make it impossible to mutate state without registration.

Nothing else.

---

## Registrar Interface Contract

The Registrar is a pure structural authority.
It accepts proposed transitions, validates them against explicit invariants, and returns a deterministic result.

### What the Registrar Does

- Accepts proposed Transitions
- Validates against declared Invariants
- Enforces ordering rules
- Returns deterministic results

### What the Registrar Does NOT Do

- Mutate state
- Interpret meaning
- Propose alternatives
- Retry, adapt, or optimize
- Call back into Subsystems
- Suggest corrections
- Initiate transitions

---

## Required Capabilities

The Registrar exposes exactly four capabilities:

### 1. register(transition) → RegistrationResult

Registers a proposed Transition.

**Inputs:**
- `transition`
  - `from_state` (reference)
  - `to_state` (candidate)
  - `metadata` (structural only)
  - declared invariants to apply (explicit)

**Behavior:**
- Validates transition against all applicable invariants
- Enforces ordering rules
- Produces a deterministic outcome

**Outputs:**
- Acceptance or rejection
- Explicit reasons on rejection
- Registered ordering index on acceptance

### 2. validate(state | transition) → ValidationReport

Validates a State or Transition without registering it.

**Used for:**
- Inspection
- Testing
- Diagnostics

**Must not:**
- Modify system state
- Cache or adapt behavior

### 3. list_invariants() → InvariantDescriptor[]

Returns all active invariants.

**Purpose:**
- Inspectability
- Auditability
- Scientific transparency

### 4. get_lineage(state_id) → LineageTrace

Returns the traceable ancestry of a State.

This is read-only and must not infer meaning.

---

## Explicit Non-Capabilities

The Registrar must not expose:

- Scoring APIs
- Ranking APIs
- Callbacks
- Hooks that mutate behavior
- Retry logic
- Policy selection

**Rule:** If it feels convenient, it's probably forbidden.

---

## Determinism Guarantee

Given:
- Identical transitions
- Identical invariants
- Identical ordering rules

The Registrar must:
- Accept or reject identically
- Produce identical ordering
- Produce identical diagnostics

This is a hard guarantee, not best-effort.

---

## Invariant Declaration Syntax

Invariants are where most systems accidentally become agents.
Registrum avoids this by making invariants explicit, structural, and non-evaluative.

### Invariant Design Rules

An invariant must be:

- Declarative, not procedural
- Structural, not semantic
- Boolean, not scalar
- Context-free, unless explicitly scoped
- Non-adaptive

No invariant may:

- Rank alternatives
- Express preference
- Depend on success or outcome
- Inspect semantic content

### Canonical Invariant Shape

```
Invariant {
  id: string
  scope: State | Transition
  applies_to: explicit structural fields
  condition: predicate(State | Transition) → true | false
  failure_mode: reject | halt
  description: human-readable, neutral
}
```

### Example Invariants (Illustrative)

**Identity Invariant:**
```
Invariant:
  id: "state.identity.immutable"
  scope: Transition
  condition:
    to_state.identity == from_state.identity OR new_identity_declared
```

**Lineage Invariant:**
```
Invariant:
  id: "state.lineage.continuous"
  scope: Transition
  condition:
    to_state.parent == from_state.id
```

**Deterministic Ordering Invariant:**
```
Invariant:
  id: "ordering.deterministic"
  scope: Registration
  condition:
    ordering_key is total and collision-free
```

### Explicitly Forbidden Invariant Patterns

- ❌ "Prefer lower entropy states"
- ❌ "Reject worse states"
- ❌ "Optimize for clarity"
- ❌ "Increase stability"
- ❌ "Maximize structure"

These encode value judgments.

### Invariant Failure Semantics

When an invariant fails:

- Registration is rejected
- Failure reason is explicit
- No fallback is attempted
- No automatic correction is applied

Failure is terminal and informative.

---

## Phase 1 Commit Plan

### Commit 1 — Core Types

**Purpose:** Vocabulary in code must match DEFINITIONS.md

Types to define:
- State
- Transition
- RegistrationResult
- Invariant
- ValidationReport

❗ No behavior yet.

### Commit 2 — Registrar Skeleton

**Purpose:** Enforce authority boundaries

- Registrar interface
- Stubbed methods:
  - register
  - validate
  - list_invariants
  - get_lineage

All methods may throw NotImplemented initially.

### Commit 3 — Invariant Evaluation Engine

**Purpose:** Pure constraint checking

- Invariant registry
- Deterministic evaluation order
- Boolean evaluation only
- Explicit failure reporting

No side effects.

### Commit 4 — Registration Logic

**Purpose:** Make registration real

- Accept/reject transitions
- Enforce ordering
- Produce immutable RegistrationResult

Still no persistence layer.

### Commit 5 — Determinism Tests

**Purpose:** Prove guarantees

- Same input → same output
- Invariant failure surfaced
- Ordering stable

Tests are part of the spec here.

### Commit 6 — Documentation Lock

**Purpose:** Prevent accidental expansion

- Update README with Phase 1 completion note
- Add "Phase 1 exit criteria met"
- Explicitly state what is still forbidden

---

## Phase 1 Exit Criteria

Phase 1 is complete only if:

1. All state mutation requires registration
2. Invariants are explicit and inspectable
3. Registration is deterministic
4. No optimization or semantics exist
5. Tests enforce the above

If any of these fail, Phase 1 is not complete.

---

## Status

This document is normative for Phase 1.

Any amendment requires review against:

- SCIENTIFIC_POSITION.md
- DEFINITIONS.md
- ARCHITECTURAL_CONSTRAINTS.md
- FAILURE_MODES.md
