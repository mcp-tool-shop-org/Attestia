# Attestia — Architecture

Technical architecture for developers and auditors.

---

## Package Dependency Graph

```
                         @attestia/types (zero deps)
                        /    |     |    \       \
                       /     |     |     \       \
                      v      v     v      v       v
              ledger  chain-observer  event-store  registrum (json-canonicalize)
              /    \       |    \          |
             /      \      |     \         |
            v        v     v      v        v
        treasury    vault  reconciler    verify ──── proof (json-canonicalize)
            \        |      /     |       /
             \       |     /      |      /
              v      v    v       v     v
               @attestia/node (Hono, pino, zod)
                      |         \
                      v          v
              witness (xrpl)    sdk (types only)
```

### External Dependencies

| Package | External Deps | Purpose |
|---------|--------------|---------|
| `types` | — | Zero deps. Shared domain types. |
| `registrum` | `json-canonicalize` | RFC 8785 for deterministic hashing |
| `ledger` | `@attestia/types` | Double-entry engine |
| `chain-observer` | `viem`, `xrpl`, `@solana/web3.js` | EVM + XRPL + Solana chain SDKs |
| `event-store` | `json-canonicalize` | Append-only persistence, 34 event types |
| `vault` | — | Internal deps only |
| `treasury` | — | Internal deps only |
| `reconciler` | `json-canonicalize` | Cross-system matching |
| `verify` | `json-canonicalize` | Replay verification, compliance, SLA |
| `witness` | `xrpl` | On-chain attestation, multi-sig governance |
| `node` | `hono`, `pino`, `zod` | HTTP API framework |
| `proof` | `json-canonicalize` | Merkle trees, inclusion proofs |
| `sdk` | `@attestia/types` (type-only) | Typed HTTP client SDK |

---

## Data Flow

### Intent Lifecycle

```
Client                   @attestia/node              Domain Packages
  |                           |                            |
  |-- POST /intents --------->|                            |
  |                           |-- vault.declare() -------->|
  |                           |-- eventStore.append() ---->|
  |<-- 201 { intent } -------|                            |
  |                           |                            |
  |-- POST /intents/:id/approve ->|                       |
  |                           |-- vault.approve() ------->|
  |<-- 200 ------------------|                            |
  |                           |                            |
  |-- POST /intents/:id/execute ->|                       |
  |                           |-- vault.execute() ------->|
  |<-- 200 ------------------|                            |
  |                           |                            |
  |-- POST /intents/:id/verify -->|                       |
  |                           |-- vault.verify() -------->|
  |                           |-- reconciler.reconcile() ->|
  |<-- 200 ------------------|                            |
```

### Reconciliation & Attestation

```
reconciler.reconcile()
  ├── Gather: vault intents, treasury entries, ledger entries, chain observations
  ├── Match: 3D cross-system matching (vault ↔ ledger ↔ chain)
  ├── Score: match/mismatch/partial per dimension
  └── Report: ReconciliationReport with deterministic hash

attestor.attest(report)
  ├── Verify report hash
  ├── Record in audit log
  └── Submit to witness (optional)

witness.submit(attestation)
  ├── Encode report hash as XRPL Payment memo
  ├── Sign with witness account
  ├── Submit to XRPL with retry (exponential backoff)
  └── Return tx hash or degraded result
```

---

## Event Sourcing Model

All state changes are captured as domain events.

### Event Flow

```
Command → Domain Logic → DomainEvent[] → EventStore → State
                                              |
                                              v
                                     JSONL file (append-only)
                                     Hash-chained (SHA-256)
```

### Event Structure

Every event contains:
- `type` — Namespaced event name (e.g., `vault.intent.declared`)
- `metadata` — `eventId`, `timestamp`, `actor`, `correlationId`, `source`
- `payload` — Event-specific data

### Hash Chain

Events are cryptographically linked:
```
Event[0].hash = SHA-256(canonicalize(event) + "genesis")
Event[n].hash = SHA-256(canonicalize(event) + Event[n-1].hash)
```

The chain is verified on startup via `verifyIntegrity()`. Any inserted, removed, or modified event breaks the chain.

### Snapshots

Periodic snapshots capture materialized state with a `stateHash`. The hash is computed on save and verified on load. Snapshots accelerate startup but are not authoritative — events are.

---

## Security Model

### Authentication

Two auth mechanisms, enforced by middleware:

1. **API Key** — `X-Api-Key` header. Keys are role-bound and tenant-scoped.
2. **JWT Bearer** — `Authorization: Bearer <token>`. HMAC-SHA256 signed.

