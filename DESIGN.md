# Attestia — Architecture & Design Decisions

This document captures the foundational decisions for the Attestia codebase.

---

## Decision 1: TypeScript Monorepo

**Choice:** Single-language TypeScript monorepo using pnpm workspaces.

**Rationale:**
- Registrum (constitutional layer) is already TypeScript — zero rewrite cost
- The web3 ecosystem lives in TS/JS: ethers.js, viem, xrpl.js, wagmi
- Single language eliminates cross-language protocol translation
- Shared types compile-checked across all packages
- pnpm workspaces for dependency management and cross-package linking

**Tradeoffs accepted:**
- Payroll Engine (Python) and NextLedger (C#) logic must be ported
- Server-side performance is "good enough" for financial operations (not HFT)
- Python's data science ecosystem is lost (acceptable — we're not doing ML)

---

## Decision 2: Package Structure

```
packages/
├── registrum/          # Structural registrar (ported from Registrum repo)
│                       # 11 invariants, dual-witness, XRPL attestation
│
├── types/              # Shared types across all packages
│                       # Intent, Event, Identity, Money, ChainRef
│
├── ledger/             # Double-entry append-only ledger engine
│                       # Ported from payroll-engine's LedgerService
│
├── vault/              # Personal Vault — observation, budgeting, allocation
│                       # Evolved from NextLedger
│
├── treasury/           # Org Treasury — distributions, funding gates, payroll
│                       # Evolved from payroll-engine
│
└── chain-observer/     # Multi-chain read layer
                        # Ethereum (viem), XRPL (xrpl.js), L2s
```

**Naming convention:** `@attestia/<package>`

**Dependency direction:**
```
types ← registrum (no deps on types — standalone)
types ← ledger ← treasury
types ← ledger ← vault
types ← chain-observer ← vault
types ← chain-observer ← treasury
registrum ← treasury (governance)
registrum ← vault (governance)
```

---

## Decision 3: Build First, Port Second

**Phase 1 — Foundation (now):**
- Scaffold monorepo
- Port Registrum as `@attestia/registrum` (rename, all tests pass)
- Create `@attestia/types` with shared domain types

**Phase 2 — Core engines:**
- `@attestia/ledger` — append-only double-entry ledger (port from Python)
- `@attestia/chain-observer` — multi-chain read layer (new)

**Phase 3 — Products:**
- `@attestia/vault` — Personal Vault
- `@attestia/treasury` — Org Treasury

**Phase 4 — Integration:**
- Cross-system reconciliation
- XRPL attestation pipeline
- End-to-end intent→approve→execute→verify flow

---

## Decision 4: Zero Runtime Dependencies (Where Possible)

Registrum has zero runtime deps. We extend this principle:
- `@attestia/types` — zero deps
- `@attestia/registrum` — zero deps
- `@attestia/ledger` — zero deps (pure math + state machines)
- `@attestia/chain-observer` — viem, xrpl.js (necessary chain SDKs)
- `@attestia/vault` — depends on internal packages + chain-observer
- `@attestia/treasury` — depends on internal packages + chain-observer

---

## Decision 5: Test Infrastructure

- **Framework:** Vitest (already used by Registrum)
- **Coverage target:** ≥95% for registrum, ledger, types
- **Test philosophy:** Invariant-based — test properties, not just cases
- **No mocks for core logic** — pure functions, deterministic state machines

---

## Decision 6: What We Don't Build (Yet)

- No UI (Personal Vault UI comes later, separate concern)
- No database (append-only event store is in-memory + file persistence first)
- No authentication (structural identity, not user auth)
- No smart contracts (we observe and attest, we don't deploy)
- No AI integration (advisory AI is Phase 4+)
