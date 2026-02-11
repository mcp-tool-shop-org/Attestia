# Attestia

**Financial truth infrastructure for the decentralized world.**

---

## Mission

We believe that money — wherever it lives, however it moves — deserves the same rigor as the systems that created it. Smart contracts execute. Blockchains record. But no one *attests*.

Attestia is the missing layer: structural governance, deterministic accounting, and human-approved intent — unified across chains, organizations, and individuals.

We don't move your money. We prove what happened, constrain what can happen, and make the financial record unbreakable.

### What We Stand For

- **Truth over speed.** Every financial event is append-only, replayable, and reconcilable. If it can't be proven, it didn't happen.
- **Humans approve; machines verify.** AI advises, smart contracts execute, but nothing moves without explicit human authorization. Ever.
- **Structural governance, not political governance.** We don't vote on what's valid. We define invariants that hold unconditionally — identity is explicit, lineage is unbroken, ordering is deterministic.
- **Intent is not execution.** Declaring what you want and doing it are separate acts with separate gates. The gap between them is where trust lives.
- **Chains are witnesses, not authorities.** XRPL attests. Ethereum settles. But authority flows from structural rules, not from any chain's consensus.
- **Boring infrastructure wins.** The world doesn't need another DeFi protocol. It needs the accounting layer underneath — the financial plumbing that makes everything else trustworthy.

---

## Architecture

Attestia is three systems, one truth:

```
┌─────────────────────────────────────────────────────────┐
│                      ATTESTIA                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Personal   │  │     Org      │  │              │  │
│  │    Vault     │  │   Treasury   │  │   Registrum  │  │
│  │              │  │              │  │              │  │
│  │  Observe.    │  │  Distribute. │  │  Govern.     │  │
│  │  Budget.     │  │  Account.    │  │  Attest.     │  │
│  │  Allocate.   │  │  Reconcile.  │  │  Constrain.  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └────────────┬────┘                 │           │
│                      │                      │           │
│              ┌───────┴───────┐              │           │
│              │  Cross-System │◀─────────────┘           │
│              │ Reconciliation│                           │
│              └───────┬───────┘                           │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │ XRPL Witness  │                           │
│              │  (attestation)│                           │
│              └───────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

| System | Role | Origin |
|--------|------|--------|
| **Personal Vault** | Multi-chain portfolio observation, envelope budgeting, intent declaration | Evolved from NextLedger |
| **Org Treasury** | Deterministic payroll, DAO distributions, dual-gate funding, double-entry ledger | Evolved from Payroll Engine |
| **Registrum** | Structural registrar — 11 invariants, dual-witness validation, XRPL attestation | Unchanged — constitutional layer |

---

## Core Pattern

Every interaction follows one flow:

```
Intent → Approve → Execute → Verify
```

1. **Intent** — A user or system declares a desired outcome
2. **Approve** — Registrum validates structurally; a human signs explicitly
3. **Execute** — The on-chain transaction is submitted
4. **Verify** — Reconciliation confirms; XRPL attests the record

No step is optional. No step is automated away.

---

## Principles

| Principle | Implementation |
|-----------|---------------|
| Append-only records | No UPDATE, no DELETE — only new entries |
| Fail-closed | Disagreement halts the system, never heals silently |
| Deterministic replay | Same events produce the same state, always |
| Advisory AI only | AI can analyze, warn, suggest — never approve, sign, or execute |
| Multi-chain observation | Ethereum, XRPL, L2s — chain-agnostic read layer |
| Structural identity | Explicit, immutable, unique — not biometric, but constitutional |

---

## Status

Early stage. Building in public.

---

## License

[MIT](LICENSE)
