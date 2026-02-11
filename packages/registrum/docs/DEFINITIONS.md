# Definitions

## Purpose of This Document

This document defines the canonical meanings of core terms used in the Registrum project.

These definitions are normative.
Any implementation, documentation, or discussion that uses these terms must conform to the definitions below.

**Rule:**
Any term not defined in this document must not appear in core code without explicit review and amendment of this file.

---

## Core Terms

### State

A State is a complete, explicit representation of a system at a single logical moment.

A State:

- is immutable once registered
- contains no implicit meaning
- may include structure, metadata, and references
- is not evaluated as correct or incorrect by Registrum

### Transition

A Transition is a proposed change from one State to another.

A Transition:

- is directional (from → to)
- is not assumed to be valid
- exists only as a proposal until registered
- has no effect unless accepted by the Registrar

### Registration

Registration is the act of submitting a Transition to the Registrar for validation and ordering.

Registration:

- may succeed or fail
- does not modify content
- results in either acceptance or rejection
- is deterministic given identical inputs and constraints

### Registrar

The Registrar is the constitutional component that validates and orders State Transitions.

The Registrar:

- enforces explicit invariants
- guarantees determinism
- preserves traceability
- may reject invalid transitions
- does not interpret meaning
- does not optimize outcomes
- does not decide what should happen next

### Invariant

An Invariant is a rule that must always hold for a State or Transition to be considered valid.

Invariants:

- are explicit
- are structural, not semantic
- are enforced uniformly
- are not learned or adapted
- may cause rejection when violated

### Constraint

A Constraint is a declared limitation on allowable structure or ordering.

Constraints:

- define permissible forms of change
- do not encode preferences or goals
- do not rank alternatives
- exist to preserve legibility, not correctness

All invariants are constraints, but not all constraints are invariants.

### Structure

Structure refers to the inspectable relationships that make a State legible.

Structure includes:

- identity
- ordering
- lineage
- bounded representation
- explicit relationships

Structure does not imply meaning, value, or correctness.

### Entropy (Operational)

In Registrum, entropy refers to increasing dispersion, uncertainty, or degrees of freedom in evolving State.

This is an operational, not thermodynamic, definition.

Entropy:

- is expected
- is not eliminated
- is constrained to preserve legibility
- is not treated as good or bad

### Legibility

Legibility is the property that a system's structure can be inspected, traced, and reasoned about.

Legibility requires:

- explicit identity
- deterministic ordering
- preserved lineage
- bounded representations

Legibility does not imply interpretability, usefulness, or correctness.

### Subsystem

A Subsystem is a bounded component that produces, transforms, or indexes State.

A Subsystem:

- has no independent authority
- cannot mutate State directly
- must register all transitions through the Registrar
- may not bypass constraints

### Lineage

Lineage is the traceable relationship between States across Transitions.

Lineage:

- records parent–child relationships
- does not imply improvement or degradation
- exists solely for provenance and inspection

### Determinism

Determinism means that identical inputs, constraints, and ordering rules produce identical outcomes.

Determinism:

- is required
- applies to registration and ordering
- does not require predictability of content
- must not be relaxed for convenience

### Ordering

Ordering is the explicit sequencing of accepted State Transitions.

Ordering:

- is enforced by the Registrar
- is deterministic
- does not imply priority, value, or importance

---

## Prohibited Terms (Without Explicit Definition)

The following terms must not appear in core code or documentation unless formally defined and approved:

- optimize / optimization
- goal
- reward
- score
- policy
- agent
- decision
- intelligence
- preference
- better / worse

Their presence is a strong indicator of scope violation.

---

## Status

This document is normative and binding.

Changes require:

- explicit justification
- review for semantic drift
- consistency with SCIENTIFIC_POSITION.md
