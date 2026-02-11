# Attestia — Roadmap

Last updated: February 11, 2026

---

## Where We Are

**12 packages, 1,176 tests, all green. CI enforced. Coverage gated. Benchmarks baselined.**

| Package | Status | Tests | Purpose |
|---------|--------|-------|---------|
| `@attestia/types` | ✅ Complete | 52 | Shared domain types (zero deps) |
| `@attestia/registrum` | ✅ Complete | 297 | Constitutional governance — 11 invariants, dual-witness |
| `@attestia/ledger` | ✅ Complete | 144 | Append-only double-entry engine |
| `@attestia/chain-observer` | ✅ Complete | 180 | Multi-chain read-only observation (EVM + XRPL) |
| `@attestia/vault` | ✅ Complete | 55 | Personal vault — portfolios, budgets, intents |
| `@attestia/treasury` | ✅ Complete | 63 | Org treasury — payroll, distributions, funding gates |
| `@attestia/reconciler` | ✅ Complete | 36 | 3D cross-system matching + Registrum attestation |
| `@attestia/witness` | ✅ Complete | 127 | XRPL on-chain attestation, retry, degradation |
| `@attestia/verify` | ✅ Complete | 24 | Deterministic replay verification + GlobalStateHash |
| `@attestia/event-store` | ✅ Complete | 67 | Append-only event persistence, JSONL, hash chain, snapshots |
| `@attestia/node` | ✅ Complete | 131 | Hono REST API — 17 endpoints, auth, multi-tenancy, metrics, export |

**What we have:** All core domain logic, event sourcing, CI pipeline, deployable HTTP API with auth + multi-tenancy + observability. Tamper-evident hash chain, witness retry, startup integrity check, auditor export APIs, performance benchmarks. Docker Compose for full-stack deployment.

**What we don't have:** Rehydration (fromEvents), end-to-end pipeline orchestration, SDK generation, or user-facing UIs.

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

## Phase 8 — Service Layer, API Surface & Operator Tooling ✅

**Goal:** Expose a deployable Attestia node with stable v1 REST API, auth, multi-tenancy, and observability.

### 8.1 — API Contract & Types
- [x] Zod-validated DTOs for all endpoints
- [x] Error envelope format: `{ error: { code, message, details? } }`
- [x] Cursor-based pagination: `{ data, pagination: { cursor, hasMore } }`
- [x] URL-path versioning strategy (`/api/v1/`)

### 8.2 — `@attestia/node` Service Layer
- [x] `AttestiaService` composition root wiring all 10 domain packages
- [x] `TenantRegistry` for isolated multi-tenant service instances
- [x] Hono app factory with full middleware stack

### 8.3 — Core API Endpoints (17 endpoints)
- [x] Intent lifecycle: declare, list, get, approve, reject, execute, verify
- [x] Event queries: all events, per-stream events
- [x] Verification: replay-based and hash-based
- [x] Reconciliation: reconcile + attest + list attestations
- [x] Health: `/health` + `/ready`
- [x] Metrics: `/metrics` (Prometheus text)

### 8.4 — Auth, Tenancy, Rate Limiting
- [x] API-key auth via `X-Api-Key` header
- [x] JWT bearer auth via `Authorization: Bearer` (HMAC-SHA256)
- [x] Role-based permission guards (admin > operator > viewer)
- [x] Token-bucket rate limiter per identity (429 + Retry-After)
- [x] Auth-derived tenant isolation

### 8.5 — Idempotency & Concurrency
- [x] `Idempotency-Key` header with TTL-based in-memory cache
- [x] ETag generation for intent state (SHA-256)

### 8.6 — Observability
- [x] Hand-rolled Prometheus metrics (counters + histograms)
- [x] Structured request logging via pino
- [x] X-Request-Id propagation

### 8.7 — Docker & Deployment
- [x] Multi-stage Dockerfile (node:22-slim)
- [x] Docker Compose: attestia-node + rippled
- [x] Env-based configuration via Zod schema
- [x] Graceful shutdown (SIGTERM, SIGINT)

### 8.8 — Documentation
- [x] curl examples for full lifecycle
- [x] API versioning strategy document

---

## Phase 9 — Production Pilot, Audit Readiness & Reference Deployment ✅

**Goal:** Tamper-evident storage, resilient witness, meaningful observability, reference pilot, auditor artifacts, performance baselines. Exit criteria: an auditor can independently replay the system to the same GlobalStateHash.

### 9.1 — Pilot Use Case & Export API
- [x] "Monthly payroll reconciliation" pilot defined (`PILOT_SCOPE.md`)
- [x] `GET /api/v1/export/events` — NDJSON event stream
- [x] `GET /api/v1/export/state` — snapshot + GlobalStateHash
- [x] End-to-end payroll lifecycle test (declare → attest → export → replay verify)

### 9.2 — Event Store Hash Chaining & Witness Retry
- [x] SHA-256 hash chain on all appended events (RFC 8785 canonicalization)
- [x] `verifyIntegrity()` on InMemory and JSONL event stores
- [x] Snapshot `stateHash` computed on save, verified on load
- [x] Exponential backoff retry with jitter for XRPL submissions
- [x] `WitnessSubmitResult` union: `submitted` | `degraded`

