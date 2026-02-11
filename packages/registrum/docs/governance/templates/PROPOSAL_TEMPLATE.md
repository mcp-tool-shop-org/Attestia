# Proposal Template

Use this template for Class B and Class C governance proposals.

Copy this file to `docs/proposals/NNN-TITLE.md` and fill in all sections.

---

# Proposal: [TITLE]

**Proposal Number:** NNN
**Date:** YYYY-MM-DD
**Author:** [Name/Identifier]
**Classification:** Class B / Class C
**Status:** Draft / Under Review / Approved / Rejected / Deferred

---

## Summary

[One paragraph describing the proposed change]

---

## Classification Rationale

**Why this classification?**

- [ ] Class B: Structural change with proven behavioral equivalence
- [ ] Class C: Semantic change affecting guarantees

[Explain why this change falls into the declared class]

---

## Motivation

**Why is this change needed?**

[Explain the problem or opportunity this change addresses]

---

## Scope

**What changes?**

[List all files, systems, or behaviors affected]

| Component | Change |
|-----------|--------|
| [Component] | [Description] |

**What does NOT change?**

[Explicitly state what remains unchanged]

---

## Evidence

**Parity Evidence (Class B required):**

- [ ] Parity tests pass: `tests/parity/`
- [ ] Replay parity: `tests/parity/persistence.parity.test.ts`
- [ ] Migration criteria met: `MIGRATION_CRITERIA.md`

**Test Evidence:**

| Test Suite | Status | Notes |
|------------|--------|-------|
| [Suite] | Pass/Fail | [Notes] |

**Additional Evidence:**

[Links to test runs, reports, or other proof]

---

## Guarantee Impact

<!-- Required for Class C, optional for Class B -->

### Unchanged

- [List guarantees that remain identical]

### Modified

- [List guarantees that change]
  - Before: [previous behavior]
  - After: [new behavior]

### Added

- [List new guarantees introduced]

### Removed

- [List guarantees no longer provided]

---

## Rollback Plan

<!-- Required for Class B -->

**Trigger Conditions:**

[When would rollback be necessary?]

**Rollback Steps:**

1. [Step 1]
2. [Step 2]
3. [Verification]

**State Implications:**

[What happens to existing data/state on rollback?]

---

## Migration Path

<!-- Required for Class C -->

**User Actions Required:**

[What must users do to adapt?]

**Timeline:**

[When do changes take effect?]

**Compatibility:**

[Backward/forward compatibility notes]

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk] | Low/Med/High | Low/Med/High | [Mitigation] |

---

## Open Questions

- [ ] [Question 1]
- [ ] [Question 2]

---

## References

- [Link to related documents]
- [Link to relevant tests]
- [Link to prior discussions]

---

*Template version: 1.0*
