# Contributing to Registrum

Before code exists, this file sets tone.

---

## Contribution Philosophy

### Correctness > Features

A correct implementation of a small scope is better than an incorrect implementation of a large scope.
Do not add features to compensate for correctness issues.

### Restraint > Cleverness

Simple, boring implementations are preferred.
Clever solutions introduce hidden complexity.
If a solution requires explanation, it is probably wrong for Registrum.

---

## Proposal Requirements

Every proposal must answer:

### What invariant does this add or strengthen?

If the answer is "none," the proposal does not belong in Registrum.
Registrum grows by adding constraints, not capabilities.

### What new failure mode does it introduce?

Every change introduces potential failure.
Proposals must explicitly state what can go wrong.
If the failure mode is not documented, the proposal is incomplete.

### Does this preserve determinism?

If the change introduces any source of non-determinism, it must be rejected.
Determinism is non-negotiable.

### Does this introduce semantic interpretation?

If the change requires the system to interpret meaning, it must be rejected.
Registrum is structural, not semantic.

---

## Rejection Is Normal

Most proposals will be rejected.

This is not failure. This is the system working.

Registrum's value comes from what it refuses to do.
A proposal that is rejected has still contributed by testing the boundaries.

### Common Rejection Reasons

- Introduces optimization pressure
- Requires semantic interpretation
- Adds capability without constraint
- Violates determinism
- Cannot state its failure modes
- Expands scope beyond the current phase

---

## How to Contribute

1. Read the documentation first:
   - README.md (mission and non-goals)
   - docs/SCIENTIFIC_POSITION.md (what we claim and don't claim)
   - docs/DEFINITIONS.md (locked terminology)
   - docs/ARCHITECTURAL_CONSTRAINTS.md (what cannot be built)
   - docs/FAILURE_MODES.md (how we can fail)
   - docs/ROADMAP.md (current phase and constraints)

2. Open an issue before writing code.
   - State what invariant you propose to add or strengthen.
   - State what failure modes your change introduces.
   - Wait for discussion.

3. If the issue is accepted, submit a pull request.
   - Keep changes minimal and atomic.
   - Include tests that verify invariants.
   - Update documentation if terminology changes.

4. Expect review to be slow and thorough.
   - Correctness takes time.
   - Questions are not criticism.

---

## Code of Conduct

Be precise. Be patient. Be willing to be wrong.

Registrum is a technical project with a narrow scope.
Disagreements should be resolved by reference to documented constraints, not preference.
