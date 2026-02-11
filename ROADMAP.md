# Attestia — Roadmap

Last updated: February 11, 2026

---

## Where We Are

**11 packages, 947 tests, all green. CI enforced. Coverage gated.**

| Package | Status | Tests | Purpose |
|---------|--------|-------|---------|
| `@attestia/types` | ✅ Complete | 52 | Shared domain types (zero deps) |
| `@attestia/registrum` | ✅ Complete | 297 | Constitutional governance — 11 invariants, dual-witness |
| `@attestia/ledger` | ✅ Complete | 144 | Append-only double-entry engine |
| `@attestia/chain-observer` | ✅ Complete | 55 | Multi-chain read-only observation (EVM + XRPL) |
| `@attestia/vault` | ✅ Complete | 59 | Personal vault — portfolios, budgets, intents |
| `@attestia/treasury` | ✅ Complete | 63 | Org treasury — payroll, distributions, funding gates |
| `@attestia/reconciler` | ✅ Complete | 36 | 3D cross-system matching + Registrum attestation |
| `@attestia/witness` | ✅ Complete | 81 | XRPL on-chain attestation via payment memos |
| `@attestia/verify` | ✅ Complete | 24 | Deterministic replay verification + GlobalStateHash |
| `@attestia/event-store` | ✅ Complete | 136 | Append-only event persistence, JSONL, catalog, snapshots |

**What we have:** All core domain logic, event sourcing infrastructure, CI pipeline with coverage enforcement, property-based testing, RFC 8785 canonicalization.

**What we don't have:** Rehydration (fromEvents), networking, end-to-end integration, API surfaces, or any user-facing layer.

---

## Phase 6 — Hardening

**Goal:** Make the existing codebase production-grade without adding new features.

### 6.1 — JSON Canonicalization (RFC 8785)

Replace the hand-rolled `sortKeys` canonicalization in `@attestia/witness` with RFC 8785 (JCS) compliant serialization. Content-addressed systems live or die by deterministic serialization.

- [ ] Implement or adopt RFC 8785 (JSON Canonicalization Scheme)
- [ ] Handle edge cases: unicode normalization, IEEE 754 number formatting, nested arrays
- [ ] Add property-based tests (fast-check) to verify determinism across inputs
- [ ] Apply to both `@attestia/witness` payload hashing and `@attestia/registrum` attestation

### 6.2 — `@attestia/types` Tests

The only package with zero tests. Types are compile-time checked, but the type guards, factories, and utility functions (`parseAmount`, `zeroMoney` re-exports, event metadata builders) need runtime test coverage.

- [ ] Add type guard tests (narrowing, edge cases)
- [ ] Add factory function tests
- [ ] Target: 30+ tests

### 6.3 — CI Pipeline

No CI exists. Every commit should prove the system is green.

- [x] GitHub Actions workflow: `pnpm install → build → test` on push + PR
- [x] Matrix: Node 20 + Node 22
- [ ] Coverage reporting (aim: ≥95% on registrum, ledger; ≥90% elsewhere)
- [ ] Lint pass (biome or eslint — pick one, enforce consistently)
- [x] Type-check pass (`tsc --noEmit` across all packages)

### 6.5 — Docker-Based XRPL Integration Testing

Use `rippleci/rippled` in standalone mode for deterministic, offline XRPL integration tests. No testnet dependency, no faucet, sub-second ledger close via `ledger_accept`.

- [x] Docker Compose with standalone `rippled` (WebSocket on port 6006, admin RPC on port 5005)
- [x] Integration test suite: submit attestation → close ledger → fetch → verify round-trip
- [x] Tests skip gracefully when Docker/rippled unavailable (CI-optional)
- [ ] Add rippled service to GitHub Actions CI pipeline

### 6.4 — Property-Based Testing

The current test suite is example-based. Financial systems need invariant testing.

- [ ] Add fast-check to registrum (invariants hold for arbitrary transitions)
- [ ] Add fast-check to ledger (trial balance always balances, no negative-amount creation)
- [ ] Add fast-check to reconciler (matching is commutative, deterministic)
- [ ] Add fast-check to witness (canonicalize is idempotent, hash is deterministic)

---

## Phase 7 — Persistence & Event Sourcing

**Goal:** Make state durable and replayable. Currently everything lives in-memory and vanishes on process restart.

### 7.1 — `@attestia/event-store`

A new package for append-only event persistence.

- [x] Define `EventStore` interface: `append(event)`, `read(streamId, fromVersion?)`, `subscribe(streamId)`
- [x] In-memory implementation (for tests — replace raw arrays in vault/treasury/reconciler)
- [x] File-based implementation (JSONL — one event per line, crash-safe via fsync)
- [ ] Optional: SQLite implementation (single-file, zero-config, good for desktop/server)
- [x] Snapshot support: `SnapshotStore` interface + InMemory + File implementations

