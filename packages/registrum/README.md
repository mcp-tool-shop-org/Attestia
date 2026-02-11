# Registrum

A governed, dual-witness, deterministic registrar with replayable history and optional external attestation.

---

## What Registrum Is

Registrum is a **structural registrar** for maintaining legibility in evolving systems.

It records, validates, and orders state transitions under explicit constraints so that structure remains interpretable as entropy accumulates.

| Property | Meaning |
|----------|---------|
| Structural | Operates on form, not meaning |
| Deterministic | Same inputs → same outputs, always |
| Fail-closed | Invalid input causes hard failure, not partial recovery |
| Replayable | Historical decisions can be re-executed with identical results |
| Non-agentic | Never acts, decides, or optimizes |

**Registrum ensures that change remains legible.**

---

## What Registrum Is Not

Registrum is explicitly **not**:

- An optimizer
- An agent
- A decision-maker
- A controller
- A recommender
- An intelligence
- Adaptive or learning
- Self-healing

It never answers *what matters*.
It only preserves the conditions under which that question remains answerable.

---

## Core Principle

> **Entropy is allowed. Illegibility is not.**

Registrum does not reduce entropy globally.
It constrains where entropy may exist so that identity, lineage, and structure remain inspectable over time.

---

## How Registrum Works

### Structural Registrar

The registrar is the sole constitutional authority:

- Validates all state transitions against 11 structural invariants
- Enforces identity, lineage, and ordering constraints
- Guarantees determinism and traceability
- Surfaces violations without resolving them (fail-closed)

Everything registers through it. Nothing bypasses it.

### The 11 Invariants

| Class | Count | Purpose |
|-------|-------|---------|
| Identity | 3 | Unique, immutable, content-addressed |
| Lineage | 4 | Valid parentage, acyclic, traceable |
| Ordering | 4 | Monotonic, gap-free, deterministic |

These invariants are constitutional. Changing them requires formal governance.

---

## Dual Constitutional Witnesses

Registrum maintains **two independent invariant engines**:

| Witness | Role | Implementation |
|---------|------|----------------|
| Registry | Primary authority | Compiled DSL (RPEG v1) |
| Legacy | Secondary witness | TypeScript predicates |

As of Phase H, **registry is the default constitutional engine**.
Legacy remains as an independent secondary witness.

### Why Two Witnesses?

- **Agreement is required** — Both must accept for a transition to be valid
- **Disagreement halts** — Parity divergence stops the system (fail-closed)
- **Independence is intentional** — Neither can override the other

This is a safety and legibility feature, not technical debt.

Dual-mode is indefinite. There is no plan to remove either witness.

### Parity Evidence

274 tests prove behavioral equivalence:
- 58 parity tests across all invariant classes
- 12 persistence parity tests (temporal stability)
- Replay parity: live execution ≡ replayed execution

---

## History, Replay, and Auditability

### Snapshots

Registrum can snapshot its complete state:
- Versioned schema (`RegistrarSnapshotV1`)
- Content-addressed hashes
- Deterministic serialization

### Replay

Historical decisions can be replayed:
- Read-only execution against fresh registrar
- Proves temporal determinism
- Same transitions → same outcomes

### Auditability

Every structural judgment is:
- Reproducible after the fact
- Independent of execution context
- Verifiable by any party with the snapshot

---

## External Attestation (Optional)

Registrum may optionally emit cryptographic attestations to an external immutable ledger (such as XRPL) for public witnessing.

| Property | Value |
|----------|-------|
| Default | Disabled |
| Authority | Non-authoritative (witness only) |
| Effect on behavior | None |

Attestations record *that* Registrum decided.
Registrum decides *what* is valid.

**Authority flows inward. Witness flows outward.**

See:
- [`docs/WHY_XRPL.md`](docs/WHY_XRPL.md) — Rationale
- [`docs/ATTESTATION_SPEC.md`](docs/ATTESTATION_SPEC.md) — Specification

---

## Governance

Registrum is governed under a **constitutional model**.

| Principle | Meaning |
|-----------|---------|
| Behavioral guarantees > feature velocity | Correctness takes precedence |
| Evidence-based changes only | No changes without proof |
| Formal process required | Proposals, artifacts, decisions |

### Current Status

- **Phase H**: Complete (registry default, attestation enabled)
- **Governance**: Active and enforced
- **All changes**: Require formal governance process

All future changes are governance decisions, not engineering tasks.

See:
- [`docs/governance/PHILOSOPHY.md`](docs/governance/PHILOSOPHY.md) — Why governance exists
- [`docs/governance/SCOPE.md`](docs/governance/SCOPE.md) — What is governed
- [`docs/GOVERNANCE_HANDOFF.md`](docs/GOVERNANCE_HANDOFF.md) — Transition to governance

---

## Project Status

**Registrum has reached a stable end-state.**

| Phase | Status | Evidence |
|-------|--------|----------|
| A–C | Complete | Core registrar, parity harness |
| E | Complete | Persistence, replay, temporal stability |
| G | Complete | Governance framework |
| H | Complete | Registry default, attestation enabled |

**Test coverage**: 279 tests passing across 14 test suites

Development has transitioned to stewardship. Future changes require governance.

See: [`docs/STEWARD_CLOSING_NOTE.md`](docs/STEWARD_CLOSING_NOTE.md)

---

## Getting Started

### Installation

```bash
npm install registrum
```

### Basic Usage

```typescript
import { StructuralRegistrar } from "registrum";

const registrar = new StructuralRegistrar();

// Register a root state
const result = registrar.register({
  from: null,
  to: { id: "state-1", structure: { version: 1 }, data: {} }
});

if (result.kind === "accepted") {
  console.log(`Registered at index ${result.orderIndex}`);
} else {
  console.log(`Rejected: ${result.violations.map(v => v.invariantId)}`);
}
```

### Running Examples

Examples in the `examples/` directory are **illustrative demonstrations**, not stable API.

They require [`tsx`](https://github.com/esbuild-kit/tsx) to run:

```bash
# Run the refusal-as-success example
npm run example:refusal

# Or directly with npx
npx tsx examples/refusal-as-success.ts
```

**Note**: Examples rely on `npx tsx` (or `npx ts-node` with ESM support). These are not production dependencies — they are development/demonstration tools.

---

## Documentation

| Document | Purpose |
|----------|---------|
| [`WHAT_REGISTRUM_IS.md`](docs/WHAT_REGISTRUM_IS.md) | Identity definition |
| [`PROVABLE_GUARANTEES.md`](docs/PROVABLE_GUARANTEES.md) | Formal claims with evidence |
| [`FAILURE_BOUNDARIES.md`](docs/FAILURE_BOUNDARIES.md) | Hard failure conditions |
| [`HISTORY_AND_REPLAY.md`](docs/HISTORY_AND_REPLAY.md) | Temporal guarantees |
| [`TUTORIAL_DUAL_WITNESS.md`](docs/TUTORIAL_DUAL_WITNESS.md) | Understanding dual-witness architecture |
| [`governance/DUAL_WITNESS_POLICY.md`](docs/governance/DUAL_WITNESS_POLICY.md) | Dual-witness policy |
| [`CANONICAL_SERIALIZATION.md`](docs/CANONICAL_SERIALIZATION.md) | Snapshot format (constitutional) |

---

## Design Ethos

- Restraint over power
- Legibility over performance
- Constraints over heuristics
- Inspection over intervention
- Stopping over endless extension

Registrum is successful when it becomes boring, dependable, and unsurprising.

---

## One-Sentence Summary

Registrum is a structural registrar that preserves interpretability as systems evolve, ensuring that change remains legible under entropy.
