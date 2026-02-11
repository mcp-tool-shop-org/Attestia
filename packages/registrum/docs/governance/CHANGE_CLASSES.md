# Change Classes

Every proposed change must declare its class. Classification determines process.

---

## Class A — Non-Semantic Change

Changes that cannot affect behavior.

### Examples

- Code refactors (same tests pass)
- Comment additions or corrections
- Documentation clarifications (non-claims)
- Performance improvements with parity proof
- Internal file reorganization
- Dependency updates (non-breaking)

### Requirements

- Standard code review
- All tests pass
- No behavioral change

### Process

- Normal pull request
- Maintainer approval
- No governance artifacts required

### Evidence

None required beyond passing tests.

---

## Class B — Semantic-Preserving Structural Change

Changes that alter structure but preserve behavior.

### Examples

- Registry mode becoming default (Phase D)
- Replacing legacy implementation with proven-equivalent system
- Internal engine swaps with parity proof
- Snapshot schema migration (format change, not semantic)
- Moving authority from one equivalent system to another

### Requirements

- Parity harness evidence (legacy ≡ registry)
- Replay parity evidence (live ≡ replay)
- Written migration rationale
- Explicit rollback plan
- Guarantee impact statement

### Process

1. Formal proposal document
2. Evidence compilation
3. Constitutional Steward review
4. Decision record

### Evidence

| Required | Source |
|----------|--------|
| Parity tests pass | `tests/parity/` |
| Replay parity | `tests/parity/persistence.parity.test.ts` |
| Migration criteria met | `MIGRATION_CRITERIA.md` |

### Decision Authority

Constitutional Steward approval required.

---

## Class C — Semantic Change

Changes that alter guarantees or introduce new behavior.

### Examples

- New invariant classes
- Changes to predicate grammar
- Changes to failure behavior (fail-closed → fail-open)
- Changes to snapshot semantics
- Changes to replay semantics
- Removal of existing guarantees

### Requirements

- Formal proposal document
- Proof that existing guarantees remain intact OR
- Explicit revision of guarantee surface
- New tests demonstrating revised guarantees
- Version bump (major)
- Extended review period

### Process

1. Formal proposal with rationale
2. Impact analysis on all downstream systems
3. New test coverage for changed behavior
4. Constitutional Steward review
5. Explicit acceptance of revised guarantees
6. Decision record with guarantee delta

### Evidence

| Required | Purpose |
|----------|---------|
| Existing test suite passes | No regression |
| New tests for new behavior | Coverage of change |
| Guarantee impact statement | Documents what changed |
| Migration path | How users adapt |

### Decision Authority

Constitutional Steward approval required.

Steward must explicitly acknowledge guarantee changes.

---

## Classification Decision Tree

```
Is behavioral change possible?
├── No → Class A
└── Yes
    ├── Is behavior proven equivalent?
    │   ├── Yes → Class B
    │   └── No → Class C
    └── Are guarantees changing?
        ├── No → Class B
        └── Yes → Class C
```

---

## Misclassification

### Under-Classification Risk

Treating a Class B/C change as Class A:
- Bypasses evidence requirements
- May introduce undetected semantic drift
- Invalidates governance integrity

### Over-Classification Cost

Treating a Class A change as Class B/C:
- Adds process overhead
- No correctness risk
- Acceptable when uncertain

### Rule

When classification is unclear, escalate:
- A → B: Safe
- B → C: Safe
- C → B: Requires justification
- B → A: Requires proof

---

## Class Summary

| Class | Behavior Change | Governance | Artifacts |
|-------|-----------------|------------|-----------|
| A | None | No | None |
| B | Structural only | Yes | Proposal, Evidence, Decision |
| C | Semantic | Yes | Proposal, Evidence, Decision, Guarantee Impact |

---

*This document defines change taxonomy. Process details are in `DECISION_ARTIFACTS.md`.*