### 7.2 — Rehydration

Each package's state machines need to rebuild from events.

- [ ] `Vault.fromEvents(events[])` — reconstruct portfolio, budgets, intents
- [ ] `Treasury.fromEvents(events[])` — reconstruct payroll runs, distributions, gates
- [ ] `Reconciler.fromEvents(events[])` — reconstruct reports and attestation records
- [ ] `XrplWitness.fromEvents(events[])` — reconstruct witness record index
- [ ] Registrum already has `rehydrate()` — verify it works with the event store interface

### 7.3 — Event Catalog

- [x] Formalize all domain events across packages into a unified catalog (20 event types)
- [x] Schema versioning strategy (so old events remain readable after code changes)
- [x] Event migration support (transform v1 events to v2 shape via chained migrations)

---

## Phase 8 — End-to-End Pipeline

**Goal:** Wire the full `Intent → Approve → Execute → Verify` flow. This is the core promise of Attestia and the first true integration test.

### 8.1 — `@attestia/pipeline`

A new package that orchestrates the end-to-end flow.

```
Intent declared (Vault)
  → Registrum validates structurally
  → Human approves (explicit sign-off)
  → Treasury executes (ledger posting)
  → Chain observer confirms on-chain
  → Reconciler matches intent ↔ ledger ↔ chain
  → Witness writes proof to XRPL
```

- [ ] Define `Pipeline` interface with step lifecycle hooks
- [ ] Implement `PipelineRunner` that executes steps sequentially with fail-closed semantics
- [ ] Each step produces events consumed by the next step
- [ ] No step is skippable — the pipeline halts on any failure
- [ ] Dry-run mode (simulates the full flow without on-chain submission)

### 8.2 — Integration Test Suite

- [ ] Create `packages/e2e/` or a top-level `e2e/` directory
- [ ] Test: clean reconciliation flow (intent matches ledger matches chain)
- [ ] Test: mismatch detection (intent amount ≠ on-chain amount)
- [ ] Test: missing chain event (intent + ledger entry but no on-chain tx)
- [ ] Test: registrum rejection (structural invariant violation halts pipeline)
- [ ] Test: witness dry-run (full flow without XRPL connection)
- [ ] Test: replay (pipeline produces same witness record from same events)

### 8.3 — XRPL On-Chain Verification

Standalone `rippled` Docker container provides deterministic on-chain testing without network dependencies (see Phase 6.5). For production readiness:

- [x] Full round-trip proven: build → encode → submit → ledger_accept → fetch → decode → verify
- [ ] Testnet smoke test with funded witness account (validates against live network)
- [ ] Mainnet dry-run verification (read-only — verify existing attestations)

---

## Phase 9 — API Layer

**Goal:** Expose Attestia's capabilities to external consumers. The domain logic is complete; now it needs a surface area.

### 9.1 — `@attestia/api`

REST/GraphQL API for programmatic access.

- [ ] Framework choice: Hono (lightweight, edge-compatible) or Fastify (ecosystem)
- [ ] Endpoints: intent lifecycle, treasury operations, reconciliation reports, witness records
- [ ] OpenAPI spec generation from TypeScript types
- [ ] Authentication: API keys for service-to-service, JWT for user context
- [ ] Rate limiting and audit logging

### 9.2 — `@attestia/sdk`

Typed client SDK for API consumers.

- [ ] Auto-generated from OpenAPI spec
- [ ] First-class TypeScript types (shared with `@attestia/types`)
- [ ] Retry logic, connection pooling, error normalization

### 9.3 — WebSocket / SSE for Real-Time

- [ ] Live reconciliation status updates
- [ ] Chain observer event streaming
- [ ] Witness confirmation notifications

---

## Phase 10 — Multi-Chain Expansion

**Goal:** Move beyond EVM + XRPL to cover additional chains relevant to financial infrastructure.

### 10.1 — Solana Observer

- [ ] Read balances, token accounts, and transaction history
- [ ] SPL token support
- [ ] Program log parsing for custom event extraction

### 10.2 — L2 Observers (Arbitrum, Base, Optimism)

- [ ] Extend EVM observer with L2-specific RPC quirks
- [ ] Handle reorgs and sequencer finality differences
- [ ] Cross-L2 reconciliation (same intent, different settlement layers)

### 10.3 — XRPL EVM Sidechain

- [ ] If XRPL's EVM sidechain matures, observe both native XRPL + sidechain
- [ ] Bridge attestation: prove that a cross-chain transfer landed on both sides

### 10.4 — Multi-Sig Witness Governance

- [ ] Use XRPL's native multi-sig for witness accounts
- [ ] N-of-M witness quorum for high-value attestations
- [ ] Signer rotation with Registrum governance tracking

