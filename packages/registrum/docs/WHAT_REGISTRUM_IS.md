# What Registrum Is

## Definition

**Registrum is a structural registrar that validates and records state transitions under explicit invariants, preserving legibility across time without interpretation or optimization.**

It is the constitutional authority that decides whether a proposed change to system state is structurally valid. It does not evaluate whether the change is good, useful, or preferred—only whether it satisfies declared structural rules.

---

## What Registrum Is Not

Registrum is explicitly **not**:

- **Not an agent** — It does not act, decide, or initiate. It only responds to proposed transitions.
- **Not an optimizer** — It does not rank alternatives or prefer outcomes.
- **Not adaptive** — It does not learn, adjust, or improve over time.
- **Not predictive** — It does not forecast, anticipate, or speculate.
- **Not semantic** — It does not read, interpret, or understand content.
- **Not a database** — It does not store application state; it validates structural transitions.
- **Not a workflow engine** — It does not orchestrate, schedule, or sequence operations.

These omissions are features, not limitations.

---

## Core Principles

### 1. Determinism

Given the same inputs, Registrum always produces the same outputs. There is no randomness, no environment dependency, and no hidden state affecting outcomes.

**Implication:** Decisions can be replayed and audited.

### 2. Fail-Closed Behavior

When Registrum encounters an invalid condition, it fails completely. There is no partial recovery, no best-effort handling, and no silent degradation.

**Implication:** Invalid states cannot propagate.

### 3. Structure Over Semantics

Registrum reasons only about structural properties: identity, lineage, ordering. It never inspects, interprets, or evaluates semantic content (`state.data`, `state.content`, `state.embedding`).

**Implication:** Meaning is preserved by the system using Registrum, not by Registrum itself.

### 4. Explicit Invariants

All rules are declared, inspectable, and non-adaptive. No hidden heuristics. No implicit preferences. No learned behavior.

**Implication:** The rules that govern decisions are auditable.

### 5. Historical Integrity

Registrum's judgments are reproducible after the fact. The same transitions, replayed against the same invariants, produce identical outcomes.

**Implication:** History cannot be reinterpreted.

---

## Who This Is For

Registrum is designed for systems that require:

- **Legibility** — The ability to understand why a state exists
- **Auditability** — The ability to verify decisions after they were made
- **Determinism** — The guarantee that identical inputs produce identical outputs
- **Structural governance** — Rules that constrain shape, not meaning

Examples:
- Document versioning systems
- Configuration management
- Audit trails
- State machines with compliance requirements

---

## Who This Is Not For

Registrum is **not appropriate** for systems that require:

- **Optimization** — Choosing the "best" outcome among alternatives
- **Semantic reasoning** — Understanding what content means
- **Adaptive behavior** — Learning from past decisions
- **Probabilistic judgment** — Handling uncertainty or approximation
- **Real-time performance** — Sub-millisecond decision latency

If you need these capabilities, Registrum is the wrong tool.

---

## The Constitutional Metaphor

Registrum is like a constitution for state transitions:

- It defines what is **structurally permissible**
- It does not define what is **substantively good**
- It can be **amended** (new invariants), but changes require explicit governance
- It **does not enforce itself** — it must be consulted by the systems that use it

A constitution does not make policy. It constrains what policies are permissible.

Registrum does not make decisions about your system. It constrains what transitions your system may accept.

---

## Summary

| Property | Registrum | Typical Systems |
|----------|-----------|-----------------|
| Evaluates meaning | ❌ No | ✅ Yes |
| Optimizes outcomes | ❌ No | ✅ Yes |
| Adapts over time | ❌ No | ✅ Yes |
| Deterministic | ✅ Yes | ❌ Often not |
| Auditable | ✅ Yes | ❌ Rarely |
| Fail-closed | ✅ Yes | ❌ Rarely |

Registrum trades expressiveness for guarantees.

This is the correct trade for systems where **legibility matters more than flexibility**.

---

*This document defines identity. It should rarely change.*
