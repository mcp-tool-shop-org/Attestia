# Ecosystem Expansion Policy

Registrum's core is closed; its witnesses are open, but never authoritative.

This creates a hub-and-spoke architecture:
- The Registrar core is immutable without Class B/C governance
- Witnesses and lenses may grow, but can never write back

---

## Governing Principle

> Authority flows inward. Observation flows outward.

No external system may influence Registrum's decisions.
Any system may observe Registrum's decisions.

---

## Category 1: External Witnesses (Non-Authoritative)

### Definition

External systems that record Registrum decisions, snapshots, or hashes for:
- Auditability
- Reproducibility
- Cross-institutional trust

### Examples

| System | Purpose |
|--------|---------|
| XRPL | Immutable ledger attestation |
| Other ledgers | Multi-chain witnessing |
| Timestamping services | Institutional proof-of-existence |
| Archival systems | Long-term preservation |
| Academic registries | Provenance tracking |

### Governance Classification

| Condition | Classification |
|-----------|----------------|
| Optional, off by default, non-blocking | Class A |
| Enabled by default | Class B |
| Mandatory or consulted by invariants | Class C |

### Hard Constraints (Invariant)

External witnesses:

| ❌ Cannot | ✅ Can |
|-----------|--------|
| Veto registration | Record decisions |
| Heal state | Timestamp snapshots |
| Resolve disagreement | Store hashes |
| Block registration | Emit attestations |
| Influence invariants | Provide audit trail |

### Failure Mode (Mandatory)

Witness failure must result in:
```
"attestation skipped" — NOT "state rejected"
```

Registration proceeds regardless of witness availability.

### Why This Is Safe

- Witness plurality increases confidence, not control
- No single external system becomes a point of failure
- Authority remains inward
- Failures are observable but not blocking

---

## Category 2: Alternative Registry Engines (Parallel, Parity-Checked)

### Definition

Independent implementations of the Registrar:
- Different languages
- Different evaluation strategies
- Different internal representations

**But never different semantics.**

### Governance Classification

**Always Class B** (structural change with behavioral equivalence)

### Required Properties

| Property | Requirement |
|----------|-------------|
| Evaluation | Parallel (both engines run) |
| Comparison | Structural (outcomes compared) |
| Disagreement | Halt + escalation |
| Auto-resolution | Never |

### Required Evidence

Before any alternative engine is accepted:

- [ ] Parity harness passes (all invariant classes)
- [ ] Snapshot parity verified (deterministic serialization)
- [ ] Replay parity verified (temporal stability)
- [ ] Divergence handling documented

### Why This Is Syntropic

- Multiple implementations converge on the same structure
- Bugs are revealed, not hidden
- Long-term survivability increases
- This is how protocols endure

### Current Engines

| Engine | Role | Implementation |
|--------|------|----------------|
| Registry | Primary authority | Compiled DSL (RPEG v1) |
| Legacy | Secondary witness | TypeScript predicates |

Additional engines may be proposed through governance.

---

## Category 3: Visualization / Inspection Layers

### Definition

Human-facing lenses that answer:
> "What happened?" — NOT "What should happen?"

### Examples

| Visualization | Purpose |
|---------------|---------|
| Timelines | Temporal ordering |
| Graphs | Lineage visualization |
| Diff views | State comparison |
| Invariant traces | Evaluation logging |
| Disagreement visualizers | Parity monitoring |

### Governance Classification

**Class A**, provided:
- Read-only access
- No interpretation injected
- No control path back to Registrar

### Explicit Prohibitions

| ❌ Prohibited | Why |
|---------------|-----|
| Recommendations | Implies judgment |
| Scoring | Implies ranking |
| Automated alerts that alter flow | Implies control |
| Semantic color-coding without documentation | Implies interpretation |

### Why This Matters

Visualization is where most systems accidentally become agents.

Restraint here preserves scientific legibility:
- Observers see structure, not suggestions
- Humans interpret, systems record
- No hidden heuristics

---

## Decision Table

| Expansion Type | Default Classification | Required Evidence |
|----------------|----------------------|-------------------|
| New external witness | A | Non-blocking proof |
| Witness enabled by default | B | Usage rationale |
| Witness consulted by invariants | C | Full governance review |
| Alternative engine | B | Parity harness |
| Read-only visualization | A | Read-only proof |
| Visualization with interpretation | B/C | Governance review |

---

## Proposal Template for Ecosystem Expansion

```markdown
## Expansion Proposal: [NAME]

### Category
[ ] External Witness
[ ] Alternative Engine
[ ] Visualization Layer

### Classification
[ ] Class A (optional, non-blocking)
[ ] Class B (default or structural)
[ ] Class C (authoritative or mandatory)

### Authority Boundaries
- Can: [list allowed actions]
- Cannot: [list prohibited actions]

### Failure Behavior
- On failure: [describe behavior]
- Blocks registration: [ ] Yes [ ] No

### Evidence
- [ ] Non-blocking verified
- [ ] Parity harness (if engine)
- [ ] Read-only verified (if visualization)
```

---

## Syntropy Framing

This is not "adding features."
This is adding witnesses to structure.

Syntropy in Registrum means:
- Multiple independent views
- Converging on the same invariant structure
- Without coordination or negotiation
- Revealing entropy instead of correcting it

That is structural order maintenance, not optimization.

---

## What This Policy Prevents

| Anti-Pattern | Prevention |
|--------------|------------|
| Feature creep | Expansion categories are bounded |
| Authority drift | Witnesses cannot write back |
| Hidden agents | Visualization is read-only |
| Semantic inflation | Interpretation requires governance |
| Single points of failure | Witnesses are optional |

---

## Relationship to Core Governance

This policy operates under the governance framework:
- `PHILOSOPHY.md` — Why governance exists
- `SCOPE.md` — What is governed
- `CHANGE_CLASSES.md` — How changes are classified
- `DUAL_WITNESS_POLICY.md` — Engine parity rules

Ecosystem expansion does not bypass governance; it extends it.

---

*This policy document is governed. Changes require formal process.*