---

## Phase 11 — Advisory Intelligence

**Goal:** AI advises, humans decide. AI never approves, signs, or executes.

### 11.1 — Anomaly Detection

- [ ] Statistical analysis on reconciliation history (drift detection, outlier flagging)
- [ ] Alert when a transaction pattern deviates from historical norms
- [ ] No auto-remediation — surface findings to human operators

### 11.2 — Intent Suggestion

- [ ] Based on recurring patterns (e.g., monthly payroll), suggest pre-built intents
- [ ] Humans review, modify, and explicitly approve suggestions
- [ ] Suggestion audit trail in event store

### 11.3 — Reconciliation Triage

- [ ] When reconciliation produces mismatches, rank discrepancies by severity
- [ ] Suggest probable causes (timing delay, fee delta, partial fill)
- [ ] Surface relevant historical resolutions

### 11.4 — Natural Language Queries

- [ ] "Show me all unreconciled intents from last month"
- [ ] "What was the total payroll distribution for Q4?"
- [ ] Translate natural language to reconciler/ledger/vault queries

---

## Phase 12 — User Interfaces

**Goal:** Make Attestia accessible to non-developers. The internals are event-sourced and API-driven by this point — UIs are thin consumers.

### 12.1 — Personal Vault UI

- [ ] Framework: Next.js or SvelteKit
- [ ] Multi-chain portfolio dashboard (read-only observation)
- [ ] Envelope budget management
- [ ] Intent declaration and approval workflow
- [ ] Reconciliation status per intent

### 12.2 — Org Treasury Dashboard

- [ ] Payroll run management and approval flow
- [ ] Distribution plan builder
- [ ] Funding gate configuration
- [ ] Double-entry ledger explorer
- [ ] Trial balance and financial statements

### 12.3 — Attestation Explorer

- [ ] Browse witness records chronologically
- [ ] Link to XRPL transaction explorer for on-chain proof
- [ ] Verify attestation integrity from the UI
- [ ] Reconciliation report viewer with match/mismatch highlighting

---

## Phase 13 — Distribution & Packaging

**Goal:** Make Attestia consumable by the ecosystem.

### 13.1 — npm Publishing

- [ ] Publish all `@attestia/*` packages to npm
- [ ] Semantic versioning with conventional commits
- [ ] Changesets for coordinated multi-package releases
- [ ] Provenance attestation on npm packages (package-lock provenance)

### 13.2 — Docker

- [x] Docker Compose for standalone `rippled` (integration testing)
- [ ] `attestia/server` image — API + event store + witness
- [ ] `attestia/observer` image — chain observer as a standalone service
- [ ] Docker Compose for local development (API + observer + rippled)

### 13.3 — Documentation Site

- [ ] API reference (auto-generated from TypeScript + OpenAPI)
- [ ] Architecture guide (expanded from DESIGN.md)
- [ ] Tutorial: "Attest your first financial event"
- [ ] Tutorial: "Set up a multi-chain treasury"

---

## Milestones

| Milestone | Packages | Key Deliverable | Status |
|-----------|----------|-----------------|--------|
| **M1: Domain Logic** | types, registrum, ledger, chain-observer, vault, treasury, reconciler, witness | All core business logic with 947 tests | ✅ Done |
| **M2: Production-Grade** | CI, canonicalization, property tests, types tests, verify, Docker XRPL | Hardened + replay verification | ✅ Done |
| **M3: Durable** | event-store (done), rehydration (pending) | Event persistence + snapshots + catalog | 🔄 In Progress |
| **M4: Integrated** | pipeline, e2e tests, XRPL testnet | Full intent→proof flow proven | Planned |
| **M5: Accessible** | api, sdk, websocket | External consumers can use Attestia | Planned |
| **M6: Multi-Chain** | solana, L2s, multi-sig witness | Beyond EVM + XRPL | Planned |
| **M7: Intelligent** | anomaly detection, suggestions, NL queries | AI-assisted (never AI-decided) | Planned |
| **M8: User-Facing** | vault UI, treasury dashboard, explorer | Non-developers can use Attestia | Planned |
| **M9: Distributed** | npm, docker, docs site | Ecosystem adoption | Planned |

---

## Principles (Unchanged)

These hold at every phase:

1. **Humans approve; machines verify.** No AI or automation ever approves, signs, or executes.
2. **Append-only.** No UPDATE, no DELETE. Only new entries.
3. **Fail-closed.** Disagreement halts the system. Never heals silently.
4. **Deterministic replay.** Same events → same state. Always.
5. **Chains are witnesses, not authorities.** XRPL attests. Authority flows from structural rules.
6. **Zero deps on the critical path.** External libraries only at the edges (chain SDKs, HTTP frameworks).
