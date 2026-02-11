# Decision Record Template

Use this template to record governance decisions.

Copy this file to `docs/decisions/NNN-TITLE.md` matching the proposal number.

---

# Decision: [TITLE]

**Decision Number:** NNN
**Date:** YYYY-MM-DD
**Proposal Reference:** `docs/proposals/NNN-TITLE.md`
**Classification:** Class B / Class C
**Decision:** Approved / Rejected / Deferred

---

## Decision Statement

[One sentence stating the decision]

---

## Proposal Summary

[Brief summary of what was proposed]

---

## Evidence Reviewed

| Evidence | Location | Status |
|----------|----------|--------|
| Parity tests | `tests/parity/` | Verified / Not Verified |
| Replay parity | `tests/parity/persistence.parity.test.ts` | Verified / Not Verified |
| Migration criteria | `MIGRATION_CRITERIA.md` | Met / Not Met |
| [Additional] | [Location] | [Status] |

---

## Rationale

**Why this decision?**

[Explain the reasoning behind approval, rejection, or deferral]

---

## Conditions

<!-- If approved with conditions, list them here -->

- [ ] [Condition 1]
- [ ] [Condition 2]

---

## Guarantee Acknowledgment

<!-- For Class C decisions -->

The following guarantee changes are explicitly acknowledged:

### Modified Guarantees

- [Guarantee]: [Change description]

### Removed Guarantees

- [Guarantee]: [Reason for removal]

### Added Guarantees

- [Guarantee]: [Description]

---

## Implementation Authorization

<!-- For approved decisions -->

**Authorized Actions:**

- [ ] [Action 1]
- [ ] [Action 2]

**Not Authorized:**

- [Explicitly excluded actions]

---

## Effective Date

[When does this decision take effect?]

---

## Version Impact

| Current Version | New Version | Bump Type |
|-----------------|-------------|-----------|
| [X.Y.Z] | [X.Y.Z] | Patch / Minor / Major |

---

## Steward Signature

**Constitutional Steward:** [Name/Identifier]
**Date:** YYYY-MM-DD

---

## Post-Decision Notes

<!-- Added after implementation if needed -->

[Any notes about implementation, issues, or follow-up]

---

*Template version: 1.0*
