# Failure Modes

## Purpose of This Document

This document enumerates the known and acceptable ways Registrum can fail.

Failure is not treated as an embarrassment or anomaly.
Failure is treated as a valid and informative outcome.

This document exists to ensure that:

- failures are detected, not hidden
- failures are named, not rationalized
- failures do not silently redefine the project's scope

Any failure mode not listed here must be treated as suspect until formally reviewed and documented.

---

## Definition of Failure

Registrum fails when it violates its stated mission:

> to preserve the conditions for legibility in evolving systems without interpreting, optimizing, or deciding meaning.

Failure includes both:

- explicit breakdowns (e.g., invariant violations)
- implicit drift (e.g., creeping optimization pressure)

---

## Category I — Structural Failures (Critical)

These failures directly violate Registrum's core guarantees.

### 1. Silent Invariant Violation

**Description**
A State or Transition violates one or more declared invariants without being detected or surfaced.

**Why This Is a Failure**
Invariant enforcement is the Registrar's primary responsibility.
Silent violation collapses trust in the system.

**Required Response**

- Immediate halt
- Explicit error surfaced
- No auto-repair or fallback

### 2. Non-Deterministic Registration

**Description**
Identical inputs and constraints produce different registration outcomes or orderings.

**Why This Is a Failure**
Determinism is foundational to traceability and inspection.

**Required Response**

- Block release
- Treat as correctness defect, not performance issue

### 3. Broken Lineage

**Description**
A registered State cannot be traced to its predecessor(s).

**Why This Is a Failure**
Without lineage, temporal inspection is impossible.

**Required Response**

- Reject affected transitions
- Surface lineage break explicitly

---

## Category II — Authority Violations (Critical)

These failures break Registrum's constitutional model.

### 4. Unregistered State Mutation

**Description**
State is modified or reordered without passing through the Registrar.

**Why This Is a Failure**
The Registrar's authority is absolute by design.

**Required Response**

- Immediate failure
- Remove or disable offending component

### 5. Subsystem Self-Authorization

**Description**
A Subsystem accepts, alters, or reorders its own transitions.

**Why This Is a Failure**
Subsystems must remain non-authoritative.

**Required Response**

- Reject integration
- Require architectural correction

### 6. Registrar Feedback or Initiation

**Description**
The Registrar initiates transitions, suggests corrections, or calls back into Subsystems.

**Why This Is a Failure**
This introduces agentic behavior and feedback loops.

**Required Response**

- Treat as architectural breach
- Remove initiating logic

---

## Category III — Semantic Drift (Critical)

These failures introduce meaning or judgment into a structural system.

### 7. Implicit Optimization Pressure

**Description**
Structural rules begin to favor certain States as "better" through scoring, ranking, or heuristics.

**Why This Is a Failure**
Registrum must remain neutral with respect to value and outcome.

**Required Response**

- Remove scoring logic
- Re-express rule as a structural invariant or reject entirely

### 8. Evaluative Language Leakage

**Description**
States, Transitions, or diagnostics are labeled using normative terms (e.g., good, bad, optimal).

**Why This Is a Failure**
Language encodes judgment even when logic does not.

**Required Response**

- Replace with neutral structural descriptors
- Audit surrounding code for semantic drift

### 9. Meaning Inference

**Description**
Registrum infers relevance, importance, correctness, or intent from structure.

**Why This Is a Failure**
Meaning lies outside the system boundary.

**Required Response**

- Remove inference mechanism
- Move interpretation entirely outside Registrum

---

## Category IV — Constraint Failures (Serious)

These failures weaken Registrum's guarantees without fully breaking them.

### 10. Constraint Erosion Under Load

**Description**
Constraints are relaxed to improve performance or throughput.

**Why This Is a Failure**
Legibility has priority over performance.

**Required Response**

- Reject performance trade-off
- Make degradation explicit or fail hard

### 11. Over-Constraint Leading to Brittleness

**Description**
Constraints prevent any evolution, freezing the system.

**Why This Is a Failure**
Registrum must permit entropy within bounds.

**Required Response**

- Re-evaluate constraint design
- Adjust invariants explicitly, never implicitly

---

## Category V — Interpretive Misuse (Acceptable but Out of Scope)

These are not system failures, but misuse scenarios.

### 12. External Misinterpretation

**Description**
Users treat Registrum output as recommendations, judgments, or guidance.

**Why This Is Not a System Failure**
Interpretation lies outside Registrum's responsibility.

**Required Response**

- Clarify documentation
- Reiterate non-goals
- Do not add corrective logic

### 13. Overextension Beyond Scope

**Description**
Attempts to use Registrum as a controller, optimizer, or agent.

**Why This Is Not a System Failure**
This violates declared scope.

**Required Response**

- Reject proposal
- Cite Scientific Position and Architectural Constraints

---

## Handling New Failure Modes

Any newly discovered failure mode must:

- be documented here
- be categorized
- include a required response
- be reviewed for scope impact

No undocumented failure may be silently tolerated.

---

## Summary

Registrum succeeds by making failure explicit and bounded.
Undocumented or rationalized failure is the only unacceptable outcome.

---

## Status

This document is normative, binding, and frozen as part of Phase 0.5.

Any amendment requires review against:

- SCIENTIFIC_POSITION.md
- DEFINITIONS.md
- ARCHITECTURAL_CONSTRAINTS.md

---

## Phase 0.5 Completion

With this document committed, Phase 0.5 is complete.

You now have:

- epistemic boundaries
- vocabulary lock
- architectural constraints
- explicit failure semantics
