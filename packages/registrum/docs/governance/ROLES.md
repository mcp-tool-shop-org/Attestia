# Governance Roles

Registrum uses minimal, explicit roles. Authority is declared, not assumed.

---

## Constitutional Steward

The Constitutional Steward holds final authority over governed changes.

### Responsibilities

- Accept or reject governed proposals
- Enforce guarantee preservation
- Maintain scientific integrity
- Ensure decision artifacts are complete
- Protect invariant definitions

### Powers

- Approve Class B and Class C changes
- Veto changes that threaten guarantees
- Invoke emergency powers (see `EMERGENCY_POWERS.md`)
- Determine change classification when unclear

### Limitations

- Cannot change behavior without documented process
- Cannot bypass invariant enforcement
- Cannot override replay determinism
- Cannot approve changes without evidence
- Cannot act without producing artifacts

### Accountability

The Steward is bound by the same rules as contributors. The role grants decision authority, not exemption from process.

This role exists even if held by one person.

---

## Contributors

Contributors are anyone who proposes or implements changes.

### May Do

- Propose governed changes
- Provide evidence for proposals
- Implement approved decisions
- Modify non-governed surfaces
- Review other proposals

### May Not Do

- Approve their own governed proposals
- Merge governed changes without Steward approval
- Modify governed surfaces without process
- Override or reinterpret past decisions

### Evidence Burden

Contributors bear the burden of proof. Proposals without evidence are incomplete.

---

## Reviewers (Optional)

Reviewers provide critique but do not decide outcomes.

### May Do

- Critique proposals
- Review evidence quality
- Identify risks and gaps
- Request clarification
- Recommend approval or rejection

### May Not Do

- Approve or reject proposals
- Override Steward decisions
- Block changes without governance basis

### Non-Binding

Reviewer feedback is advisory. The Steward may accept or reject it.

---

## Role Boundaries

### What Registrum Avoids

| Anti-Pattern | Why Avoided |
|--------------|-------------|
| Committee governance | Diffuses accountability |
| Consensus voting | Popularity ≠ correctness |
| Implicit authority | Unclear who decides |
| Role proliferation | Complexity without benefit |

### Single Point of Authority

Registrum intentionally has one decision-maker for governed changes. This is a feature, not a limitation.

Distributed authority creates:
- Ambiguity about who approves
- Deadlock when opinions differ
- Pressure to compromise correctness

Single authority creates:
- Clear accountability
- Fast decisions
- No political negotiation

---

## Role Assignment

Roles are assigned explicitly, not assumed.

| Role | Assignment |
|------|------------|
| Constitutional Steward | Declared in repository |
| Contributor | Anyone with commit access |
| Reviewer | Anyone invited to review |

The Steward role may transfer, but transfer must be explicit and documented.

---

## Succession

If the Constitutional Steward is unavailable:

1. Governed changes are blocked
2. Non-governed changes may proceed
3. A successor must be explicitly named before governance resumes

There is no "acting" or "interim" authority. The role is held or vacant.

---

*This document defines who holds authority. It does not define how decisions are made.*