### 9.3 — Startup Self-Check & Business Metrics
- [x] `initialize()` verifies event store integrity before accepting requests
- [x] `/ready` reports per-subsystem status (503 if critical subsystem down)
- [x] Business metrics: intents, reconciliation, attestation, witness counters
- [x] Append-only audit log with actor + timestamp

### 9.4 — Edge Case Testing
- [x] Hash chain property tests (fast-check)
- [x] JSONL corruption recovery tests
- [x] Concurrent mutation tests
- [x] Idempotency conflict behavior tests
- [x] Witness timeout + degradation tests
- [x] Rate limit exhaustion + recovery tests
- [x] Event catalog migration roundtrip

### 9.5 — Auditor Artifacts
- [x] `THREAT_MODEL.md` — STRIDE analysis per component
- [x] `CONTROL_MATRIX.md` — 20 threat → control → file → test mappings
- [x] `VERIFICATION_GUIDE.md` — Auditor step-by-step replay guide
- [x] `UPGRADE_GUIDE.md` — Deploy without losing state
- [x] `ARCHITECTURE.md` — Package graph, data flows, security model
- [x] `SECURITY.md` — Responsible disclosure policy

### 9.6 — Performance Baseline & CI Gate
- [x] Benchmarks: event store, hash chain, GlobalStateHash, intent lifecycle
- [x] `PERFORMANCE_BASELINE.md` with recorded baselines
- [x] CI benchmark step (Node 22 only)

### 9.7 — Governance
- [x] Proposal 002: Phase 9 operational changes (Class B)

---

## Phase 10.5 — Category Standardization & Institutional Adoption ✅

**Goal:** Define Attestia as a formal financial control standard. Produce implementation-agnostic specifications, reference architecture, governance process for specs, and institutional readiness documentation. Documentation only — no code changes.

### 10.5.1 — Formal Specifications (RFC-001 through RFC-005)
- [x] `specs/DEFINITIONS.md` — Normative term definitions shared across all RFCs
- [x] `specs/RFC-001-DETERMINISTIC-EVENT-MODEL.md` — Event structure, hash chain, append-only semantics
- [x] `specs/RFC-002-PROOF-OF-RECONCILIATION.md` — 3D matching, report hashing, attestation format
- [x] `specs/RFC-003-INTENT-CONTROL-STANDARD.md` — Intent lifecycle state machine, double-entry accounting
- [x] `specs/RFC-004-GLOBAL-STATE-HASH.md` — Deterministic replay verification, subsystem hashing
- [x] `specs/RFC-005-WITNESS-PROTOCOL.md` — XRPL memo encoding, retry semantics, degraded mode

### 10.5.2 — Reference Architecture & Integration Guide
- [x] `REFERENCE_ARCHITECTURE.md` — 5-layer stack model, deployment patterns, trust boundaries
- [x] `INTEGRATION_GUIDE.md` — API integration with curl examples for full intent lifecycle

### 10.5.3 — Governance & Institutional Readiness
- [x] `packages/registrum/docs/governance/RFC_PROCESS.md` — RFC lifecycle: Draft → Review → Final → Superseded
- [x] `INSTITUTIONAL_READINESS.md` — Adoption readiness checklist for organizations
- [x] Governance proposal 003: Phase 10.5 as Class A (documentation only)

---

## Phase 10 — End-to-End Pipeline & SDK

**Goal:** Wire the full `Intent → Approve → Execute → Verify` pipeline and provide SDK for consumers.

### 10.1 — `@attestia/pipeline`

- [ ] Define `Pipeline` interface with step lifecycle hooks
- [ ] Implement `PipelineRunner` with fail-closed semantics
- [ ] Dry-run mode (simulates without on-chain submission)

### 10.2 — Integration Test Suite

- [ ] Create `packages/e2e/` directory
- [ ] Test: clean reconciliation flow
- [ ] Test: mismatch detection
- [ ] Test: registrum rejection halts pipeline
- [ ] Test: replay produces same results

### 10.3 — `@attestia/sdk`

Typed client SDK for API consumers.

- [ ] Auto-generated from OpenAPI spec
- [ ] First-class TypeScript types (shared with `@attestia/types`)
- [ ] Retry logic, error normalization

### 10.4 — WebSocket / SSE for Real-Time

- [ ] Live reconciliation status updates
- [ ] Chain observer event streaming
- [ ] Witness confirmation notifications

### 10.5 — XRPL On-Chain Verification

- [x] Full round-trip proven: build → encode → submit → ledger_accept → fetch → decode → verify
- [ ] Testnet smoke test with funded witness account
- [ ] Mainnet dry-run verification (read-only)

---

## Phase 11 — Multi-Chain Expansion

**Goal:** Move beyond EVM + XRPL to cover additional chains relevant to financial infrastructure.

### 11.1 — Solana Observer

- [ ] Read balances, token accounts, and transaction history
- [ ] SPL token support
- [ ] Program log parsing for custom event extraction

