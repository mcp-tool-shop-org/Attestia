# Architectural Constraints

## Purpose of This Document

This document defines the architectural constraints of the Registrum project.

These constraints are binding.
They exist to ensure that Registrum remains a structural registrar, not an optimizer, agent, or decision system.

Any implementation that violates these constraints is out of scope by definition, even if it is technically correct or useful.

---

## Constitutional Authority

### The Registrar Is Constitutional

The Registrar has constitutional authority over state transitions.

This means:

- All State Transitions must be registered through the Registrar
- No component may bypass or override the Registrar
- The Registrar may reject invalid transitions
- The Registrar may not propose alternatives or corrective actions

The Registrar enforces form, not content.

---

## Mandatory Registration Rule

### No Unregistered Mutation

No Subsystem may:

- mutate State directly
- reorder transitions independently
- infer implicit state changes

All changes to State must occur through:

- explicit Transition creation
- Registration with the Registrar
- deterministic acceptance or rejection

This rule is absolute.

---

## Determinism Requirement

### Deterministic Registration and Ordering

Registrum must be deterministic with respect to:

- registration outcomes
- transition ordering
- invariant enforcement

Given identical inputs, constraints, and ordering rules:

- the same transitions must be accepted or rejected
- the same ordering must result

Non-determinism for convenience, performance, or concurrency is not permitted.

---

## Invariant Enforcement

### Explicit Invariants Only

All invariants must be:

- explicitly declared
- structurally defined
- uniformly enforced

Registrum must not:

- infer invariants
- adapt invariants
- weaken invariants under pressure
- encode semantic or value-based rules as invariants

Invariant violation must be:

- detected
- surfaced
- never silently ignored

---

## Prohibited Capabilities

Registrum must never implement or depend on:

- optimization objectives
- scoring or ranking functions
- reward signals
- learning loops
- adaptive behavior
- feedback-driven parameter tuning
- semantic interpretation
- value judgments

If a feature requires the system to decide that one State is "better" than another, it is prohibited.

---

## Separation of Structure and Meaning

### Structural Neutrality

Registrum must remain structurally neutral.

It may reason about:

- identity
- ordering
- lineage
- constraint satisfaction

It must not reason about:

- correctness
- usefulness
- desirability
- relevance
- importance

Meaning exists outside the system boundary.

---

## Subsystem Constraints

### Subsystems Are Non-Authoritative

Subsystems:

- may propose Transitions
- may compute derived structure
- may index or visualize State

Subsystems may not:

- accept their own transitions
- bypass the Registrar
- reinterpret rejected transitions
- enforce private constraints

All authority flows through the Registrar.

### One-Way Authority Flow

Authority flows in one direction only:

```
Subsystems → Registrar → Accepted State
```

The Registrar does not:

- call back into Subsystems
- request additional information
- suggest corrections
- initiate transitions

This prevents agentic feedback loops.

---

## Failure Handling

### No Silent Failure

Registrum must not:

- silently drop transitions
- auto-correct invalid structure
- degrade constraints under load
- mask invariant violations

Failure must be explicit, observable, and inspectable.

---

## Extension Rules

### Allowed Extensions

Extensions may add:

- new invariants
- new registrable Subsystems
- new inspection or visualization tools
- new structural indices

Extensions must not:

- change Registrar authority
- weaken determinism
- introduce optimization pressure
- reinterpret meaning

### Performance Constraints

Performance considerations must not:

- alter ordering guarantees
- introduce non-determinism
- relax invariants
- obscure failure modes

If performance and legibility conflict, legibility wins.

---

## Language and Terminology Enforcement

Implementation must not introduce:

- agentic terminology
- evaluative language
- normative labels

Prohibited terms listed in DEFINITIONS.md apply here as well.

---

## Violation Handling

Any detected violation of these constraints:

- must be documented
- must block release
- must not be rationalized as "practical necessity"

Constraint violations are correctness failures, not trade-offs.

---

## Status

This document is normative, binding, and frozen as part of Phase 0.5.

Any amendment requires:

- explicit justification
- review against SCIENTIFIC_POSITION.md
- review against DEFINITIONS.md

---

## Summary

Registrum is defined as much by what it forbids as by what it permits.
These constraints exist to ensure that Registrum remains a registrar of structure, not a system of judgment.
