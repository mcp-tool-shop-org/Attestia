# Registrum Ecosystem Roadmap

*Alternative Engines & Visualization Layers*

---

## Purpose of This Roadmap

This document outlines potential, governed future work around Registrum's ecosystem:

- Alternative registrar engines
- Visualization and inspection layers

**It is not a promise, not a plan, and not authorization.**

Any item listed here requires governance approval before implementation.

The goal is to:

- Clarify what kinds of expansion are structurally compatible
- Prevent accidental semantic creep
- Provide a shared mental model for contributors and reviewers

---

## Guiding Constraints (Non-Negotiable)

All future ecosystem components must obey:

| Constraint | Meaning |
|------------|---------|
| Core semantics are closed | No changes without Class B/C governance |
| Authority flows inward only | External systems cannot influence decisions |
| Disagreement halts; it never heals | No auto-resolution |
| Witnesses observe; they do not decide | Read-only relationship |
| Visualization is read-only | No control paths back |
| Parity is evidence, not aspiration | Must be proven, not assumed |

**Anything violating these is out of scope.**

---

## Track A — Alternative Registrar Engines

*Governance Class B: Always*

### A.1 Reference Reimplementation (Different Language)

**Description**

A clean-room implementation of the Registrar in another language (e.g., Rust, OCaml).

**Purpose**

- Validate semantic completeness of the spec
- Reduce monoculture risk
- Improve long-term survivability

**Requirements**

- [ ] Full parity harness
- [ ] Snapshot & replay parity
- [ ] No additional invariants
- [ ] No performance-driven semantic shortcuts

**Status:** Conceptual only. Requires Class B proposal + evidence.

---

### A.2 Minimal Kernel Engine

**Description**

A deliberately minimal registrar that implements only identity, lineage, and ordering.

**Purpose**

- Test whether the invariant set is irreducible
- Provide a pedagogical / audit-focused engine
- Serve as a baseline witness

**Requirements**

- [ ] Structural parity on accepted/rejected transitions
- [ ] Explicit rejection of extended metadata
- [ ] Read-only role in multi-engine setups

**Risk:** High risk of accidental semantic divergence → Requires strong parity proof.

**Status:** Conceptual only. Requires Class B proposal + evidence.

---

### A.3 Verified / Formally Modeled Engine

**Description**

An engine specified or verified using a formal method (e.g., TLA+, Coq model).

**Purpose**

- Prove properties about invariants
- Bound the space of possible behaviors
- Strengthen confidence, not replace execution

**Important**

- The formal model is a witness, not the authority
- Discrepancies halt; they do not resolve

**Status:** Conceptual only. Requires Class B proposal + evidence.

---

## Track B — Visualization & Inspection Layers

*Governance Class A: Read-Only Only*

### B.1 Timeline & Replay Inspector

**Description**

A UI that:

- Loads snapshots
- Replays transitions
- Shows invariant evaluations over time

**Explicit Limits**

- No controls that affect state
- No "warnings" beyond factual display
- No recommendations

**Value:** Debugging, auditing, education.

**Status:** Conceptual only. Requires Class A verification (read-only proof).

---

### B.2 Parity Disagreement Visualizer

**Description**

A visualization that highlights:

- Where engines agree
- Where they diverge
- Which invariant failed

**Purpose**

- Make disagreement legible
- Reduce pressure to auto-resolve
- Encourage escalation over automation

**Status:** Conceptual only. Requires Class A verification.

---

### B.3 Witness & Attestation Viewer

**Description**

A read-only viewer for:

- XRPL attestations
- Other external witnesses
- Timestamp alignment vs snapshots

**Constraints**

- Cannot be consulted by Registrar
- Cannot gate replay
- Cannot imply correctness beyond "was recorded"

**Status:** Conceptual only. Requires Class A verification.

---

### B.4 Structural Diff Explorer

**Description**

Tooling to compare:

- Two snapshots
- Two replay histories
- Two engines' outputs

**Language Rules**

| ✅ Allowed | ❌ Prohibited |
|------------|---------------|
| "Different" | "Better" |
| "Identical" | "Worse" |
| "Accepted/Rejected" | "Correct/Incorrect" (unless tied to invariant) |

**Status:** Conceptual only. Requires Class A verification.

---

## Track C — Educational & Research Artifacts

*Non-Governed, Out-of-Core*

These are explicitly outside the Registrum codebase but aligned with it.

**Examples:**

- Papers
- Tutorials
- Case studies
- Recorded talks
- External datasets

**Constraints:**

- Must treat Registrum as fixed
- Must not imply roadmap authority
- Must not promise future behavior

---

## What This Roadmap Is Not

| ❌ Not | Why |
|--------|-----|
| A backlog | No ordering or priority |
| A commitment | No promise of implementation |
| A prioritization | No sequencing |
| A signal that change is expected | Status quo is valid indefinitely |

**It exists to bound imagination, not accelerate it.**

---

## Governance Reminder

Every item above requires:

1. A proposal (`docs/proposals/NNN-TITLE.md`)
2. Classification (A / B / C)
3. Evidence appropriate to its class
4. A recorded decision (`docs/decisions/NNN-TITLE.md`)

Absent that, this roadmap is inert by design.

---

## Relationship to Current State

| Component | Status | Track |
|-----------|--------|-------|
| Registry engine | ✅ Default | — |
| Legacy engine | ✅ Secondary witness | — |
| XRPL attestation | ✅ Optional | — |
| Alternative engines | Conceptual | A |
| Visualization layers | Conceptual | B |
| Educational materials | Out-of-core | C |

---

## Closing Statement

> Registrum grows by adding witnesses, not power.
> It becomes clearer by adding views, not decisions.
> And it remains correct by refusing to optimize itself.

This roadmap exists to ensure that if growth happens, it happens without surprise.

---

*This document is non-binding and illustrative.*
*It does not authorize any implementation.*
*Changes to this roadmap are Class A (documentation).*