### 11.2 — L2 Observers (Arbitrum, Base, Optimism)

- [ ] Extend EVM observer with L2-specific RPC quirks
- [ ] Handle reorgs and sequencer finality differences
- [ ] Cross-L2 reconciliation (same intent, different settlement layers)

### 11.3 — XRPL EVM Sidechain

- [ ] If XRPL's EVM sidechain matures, observe both native XRPL + sidechain
- [ ] Bridge attestation: prove that a cross-chain transfer landed on both sides

### 11.4 — Multi-Sig Witness Governance

- [ ] Use XRPL's native multi-sig for witness accounts
- [ ] N-of-M witness quorum for high-value attestations
- [ ] Signer rotation with Registrum governance tracking

---

## Phase 12 — Advisory Intelligence

**Goal:** AI advises, humans decide. AI never approves, signs, or executes.

### 12.1 — Anomaly Detection

- [ ] Statistical analysis on reconciliation history (drift detection, outlier flagging)
- [ ] Alert when a transaction pattern deviates from historical norms
- [ ] No auto-remediation — surface findings to human operators

### 12.2 — Intent Suggestion

- [ ] Based on recurring patterns (e.g., monthly payroll), suggest pre-built intents
- [ ] Humans review, modify, and explicitly approve suggestions
- [ ] Suggestion audit trail in event store

### 12.3 — Reconciliation Triage

- [ ] When reconciliation produces mismatches, rank discrepancies by severity
- [ ] Suggest probable causes (timing delay, fee delta, partial fill)
- [ ] Surface relevant historical resolutions

### 12.4 — Natural Language Queries

- [ ] "Show me all unreconciled intents from last month"
- [ ] "What was the total payroll distribution for Q4?"
- [ ] Translate natural language to reconciler/ledger/vault queries

---

## Phase 13 — User Interfaces

**Goal:** Make Attestia accessible to non-developers. The internals are event-sourced and API-driven by this point — UIs are thin consumers.

### 13.1 — Personal Vault UI

- [ ] Framework: Next.js or SvelteKit
- [ ] Multi-chain portfolio dashboard (read-only observation)
- [ ] Envelope budget management
- [ ] Intent declaration and approval workflow
- [ ] Reconciliation status per intent

### 13.2 — Org Treasury Dashboard

- [ ] Payroll run management and approval flow
- [ ] Distribution plan builder
- [ ] Funding gate configuration
- [ ] Double-entry ledger explorer
- [ ] Trial balance and financial statements

### 13.3 — Attestation Explorer

- [ ] Browse witness records chronologically
- [ ] Link to XRPL transaction explorer for on-chain proof
- [ ] Verify attestation integrity from the UI
- [ ] Reconciliation report viewer with match/mismatch highlighting

---

## Phase 14 — Distribution & Packaging

**Goal:** Make Attestia consumable by the ecosystem.

### 14.1 — npm Publishing

- [ ] Publish all `@attestia/*` packages to npm
- [ ] Semantic versioning with conventional commits
- [ ] Changesets for coordinated multi-package releases
- [ ] Provenance attestation on npm packages (package-lock provenance)

### 14.2 — Docker

- [x] Docker Compose for standalone `rippled` (integration testing)
- [x] Docker Compose: attestia-node + rippled (full local stack)
- [x] Multi-stage Dockerfile for `@attestia/node`
- [ ] `attestia/observer` image — chain observer as a standalone service

### 14.3 — Documentation Site

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
| **M4: API Surface** | node | Deployable REST API with 17 endpoints, auth, multi-tenancy | ✅ Done |
| **M5: Audit-Ready** | hash chain, witness retry, export, benchmarks, docs | Auditor can replay to same GlobalStateHash; 1,176 tests | ✅ Done |
| **M5.5: Category Standard** | 5 RFCs, reference architecture, integration guide, RFC process, readiness checklist | Formal specification + institutional adoption path | ✅ Done |
| **M6: Integrated** | pipeline, e2e tests, XRPL testnet | Full intent→proof flow proven | Planned |
| **M7: Accessible** | sdk, websocket | External consumers can use Attestia | Planned |
| **M8: Multi-Chain** | solana, L2s, multi-sig witness | Beyond EVM + XRPL | Planned |
| **M9: Intelligent** | anomaly detection, suggestions, NL queries | AI-assisted (never AI-decided) | Planned |
| **M10: User-Facing** | vault UI, treasury dashboard, explorer | Non-developers can use Attestia | Planned |
| **M11: Distributed** | npm, docker, docs site | Ecosystem adoption | Planned |

---

## Principles (Unchanged)

These hold at every phase:

1. **Humans approve; machines verify.** No AI or automation ever approves, signs, or executes.
2. **Append-only.** No UPDATE, no DELETE. Only new entries.
3. **Fail-closed.** Disagreement halts the system. Never heals silently.
4. **Deterministic replay.** Same events → same state. Always.
5. **Chains are witnesses, not authorities.** XRPL attests. Authority flows from structural rules.
6. **Zero deps on the critical path.** External libraries only at the edges (chain SDKs, HTTP frameworks).
