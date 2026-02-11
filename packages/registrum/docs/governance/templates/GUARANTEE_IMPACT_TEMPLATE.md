# Guarantee Impact Template

Use this template to document guarantee changes for Class C proposals.

This may be embedded in a proposal or created as a standalone document.

---

# Guarantee Impact: [CHANGE TITLE]

**Related Proposal:** `docs/proposals/NNN-TITLE.md`
**Date:** YYYY-MM-DD
**Author:** [Name/Identifier]

---

## Current Guarantee Surface

Reference: `docs/PROVABLE_GUARANTEES.md`

The following guarantees exist before this change:

### Determinism Guarantees

| Guarantee | Status |
|-----------|--------|
| Same inputs → same outputs | Active |
| No external state dependency | Active |
| Order-independent evaluation | Active |

### Persistence Guarantees

| Guarantee | Status |
|-----------|--------|
| Snapshot stability | Active |
| Rehydration correctness | Active |
| Replay determinism | Active |

### Failure Guarantees

| Guarantee | Status |
|-----------|--------|
| Fail-closed on invalid input | Active |
| No partial state on failure | Active |
| Explicit error classification | Active |

---

## Impact Analysis

### Unchanged Guarantees

The following guarantees remain **identical** after this change:

- [ ] [Guarantee 1] — [Why unchanged]
- [ ] [Guarantee 2] — [Why unchanged]

**Evidence:** [How this is proven]

### Modified Guarantees

The following guarantees **change** with this proposal:

#### [Guarantee Name]

| Aspect | Before | After |
|--------|--------|-------|
| Behavior | [Previous] | [New] |
| Scope | [Previous] | [New] |
| Conditions | [Previous] | [New] |

**Rationale:** [Why this modification is acceptable]

**Migration:** [How existing users adapt]

### Added Guarantees

The following guarantees are **introduced** by this change:

- [ ] [New Guarantee 1]
  - Description: [What it guarantees]
  - Evidence: [How it's proven]
  - Tests: [Where tested]

### Removed Guarantees

The following guarantees are **no longer provided** after this change:

- [ ] [Removed Guarantee 1]
  - Previous behavior: [What was guaranteed]
  - Reason for removal: [Why removed]
  - Migration path: [What users should do instead]

---

## Compatibility Matrix

| Existing Behavior | After Change | Compatible? |
|-------------------|--------------|-------------|
| [Behavior 1] | [New behavior] | Yes / No |
| [Behavior 2] | [New behavior] | Yes / No |

---

## Test Coverage

### Existing Tests

| Test | Covers | Still Valid? |
|------|--------|--------------|
| [Test 1] | [Guarantee] | Yes / No / Modified |

### New Tests Required

| Test | Covers | Location |
|------|--------|----------|
| [New Test 1] | [New Guarantee] | [Path] |

### Tests to Remove

| Test | Reason |
|------|--------|
| [Test] | [No longer applicable because...] |

---

## Downstream Impact

### Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| [System 1] | [Description] | [Action] |

### User-Facing Changes

| Change | User Action |
|--------|-------------|
| [Change] | [What users must do] |

---

## Rollback Implications

If this change is rolled back:

- [ ] [Guarantee 1] returns to previous behavior
- [ ] [Data/state implication]
- [ ] [User notification required]

---

## Acceptance Criteria

This guarantee impact is acceptable if:

- [ ] All unchanged guarantees have passing tests
- [ ] All modified guarantees have updated tests
- [ ] All new guarantees have new tests
- [ ] All removed guarantees have documented migration
- [ ] Constitutional Steward explicitly acknowledges changes

---

## Steward Acknowledgment

**I acknowledge the above guarantee changes:**

- [ ] Unchanged guarantees verified
- [ ] Modified guarantees acceptable
- [ ] Added guarantees covered by tests
- [ ] Removed guarantees have migration path

**Steward:** [Name/Identifier]
**Date:** YYYY-MM-DD

---

*Template version: 1.0*
