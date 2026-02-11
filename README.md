# Attestia

[![CI](https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg)](https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg)](https://codecov.io/gh/mcp-tool-shop-org/Attestia)

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

11 packages, 1,176 tests, 96.80% coverage, all green. Building in public.

| Package | Tests | Purpose |
|---------|-------|---------|
| `@attestia/types` | 52 | Shared domain types (zero deps) |
| `@attestia/registrum` | 297 | Constitutional governance — 11 invariants, dual-witness |
| `@attestia/ledger` | 144 | Append-only double-entry engine |
| `@attestia/chain-observer` | 180 | Multi-chain read-only observation (EVM + XRPL) |
| `@attestia/vault` | 55 | Personal vault — portfolios, budgets, intents |
| `@attestia/treasury` | 63 | Org treasury — payroll, distributions, funding gates |
| `@attestia/reconciler` | 36 | 3D cross-system matching + Registrum attestation |
| `@attestia/witness` | 127 | XRPL on-chain attestation, retry, degradation |
| `@attestia/verify` | 24 | Deterministic replay verification + GlobalStateHash |
| `@attestia/event-store` | 67 | Append-only event persistence, JSONL, hash chain, snapshots |
| `@attestia/node` | 131 | Hono REST API — 17 endpoints, auth, multi-tenancy, metrics, export |

### Development

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,176)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### XRPL Integration Testing

A standalone `rippled` node runs in Docker for deterministic on-chain integration tests — no testnet dependency, no faucet, sub-second ledger close.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentation

| Document | Purpose |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Executive overview and full package reference |
| [ROADMAP.md](ROADMAP.md) | Phase-by-phase project roadmap |
| [DESIGN.md](DESIGN.md) | Architecture decisions |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Package graph, data flows, security model |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Auditor step-by-step replay guide |
| [THREAT_MODEL.md](THREAT_MODEL.md) | STRIDE analysis per component |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Threat → control → file → test mappings |
| [SECURITY.md](SECURITY.md) | Responsible disclosure policy |

---

## License

[MIT](LICENSE)
