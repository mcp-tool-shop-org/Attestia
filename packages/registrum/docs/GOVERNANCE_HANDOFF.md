# Governance Handoff

## Statement of Completion

**As of Phase E (v1.1.0), Registrum's technical behavior is frozen.**

The implementation is complete. The guarantees are proven. The documentation is authoritative.

What remains are **governance decisions**, not technical ones.

---

## What Has Been Delivered

### Phase A — Foundational Documentation
- `DEFINITIONS.md` — Core terminology
- `SCIENTIFIC_POSITION.md` — Epistemic stance
- `ARCHITECTURAL_CONSTRAINTS.md` — Design boundaries
- `INVARIANTS.md` — Normative invariant set
- `FAILURE_MODES.md` — Failure classification

### Phase B — Parity Harness
- Structured parity tests by invariant group
- Normalization layer for result comparison
- `MIGRATION_CRITERIA.md` — Evidence-based migration rulebook

### Phase C — Registrar Core
- `StructuralRegistrar` implementation
- Legacy mode (TypeScript predicates)
- Registry mode (compiled DSL)
- Mode selection behind flag

### Phase E — Persistence
- Snapshot schema (versioned, structural)
- Deterministic serialization
- Fail-closed rehydration
- Read-only replay engine
- Persistence parity tests

### Test Evidence
- 233 passing tests across 12 test files
- Full behavioral parity (legacy ≡ registry)
- Full temporal parity (live ≡ replay)

---

## Decisions That Remain

The following decisions are **governance decisions**, not technical ones:

### 1. Cutover Decision (Phase D)

**Question:** Should registry mode become the default?

**Current state:** Legacy mode is default. Registry mode is opt-in.

**Trade-offs:**

| Factor | Keep Legacy Default | Make Registry Default |
|--------|--------------------|-----------------------|
| Stability | Proven over time | Equally proven (parity) |
| Auditability | Code inspection | JSON inspection |
| Extensibility | Requires code changes | Requires registry changes |
| Risk | None (status quo) | Low (full parity proven) |

**Required evidence:** Final parity test run (already passing).

**Authority:** Stakeholder sign-off required.

### 2. Deprecation Policy

**Question:** When and how should legacy mode be deprecated?

**Options:**
- **Soft deprecation:** Warning in documentation, no runtime warning
- **Hard deprecation:** Runtime warning when `mode: "legacy"` is used
- **No deprecation:** Keep both modes indefinitely

**Recommendation:** Soft deprecation only. Legacy mode serves as a reference implementation.

### 3. Versioning Rules

**Question:** What constitutes a breaking change?

**Proposed rules:**
- Invariant addition → minor version bump
- Invariant removal → major version bump
- Invariant modification → major version bump
- Snapshot schema change → major version bump
- Test addition → patch version bump

**Rationale:** Invariants are constitutional. Changing them changes the system's meaning.

### 4. Amendment Process

**Question:** How can invariants be added, modified, or removed?

**Proposed process:**
1. Proposal with rationale
2. Impact analysis (which systems would be affected)
3. Parity test for new behavior
4. Stakeholder review
5. Version bump according to rules
6. Documentation update

**Rationale:** Constitutional changes require deliberation.

---

## What Cannot Be Changed Without Governance

The following are **locked** until a governance decision unlocks them:

- ❌ Invariant definitions
- ❌ Snapshot schema
- ❌ Fail-closed behavior
- ❌ Determinism guarantees
- ❌ Default mode

Changes to any of these require:
1. Explicit proposal
2. Impact analysis
3. Stakeholder approval
4. Version bump

---

## What Can Be Changed Without Governance

The following can be changed with normal development process:

- ✅ Bug fixes (behavior must remain identical)
- ✅ Performance improvements (outcomes must remain identical)
- ✅ Documentation clarifications (not semantic changes)
- ✅ Test additions (not test removals)
- ✅ Internal refactoring (public API must remain stable)

---

## Reference Documents

| Document | Purpose |
|----------|---------|
| `WHAT_REGISTRUM_IS.md` | Identity definition |
| `PROVABLE_GUARANTEES.md` | Claim surface |
| `FAILURE_BOUNDARIES.md` | Hard limits |
| `HISTORY_AND_REPLAY.md` | Phase E explanation |
| `MIGRATION_CRITERIA.md` | Cutover checklist |
| `INVARIANTS.md` | Normative invariant set |
| `STOP.md` | Feature freeze notice |

---

## The Governance Fork

Two paths are available:

### Path D — Cutover

1. Run final parity tests
2. Obtain stakeholder sign-off
3. Make registry mode default
4. Soft-deprecate legacy mode
5. Bump to v1.0.0
6. Update `MIGRATION_CRITERIA.md`
7. Remove `STOP.md`

### Path F — Stewardship

1. Make feature freeze permanent
2. Write technical paper / note
3. Position as research artifact
4. Archive repository
5. Remove `STOP.md` (replace with `FROZEN.md`)

Both paths are valid. The choice depends on intent.

---

## Handoff Statement

This document marks the end of technical development and the beginning of governance.

The implementers have delivered:
- A working system
- Proven guarantees
- Comprehensive tests
- Authoritative documentation

The governors must now decide:
- What to do with it
- How to maintain it
- When to change it

**The technical phase is complete.**

---

*This document is the bridge. It transfers authority from implementation to governance.*
