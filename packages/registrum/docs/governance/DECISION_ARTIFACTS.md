# Decision Artifacts

Every governed decision must produce artifacts. Decisions without artifacts are invalid.

---

## Required Artifacts by Class

| Artifact | Class A | Class B | Class C |
|----------|---------|---------|---------|
| Proposal Document | — | Required | Required |
| Evidence | — | Required | Required |
| Decision Record | — | Required | Required |
| Guarantee Impact Statement | — | Optional | Required |
| Rollback Plan | — | Required | Optional |
| Migration Path | — | Optional | Required |

---

## Artifact Definitions

### Proposal Document

**Location:** `docs/proposals/NNN-TITLE.md`

**Purpose:** Formally requests a governed change.

**Contents:**
- Change classification (B or C)
- Rationale (why this change)
- Scope (what changes)
- Evidence summary (where proof exists)
- Risk assessment
- Rollback strategy (for Class B)

**Naming:** Sequential number + descriptive title
- `001-PHASE_D_CUTOVER.md`
- `002-INVARIANT_ORDERING_REVISION.md`

### Evidence

**Location:** Varies (tests, reports, documents)

**Purpose:** Proves claims made in proposal.

**Types:**
| Evidence Type | Source |
|---------------|--------|
| Parity test results | `tests/parity/` output |
| Replay parity | `tests/parity/persistence.parity.test.ts` |
| Migration criteria | `MIGRATION_CRITERIA.md` checklist |
| Behavioral equivalence | Before/after test comparison |

**Requirement:** Evidence must be reproducible. "Trust me" is not evidence.

### Decision Record

**Location:** `docs/decisions/NNN-TITLE.md`

**Purpose:** Documents the outcome of governance review.

**Contents:**
- Decision (approved/rejected/deferred)
- Date
- Proposal reference
- Evidence reviewed
- Rationale for decision
- Conditions (if any)
- Steward signature (name/identifier)

**Naming:** Matches proposal number
- Proposal: `001-PHASE_D_CUTOVER.md`
- Decision: `001-PHASE_D_CUTOVER.md`

### Guarantee Impact Statement

**Location:** Within proposal or decision document

**Purpose:** Explicitly states what guarantees change.

**Format:**
```
## Guarantee Impact

### Unchanged
- [List guarantees that remain identical]

### Modified
- [List guarantees that change, with before/after]

### Added
- [List new guarantees introduced]

### Removed
- [List guarantees no longer provided]
```

**Requirement:** Class C changes must have explicit guarantee delta.

### Rollback Plan

**Location:** Within proposal document

**Purpose:** Defines how to reverse the change if needed.

**Contents:**
- Trigger conditions (when to rollback)
- Rollback steps
- Verification after rollback
- Data/state implications

**Requirement:** Class B changes must have viable rollback.

### Migration Path

**Location:** Within proposal or separate document

**Purpose:** Guides users through the change.

**Contents:**
- What users must do
- Timeline
- Compatibility notes
- Breaking changes (if any)

**Requirement:** Class C changes must document user impact.

---

## Artifact Lifecycle

### Creation

1. Contributor creates proposal
2. Contributor compiles evidence
3. Contributor submits for review

### Review

1. Steward reviews proposal
2. Steward verifies evidence
3. Steward requests clarification (if needed)

### Decision

1. Steward approves, rejects, or defers
2. Steward creates decision record
3. Decision record references all artifacts

### Archive

All artifacts remain in repository permanently.
- Proposals are never deleted
- Decisions are never modified after recording
- Evidence must remain reproducible

---

## Artifact Validation

A governed change is blocked if:

- Proposal document is missing
- Evidence is insufficient or unreproducible
- Decision record is incomplete
- Class C lacks guarantee impact statement
- Class B lacks rollback plan

No exceptions. Process integrity is non-negotiable.

---

## Directory Structure

```
docs/
├── proposals/
│   ├── 001-PHASE_D_CUTOVER.md
│   ├── 002-FUTURE_CHANGE.md
│   └── ...
├── decisions/
│   ├── 001-PHASE_D_CUTOVER.md
│   ├── 002-FUTURE_CHANGE.md
│   └── ...
└── governance/
    ├── PHILOSOPHY.md
    ├── SCOPE.md
    ├── ROLES.md
    ├── CHANGE_CLASSES.md
    ├── DECISION_ARTIFACTS.md
    └── templates/
        └── ...
```

---

*This document defines required artifacts. Templates are in `governance/templates/`.*
