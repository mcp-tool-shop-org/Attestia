# Why XRPL

Registrum uses the XRP Ledger (XRPL) as an optional external attestation layer.

XRPL is not used to execute logic, evaluate invariants, or govern Registrum.
It is used solely as an immutable, consensus-backed witness.

---

## Why a Ledger at All?

Registrum is deterministic and replayable.
XRPL provides an external guarantee that:

- a specific snapshot existed
- at a specific point in ordered time
- and was agreed upon by an independent network

This protects against silent history rewriting.

---

## Why XRPL Specifically?

XRPL provides:

- Deterministic transaction ordering
- Strong replay guarantees
- Multi-validator consensus
- No Turing-complete execution environment

The absence of general-purpose computation is a feature, not a limitation.

---

## What XRPL Is Not Used For

| Not Used For | Why |
|--------------|-----|
| Invariant evaluation | Registrum is sovereign |
| Parity resolution | Cannot override halt |
| Self-healing | No repair hints flow outward |
| Incentives | No economic coupling |
| Governance decisions | Authority stays internal |

XRPL attestation is write-only, append-only, non-authoritative.

---

## Design Principle

> XRPL records *that* Registrum decided.
> Registrum decides *what* is valid.

Authority flows inward. Witness flows outward.

---

## Attestation, Not Integration

This is not "blockchain integration" in the marketing sense.

Correct framing:

> External cryptographic attestation for structural history

XRPL provides:
- Immutability (cannot rewrite attested history)
- Ordering (consensus on temporal sequence)
- Independence (external to Registrum's execution)

XRPL does not provide:
- Computation (no smart contracts evaluate Registrum state)
- Authority (attestation cannot override Registrum decisions)
- Recovery (attestation cannot repair divergence)

---

## Governance Classification

XRPL attestation is:

| Classification | Condition |
|----------------|-----------|
| Class A | Optional, off by default, no behavioral impact |
| Class B | If made default (requires parity proof) |
| Class C | If made mandatory or blocking (changes guarantees) |

Current status: **Non-governed** (optional enhancement)

If attestation ever becomes correctness-affecting, it instantly becomes Class C.

---

*This document explains why XRPL. Attestation schema is in `XRPL_ATTESTATION.md`.*
