# Governance Scope

This document defines what requires formal governance and what does not.

---

## The Decision Rule

> If a change can alter a test outcome, it is governed.

This is the canonical test. When in doubt, treat a change as governed.

---

## Governed Surfaces

The following surfaces require formal governance process:

### Constitutional Surfaces

| Surface | Why Governed |
|---------|--------------|
| Invariant definitions | Define what valid means |
| Predicate DSL semantics | Determine evaluation behavior |
| Snapshot schema | Affects persistence identity |
| Replay semantics | Determines temporal equivalence |
| Fail-closed vs fail-open | Defines failure behavior |
| Default registrar mode | Determines authority source |
| Version compatibility rules | Affects upgrade paths |
| Deprecation of legacy systems | Changes available guarantees |

### Governance Requirements

Any change to a governed surface requires:

1. Written proposal
2. Explicit evidence
3. Recorded decision
4. Guarantee impact statement

Changes without these artifacts are invalid.

---

## Non-Governed Surfaces

The following may change under maintainer discretion:

| Surface | Example |
|---------|---------|
| Documentation wording | Clarifying prose (not claims) |
| Test refactors | Same coverage, different structure |
| Performance improvements | With proof of behavioral equivalence |
| Internal code organization | File moves, module boundaries |
| CI and tooling | Build scripts, linting rules |
| Development dependencies | Test frameworks, type versions |

### Non-Governed Requirements

Non-governed changes still require:

- Standard code review
- Passing tests
- No behavioral change (or proof of equivalence)

They do not require governance artifacts.

---

## Boundary Cases

### External Attestation Mechanisms

External attestation mechanisms (e.g., XRPL) are permitted only as non-authoritative witnesses.

| Classification | Condition |
|----------------|-----------|
| Class A | Optional, disabled by default, no behavioral impact |
| Class C | Any mechanism that influences validity, acceptance, or recovery |

This closes the loophole permanently: attestation cannot become authoritative without governance.

### Documentation That Makes Claims

Documentation that states guarantees (e.g., `PROVABLE_GUARANTEES.md`) is governed.

Documentation that explains usage is not governed.

### Test Changes

- Adding tests: Not governed
- Removing tests: Governed (reduces coverage surface)
- Changing test assertions: Governed (changes expected behavior)
- Refactoring test structure: Not governed (if coverage identical)

### Performance Changes

Performance improvements are not governed **only if**:

1. Parity tests pass before and after
2. No semantic change is introduced
3. Change is documented as "behavioral equivalent"

If parity cannot be proven, the change is governed.

---

## Escalation Path

If a change's governance status is unclear:

1. Assume it is governed
2. Propose it formally
3. Let the Constitutional Steward determine classification

There is no penalty for over-classifying. There is risk in under-classifying.

---

*This document defines what is governed. It does not define how governance operates.*
