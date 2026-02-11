# Dual-Witness Policy

Registrum maintains two independent invariant engines as a permanent system property.

This is a safety and legibility feature, not technical debt.

---

## Witness Architecture

| Witness | Role | Implementation |
|---------|------|----------------|
| Registry | Primary authority | Compiled DSL (RPEG v1) |
| Legacy | Secondary witness | TypeScript predicates |

Both engines evaluate the same 11 invariants.
Both must agree for a transition to be accepted.

---

## Authority Model

### Registry Engine (Primary)

The registry engine is the **default constitutional authority** as of Phase H.

Properties:
- JSON-inspectable invariant definitions
- External auditability without code reading
- Declarative predicate expressions
- Machine-verifiable structure

### Legacy Engine (Secondary)

The legacy engine serves as an **independent secondary witness**.

Properties:
- Original TypeScript implementation
- Proven correct through exhaustive testing
- Independently evaluates all invariants
- Cannot be overridden by registry

---

## Parity Requirement

### Agreement Required

Both witnesses must accept for a transition to be valid:

```
Registry: ACCEPT ∧ Legacy: ACCEPT → ACCEPTED
```

Any disagreement causes rejection or halt.

### Disagreement Causes Halt

If witnesses disagree, the system halts:

```
Registry: ACCEPT ∧ Legacy: REJECT → HALT
Registry: REJECT ∧ Legacy: ACCEPT → HALT
```

This is fail-closed behavior. There is no auto-resolution.

### Escalation Path

Parity divergence triggers:
1. System halt (immediate)
2. Diagnostic logging
3. Governance escalation
4. Manual resolution required

No automated repair. No preference bias.

---

## Why Two Witnesses?

### Defense in Depth

Two independent implementations reduce the probability of undetected bugs:
- A bug in one engine is caught by the other
- Silent corruption requires simultaneous failure in both
- Audit surface is doubled

### Implementation Independence

The engines share no code:
- Registry: AST evaluation over compiled DSL
- Legacy: Direct TypeScript predicate execution
- Neither can influence the other's evaluation

### Legibility Through Redundancy

External auditors can:
- Read JSON registry (no code required)
- Read TypeScript predicates (code inspection)
- Compare both and verify equivalence

---

## Permanence

Dual-witness architecture is **indefinite**.

There is no plan to:
- Remove the legacy engine
- Make registry the only witness
- Reduce parity enforcement

Any such change would require:
- Class C governance proposal
- Formal guarantee revision
- Constitutional Steward approval

---

## Parity Evidence

Behavioral equivalence is proven by:

| Evidence | Count | Coverage |
|----------|-------|----------|
| Parity tests | 58 | All invariant classes |
| Persistence parity | 12 | Temporal stability |
| Replay parity | Proven | Live ≡ replayed |

Total test coverage: 261 tests across 13 test suites.

---

## Governance Classification

| Change | Classification |
|--------|----------------|
| Rename internal references | Class A |
| Add diagnostic logging | Class A |
| Change parity behavior | Class C |
| Remove either witness | Class C |
| Change escalation path | Class B |

---

## Terminology

| Term | Meaning |
|------|---------|
| Primary authority | Default evaluation path (registry) |
| Secondary witness | Independent verification (legacy) |
| Parity | Behavioral agreement between witnesses |
| Halt | System stop on disagreement |
| Escalation | Governance review required |

---

*This policy document is governed. Changes require formal process.*
