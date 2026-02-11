# Roadmap

This roadmap is intentionally restrained.
Progress is measured by stability of guarantees, not feature velocity.

---

## Phase 0 — Foundation

**Goal:** Conceptual and terminological clarity.

**Exit Criteria:**
- Mission, scope, and constraints explicitly defined
- Core terminology locked in DEFINITIONS.md
- Non-goals explicitly stated
- Failure modes documented

**Non-Goals:**
- No implementation decisions
- No API design
- No technology selection

**Status:** Complete.

---

## Phase 0.5 — Governance & Scientific Integrity

**Goal:** Encode constraints before implementation.

**Exit Criteria:**
- Scientific position documented and falsifiable
- Architectural constraints defined
- Failure modes explicit
- Contributing guidelines established
- A new contributor can explain what Registrum is not

**Non-Goals:**
- No design expansion
- No APIs
- No stack decisions

**Status:** Complete.

---

## Phase 1 — Registrar Core

**Goal:** A minimal, correct registrar. Make it impossible to mutate state without registration.

**Exit Criteria:**
- Structural Registrar interface defined (register, validate, list_invariants, get_lineage)
- Explicit invariant definitions (declarative, structural, boolean)
- Deterministic registration of state transitions
- Rejection and surfacing of invalid transitions
- All tests pass with deterministic results
- All state mutation requires registration

**Non-Goals:**
- No semantic interpretation
- No optimization
- No subsystem implementation
- No persistence layer
- No scoring, ranking, or preference APIs

**Commit Plan:**
1. Core Types (State, Transition, RegistrationResult, Invariant, ValidationReport)
2. Registrar Skeleton (interface with stubbed methods)
3. Invariant Evaluation Engine (pure constraint checking)
4. Registration Logic (accept/reject, ordering, immutable results)
5. Determinism Tests (same input → same output)
6. Documentation Lock (Phase 1 completion note)

**Status:** Not started.

---

## Phase 2 — Structural Subsystems

**Goal:** Registrable structure, not behavior.

**Exit Criteria:**
- Identity Lattice implemented and registrable
- Lineage Graph implemented and registrable
- Temporal Attenuation Layer implemented and registrable
- Context Frames implemented and registrable
- Each subsystem registers through the Registrar
- No subsystem acts autonomously

**Non-Goals:**
- No semantic interpretation in subsystems
- No cross-subsystem optimization
- No emergent behavior

---

## Phase 3 — Measurement & Inspection

**Goal:** Visibility without intervention.

**Exit Criteria:**
- Entropy and dispersion measurement
- Effective dimensionality metrics
- Stability and persistence indicators
- Failure mode detection
- All metrics are descriptive only

**Non-Goals:**
- No prescriptive metrics
- No recommendations based on metrics
- No automatic remediation

---

## Phase 4 — Integration

**Goal:** Registrum as infrastructure.

**Exit Criteria:**
- Drop-in adapters for external systems
- Read-only integration boundaries
- Streaming with explicit partial-state markers
- Deterministic replay capability
- Audit trail completeness

**Non-Goals:**
- No modification of external systems
- No bidirectional state synchronization
- No external system optimization

---

## Phase 5 — Consolidation & Freeze

**Goal:** Registrum v1.0.

**Exit Criteria:**
- All guarantees frozen
- All terminology locked
- Documentation complete
- No new features without violating v1 constraints

**Non-Goals:**
- No feature expansion
- No scope extension
- No "just one more thing"

---

## Roadmap Rules

1. Each phase has explicit exit criteria.
2. Each phase has explicit non-goals.
3. Phases are sequential; do not skip.
4. A phase is not complete until all exit criteria are met.
5. Scope creep is a failure mode.
