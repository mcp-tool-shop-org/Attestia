# Attestia — Project Handbook

**Version:** 0.1.0
**Date:** February 11, 2026
**Status:** Active development — Phase 9 in progress

---

## Executive Summary

Attestia is financial truth infrastructure for the decentralized world. It is the accounting and governance layer that sits beneath wallets, DAOs, and DeFi protocols — observing what happened on-chain, constraining what can happen next, and producing an unbreakable financial record.

Attestia does not move money. It proves what happened, enforces structural rules, and attests the result on-chain.

**By the numbers:**

| Metric | Value |
|--------|-------|
| Packages | 11 |
| Source lines (TypeScript) | ~19,000 |
| Tests | 1,176 |
| Test coverage | 96.80% |
| Runtime dependencies (core) | 0 |
| REST API endpoints | 17 |
| Supported chains | EVM (Ethereum, Arbitrum, Base, Optimism) + XRPL |

---

## Mission

Smart contracts execute. Blockchains record. But no one attests.

Attestia fills the gap with three guarantees:

1. **Structural governance** — Rules that hold unconditionally, not votes that change with the wind
2. **Deterministic accounting** — Append-only, replayable, reconcilable financial records
3. **Human-approved intent** — AI advises, machines verify, but nothing moves without explicit human authorization

---

## Core Pattern

Every interaction in Attestia follows one flow:

```
Intent  →  Approve  →  Execute  →  Verify
```

1. **Intent** — A user or system declares a desired financial outcome
2. **Approve** — Registrum validates structurally; a human signs explicitly
3. **Execute** — The on-chain transaction is submitted
4. **Verify** — Reconciliation confirms the result; XRPL attests the record

No step is optional. No step is automated away.

---

## Architecture

Attestia is a TypeScript monorepo (pnpm workspaces) organized as 11 packages with strict dependency direction. The core domain packages have zero runtime dependencies.

```
┌─────────────────────────────────────────────────────────────────┐
│                          ATTESTIA                               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │   Personal   │  │     Org      │  │                       │ │
│  │    Vault     │  │   Treasury   │  │      Registrum        │ │
│  │              │  │              │  │                       │ │
│  │  Observe.    │  │  Distribute. │  │  11 structural        │ │
│  │  Budget.     │  │  Account.    │  │  invariants.          │ │
│  │  Allocate.   │  │  Reconcile.  │  │  Dual-witness.        │ │
│  └──────┬───────┘  └──────┬───────┘  │  Constitutional law.  │ │
│         │                 │          └───────────┬───────────┘ │
│         └────────┬────────┘                      │             │
│                  │                               │             │
│          ┌───────┴────────┐                      │             │
│          │  Reconciler    │◀─────────────────────┘             │
│          │  3D matching   │                                    │
│          └───────┬────────┘                                    │
│                  │                                             │
│          ┌───────┴────────┐    ┌──────────────┐               │
│          │    Witness     │    │  Event Store  │               │
│          │ XRPL on-chain  │    │  Append-only  │               │
│          │  attestation   │    │  persistence  │               │
│          └────────────────┘    └──────────────┘               │
│                                                                │
│          ┌────────────────────────────────────┐               │
│          │  Node (REST API)                    │               │
│          │  17 endpoints · Auth · Multi-tenant │               │
│          └────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Hierarchy

```
@attestia/types          (zero deps — shared domain types)
    ↑
@attestia/registrum      (zero deps — standalone constitutional layer)
@attestia/ledger         (zero deps — pure double-entry engine)
@attestia/chain-observer (viem + xrpl.js — multi-chain read layer)
    ↑
@attestia/vault          (types + ledger + chain-observer + registrum)
@attestia/treasury       (types + ledger + chain-observer + registrum)
    ↑
@attestia/reconciler     (types + registrum — 3D cross-system matching)
@attestia/witness        (types + registrum — XRPL attestation)
@attestia/verify         (types — deterministic replay + GlobalStateHash)
@attestia/event-store    (types — append-only persistence, JSONL, snapshots)
    ↑