### Authorization

Role hierarchy: `admin > operator > viewer`

Each endpoint declares a minimum permission level. The `requirePermission` middleware enforces it.

### Tenant Isolation

Tenant ID is derived from the authenticated identity, not from request parameters. Each tenant gets an isolated `AttestiaService` instance via `TenantRegistry`.

### Tamper Evidence

| Layer | Mechanism |
|-------|-----------|
| Events | SHA-256 hash chain |
| Snapshots | `stateHash` verified on load |
| Reports | `reportHash` computed at creation |
| Attestations | XRPL on-chain witness record |
| State | `GlobalStateHash` (deterministic replay) |

---

## Deployment Topology

### Single Node (Default)

```
┌────────────────────────────────────┐
│          @attestia/node            │
│  ┌──────────┐  ┌───────────────┐  │
│  │ Hono API │  │ AttestiaService│  │
│  │ (HTTP)   │──│ (per-tenant)  │  │
│  └──────────┘  └───────────────┘  │
│        │              │           │
│  ┌──────────┐  ┌───────────────┐  │
│  │Middleware│  │  EventStore   │  │
│  │ Stack    │  │  (JSONL file) │  │
│  └──────────┘  └───────────────┘  │
└────────────────────────────────────┘
         │                    │
    ┌────┴────┐         ┌────┴────┐
    │ Prometheus│       │  XRPL   │
    │ /metrics │       │ Network  │
    └─────────┘        └─────────┘
```

### Docker Compose

```yaml
services:
  attestia:
    image: attestia-node
    ports: ["3000:3000"]
    volumes: [attestia-data:/app/data]
    environment:
      ATTESTIA_EVENTS_FILE: /app/data/events.jsonl

  rippled:  # Optional — for integration testing
    image: rippleci/rippled
    ports: ["6006:6006"]
```

---

## External Verification

### Trust-Free Verification Flow

```
External Verifier                     Attestia Node
      |                                     |
      |-- GET /public/v1/verify/state-bundle ->|
      |<-- ExportableStateBundle ------------|
      |                                     |
      |  [Replay from bundle locally]       |
      |  [Compare hashes]                   |
      |  [Produce VerifierReport]           |
      |                                     |
      |-- POST /public/v1/verify/submit-report ->|
      |<-- Report ID ----------------------|
      |                                     |
      |-- GET /public/v1/verify/consensus ->|
      |<-- ConsensusResult ----------------|
```

### Merkle Proof Verification

```
@attestia/proof

Event Hashes → MerkleTree.build() → Root Hash
                    |
              getProof(leafIndex) → MerkleProof
                    |
              verifyProof(leaf, proof, root) → boolean
                    |
          AttestationProofPackage (self-contained, portable)
```

### Compliance Evidence

```
State Bundle → Evidence Generator → ComplianceReport
                    |
              SOC 2 Mapping → CC1-CC9 evaluations
              ISO 27001 Mapping → Annex A evaluations
                    |
              Score = (passed / total) × 100
```

---

## SLA & Governance Model

### SLA Evaluation

SLA evaluation is advisory-only (fail-closed semantics):

- Missing metrics → FAIL (never assumed to pass)
- NaN/Infinity → FAIL
- Five threshold operators: `lte`, `gte`, `lt`, `gt`, `eq`
- Pure functions — no I/O, no side effects

### Tenant Governance

Each tenant has an independent governance policy:

- Active tenants can perform all actions
- Suspended tenants are blocked from all actions (fail-closed)
- Double-suspend and double-reactivate are rejected
- `assignSlaPolicy` returns a new immutable tenant (no mutation)

### Multi-Sig Witness Governance

Event-sourced governance store tracks:

- Signers (address, label, weight)
- Quorum threshold
- SLA policies
- Policy version (monotonically increasing)

---

## Key Design Principles

1. **Append-only** — No UPDATE, no DELETE. State grows monotonically.
2. **Deterministic replay** — Same events produce the same `GlobalStateHash`.
3. **Fail-closed** — Disagreement halts the system. No silent healing.
4. **Zero deps on critical path** — External libraries only at edges (chain SDKs, HTTP framework).
5. **Humans approve; machines verify** — No AI or automation approves, signs, or executes.
6. **Chains are witnesses, not authorities** — XRPL attests. Authority flows from structural rules.
7. **Externally verifiable** — Third parties can independently verify state without trusting the operator.
8. **Self-contained proofs** — Merkle inclusion proofs are portable and verifiable offline.