@attestia/node           (all packages — Hono REST API)
```

---

## Package Reference

### @attestia/types
**Purpose:** Shared domain types across the entire stack.
**Runtime deps:** None.
**Tests:** 52.

Defines the canonical shapes for `Identity`, `Money`, `Intent`, `ChainRef`, `Event`, and all domain event types. Includes type guards, factory functions, and the event metadata builders used by every other package. Zero dependencies by design — this package is the vocabulary of the system.

---

### @attestia/registrum
**Purpose:** Constitutional governance — the structural registrar.
**Runtime deps:** None.
**Tests:** 297.
**Source:** ~5,600 lines (largest package).

The heart of Attestia. Registrum enforces 11 structural invariants that hold unconditionally. It manages identities, organizations, roles, and governance transitions through a deterministic state machine. Features include:

- **11 structural invariants** — identity uniqueness, role hierarchy, transition validity, etc.
- **Dual-witness validation** — critical operations require two independent witnesses
- **XRPL attestation hooks** — governance transitions produce attestation-ready payloads
- **Rehydration** — `rehydrate()` rebuilds state from a sequence of events

This is the constitutional layer. If Registrum rejects something, the system halts. No override, no exception.

---

### @attestia/ledger
**Purpose:** Append-only double-entry accounting engine.
**Runtime deps:** None.
**Tests:** 144.

A pure-function ledger that enforces the fundamental accounting equation: every debit has an equal credit. Features include:

- **Chart of accounts** with hierarchical account types (asset, liability, equity, revenue, expense)
- **Journal entries** — immutable, timestamped, balanced
- **Trial balance** — always computable, always balanced
- **Append-only** — no UPDATE, no DELETE, only new entries

Ported from the Python-based Payroll Engine. Zero runtime dependencies — pure math and state machines.

---

### @attestia/chain-observer
**Purpose:** Multi-chain read-only observation layer.
**Runtime deps:** viem, xrpl.js.
**Tests:** 55.

Observes blockchain state without modifying it. Supports:

- **EVM chains** — Ethereum, Arbitrum, Base, Optimism (via viem)
- **XRPL** — XRP Ledger (via xrpl.js)
- Balance queries, transaction history, token metadata
- Chain-agnostic interface — consumers don't need to know which chain they're reading

This is the only package where external chain SDKs are permitted.

---

### @attestia/vault
**Purpose:** Personal financial management — observe, budget, allocate.
**Runtime deps:** Internal packages only.
**Tests:** 67.

The individual's view of their finances across chains. Features include:

- **Multi-chain portfolio observation** — aggregate balances across EVM + XRPL
- **Envelope budgeting** — allocate funds to named envelopes with spending limits
- **Intent declaration** — express financial intentions before execution
- **Allocation tracking** — map intents to budgets with constraint validation

Evolved from the NextLedger project (C#).

---

### @attestia/treasury
**Purpose:** Organizational financial management — payroll, distributions, funding gates.
**Runtime deps:** Internal packages only.
**Tests:** 63.

The organization's financial control plane. Features include:

- **Deterministic payroll** — define runs, calculate distributions, execute with full audit trail
- **DAO distributions** — proportional allocation with configurable rules
- **Dual-gate funding** — two independent approvals required for fund release
- **Double-entry integration** — all treasury operations produce balanced ledger entries

Evolved from the Python-based Payroll Engine.

---

### @attestia/reconciler
**Purpose:** Cross-system reconciliation — match intents to reality.
**Runtime deps:** Internal packages only.
**Tests:** 36.

The truth engine. Reconciler performs 3D matching across three dimensions:

1. **Intent** — what was declared
2. **Ledger** — what was recorded
3. **Chain** — what actually happened on-chain

When all three agree, the record is clean. When they disagree, the system halts (fail-closed). Produces reconciliation reports that feed into the witness for on-chain attestation.

---

### @attestia/witness
**Purpose:** XRPL on-chain attestation — write proofs to the ledger.
**Runtime deps:** xrpl.js.
**Tests:** 127.

Takes reconciliation reports and attestation payloads and writes them to the XRP Ledger as payment memos. Features include:

- **Memo encoding** — structured attestation data in XRPL payment memos
- **Round-trip verification** — submit, fetch, decode, verify
- **Retry with exponential backoff** — handles transient XRPL failures
- **Docker-based integration testing** — standalone `rippled` node, sub-second ledger close

The witness is the bridge between Attestia's internal truth and public, verifiable proof.

---

### @attestia/verify
**Purpose:** Deterministic replay verification.
**Runtime deps:** Internal packages only.
**Tests:** 24.

Answers one question: given the same sequence of events, do we arrive at the same state? Features include:

- **Full replay verification** — rebuild state from events and compare
- **GlobalStateHash** — a single hash representing the complete system state
- **Hash comparison** — quick integrity check without full replay

If replay produces a different result, something is wrong. Fail-closed.

---

### @attestia/event-store
**Purpose:** Append-only event persistence with hash chaining.
**Runtime deps:** None.
**Tests:** 180.

The durable backbone. All domain events flow through the event store. Features include:

- **In-memory store** — for testing and ephemeral workloads
- **JSONL file store** — one event per line, crash-safe via fsync
- **Hash chaining** — each event includes a hash of the previous, forming a tamper-evident chain
- **Snapshot support** — periodic state snapshots for fast recovery
- **Event catalog** — 20 formalized event types with schema versioning and migration support

---

### @attestia/node
**Purpose:** HTTP service — the deployable API surface.
**Runtime deps:** Hono, pino, Zod.
**Tests:** 131.

The operational interface to the entire Attestia stack. Built on Hono with a full middleware stack:

**17 API endpoints under `/api/v1/`:**

| Category | Endpoints |
|----------|-----------|
| Intent lifecycle | `POST /intents`, `GET /intents`, `GET /intents/:id`, `POST /intents/:id/approve`, `POST /intents/:id/reject`, `POST /intents/:id/execute`, `POST /intents/:id/verify` |
| Events | `GET /events`, `GET /events/:streamId` |
| Verification | `POST /verify/replay`, `POST /verify/hash` |
| Reconciliation | `POST /reconcile`, `POST /attest`, `GET /attestations` |
| Export | `GET /export/events` (NDJSON stream), `GET /export/state` (snapshot + GlobalStateHash) |

**Infrastructure endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness probe |
| `GET /ready` | Readiness probe |
| `GET /metrics` | Prometheus metrics |

**Cross-cutting concerns:**
- **Authentication** — API-key (`X-Api-Key`) + JWT bearer (`Authorization: Bearer`)
- **Authorization** — Role-based (admin > operator > viewer)
- **Multi-tenancy** — Isolated service instances via `TenantRegistry`
- **Rate limiting** — Token-bucket per identity with `429 + Retry-After`
- **Idempotency** — `Idempotency-Key` header with TTL cache
- **ETags** — SHA-256 based conditional requests
- **Observability** — Prometheus counters/histograms, pino structured logging, `X-Request-Id`
- **Deployment** — Multi-stage Dockerfile (node:22-slim), Docker Compose with rippled
- **Graceful shutdown** — SIGTERM/SIGINT handling

---

## Principles

These hold at every phase and are not negotiable:

| Principle | What it means |
|-----------|---------------|
| **Humans approve; machines verify** | No AI or automation ever approves, signs, or executes |
| **Append-only** | No UPDATE, no DELETE — only new entries |
| **Fail-closed** | Disagreement halts the system; never heals silently |
| **Deterministic replay** | Same events produce the same state, always |
| **Chains are witnesses, not authorities** | XRPL attests; authority flows from structural rules |
| **Zero deps on the critical path** | External libraries only at the edges (chain SDKs, HTTP frameworks) |
| **Truth over speed** | Every financial event is replayable and reconcilable |
| **Intent is not execution** | Declaring what you want and doing it are separate acts with separate gates |
| **Structural governance** | Invariants hold unconditionally — not governance by vote |
| **Advisory AI only** | AI can analyze, warn, suggest — never approve, sign, or execute |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (ES modules) |
| Runtime | Node.js 20+ |
| Package manager | pnpm 10.28 (workspaces) |
| Build | tsc (per-package) |
| Test framework | Vitest |
| HTTP framework | Hono |
| Logging | pino |
| Validation | Zod |
| EVM interaction | viem |
| XRPL interaction | xrpl.js |
| CI | GitHub Actions (Node 20 + 22 matrix) |
| Coverage | Codecov (OIDC auth) |
| Container | Docker (node:22-slim, multi-stage) |
| XRPL testing | Standalone rippled in Docker |

---

## Project Status & Roadmap

### Current State

Phases 1 through 8 are complete. Phase 9 is in progress. All 11 packages are built, tested, and operational.

### Milestones

| Milestone | Description | Status |
|-----------|-------------|--------|
| **M1: Domain Logic** | All core business logic across 11 packages | Done |
| **M2: Production-Grade** | CI, Docker XRPL, replay verification | Done |
| **M3: Durable** | Event store complete; rehydration pending | In Progress |
| **M4: API Surface** | Deployable REST API with auth + multi-tenancy | Done |
| **M5: Integrated** | Full intent-to-proof pipeline, E2E tests | Planned |
| **M6: Accessible** | SDK generation, WebSocket/SSE real-time | Planned |
| **M7: Multi-Chain** | Solana, L2 observers, multi-sig witness | Planned |
| **M8: Intelligent** | Anomaly detection, intent suggestions, NL queries | Planned |
| **M9: User-Facing** | Vault UI, Treasury dashboard, Attestation explorer | Planned |
| **M10: Distributed** | npm publishing, Docker images, documentation site | Planned |

### What's Next (Phase 9)

- Pipeline orchestration — wire the full Intent-to-Verify flow
- End-to-end integration test suite
- Typed client SDK (auto-generated from OpenAPI)
- WebSocket/SSE for real-time reconciliation updates
- XRPL testnet and mainnet verification

---

## Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for XRPL integration tests)

### Quick Start

```bash
pnpm install                # Install all dependencies
pnpm build                  # Build all packages
pnpm test                   # Run all tests (1,176+)
pnpm test:coverage          # Run with coverage reporting
pnpm typecheck              # Type-check all packages
pnpm bench                  # Run benchmarks
```

### XRPL Integration Testing

```bash
docker compose up -d                                      # Start standalone rippled
pnpm --filter @attestia/witness run test:integration      # Run on-chain round-trip tests
docker compose down                                       # Stop rippled
```

### Docker Deployment

```bash
docker compose up           # Start attestia-node + rippled
curl http://localhost:3000/health
```

### CI Pipeline

GitHub Actions runs on every push and PR to `main`:

1. Install dependencies (pnpm)
2. Build all packages
3. Type-check all packages
4. Run tests with coverage (Node 20 + 22 matrix)
5. Run benchmarks (Node 22 only)
6. Upload coverage to Codecov (OIDC)

Branch protection requires passing CI checks and one review approval.

---

## Repository Structure

```
attestia/
├── packages/
│   ├── types/              # @attestia/types
│   ├── registrum/          # @attestia/registrum
│   ├── ledger/             # @attestia/ledger
│   ├── chain-observer/     # @attestia/chain-observer
│   ├── vault/              # @attestia/vault
│   ├── treasury/           # @attestia/treasury
│   ├── reconciler/         # @attestia/reconciler
│   ├── witness/            # @attestia/witness
│   ├── verify/             # @attestia/verify
│   ├── event-store/        # @attestia/event-store
│   └── node/               # @attestia/node
├── .github/
│   ├── workflows/ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
├── docker-compose.yml
├── Dockerfile
├── DESIGN.md               # Architecture decisions
├── ROADMAP.md              # Full project roadmap
├── HANDBOOK.md             # This document
├── LICENSE                 # MIT
└── package.json            # Root workspace config
```

---

## Contributing

1. Fork the repository
2. Create a feature branch from `main`
3. Make changes with tests
4. Ensure all checks pass: `pnpm build && pnpm typecheck && pnpm test`
5. Open a PR against `main`

Branch protection requires:
- At least 1 approving review
- All CI checks passing (build, typecheck, tests on Node 20 + 22)
- No force pushes

---

## License

[MIT](LICENSE) — Copyright (c) 2026 mcp-tool-shop-org
