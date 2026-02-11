# Attestia — Reference Architecture

Where Attestia fits in the on-chain financial stack, and how to deploy it.

---

## The Stack

On-chain financial operations involve five layers. Most organizations have layers 1, 2, and 5. Layers 3 and 4 are typically missing — Attestia fills them.

```
┌─────────────────────────────────────────────────┐
│  Layer 5: Auditor / Compliance                  │
│  - Independent state replay                     │
│  - Hash comparison                              │
│  - Regulatory reporting                         │
├─────────────────────────────────────────────────┤
│  Layer 4: Witness (XRPL)                        │
│  - Immutable on-chain attestation               │
│  - Time-stamped proof of reconciliation         │
│  - Public verifiability                         │
├─────────────────────────────────────────────────┤
│  Layer 3: Control (Attestia)          ◀── HERE  │
│  - Intent lifecycle management                  │
│  - Double-entry accounting                      │
│  - 3D reconciliation (intent ↔ ledger ↔ chain)  │
│  - Deterministic replay + GlobalStateHash       │
│  - Structural governance (11 invariants)        │
├─────────────────────────────────────────────────┤
│  Layer 2: Execution (Smart Contracts)           │
│  - Token transfers                              │
│  - DeFi protocols                               │
│  - Multisig governance                          │
├─────────────────────────────────────────────────┤
│  Layer 1: Settlement (Blockchains)              │
│  - Ethereum, Arbitrum, Base, Optimism           │
│  - XRP Ledger                                   │
│  - Transaction finality                         │
└─────────────────────────────────────────────────┘
```

### What Each Layer Does

| Layer | Responsibility | Without It |
|-------|---------------|------------|
| Settlement | Transaction finality | No record of transfers |
| Execution | Business logic enforcement | No automated rules |
| **Control** | **Intent, accounting, reconciliation, attestation** | **No way to prove what was planned, what happened, and whether they match** |
| Witness | Immutable time-stamped proof | Attestations can be silently modified |
| Auditor | Independent verification | Trust the operator blindly |

---

## Data Flow

### End-to-End: Intent to Proof

```
Organization                    Attestia                      XRPL
     │                            │                            │
     │  1. Declare intent         │                            │
     │ ──────────────────────────>│                            │
     │                            │  Store event (hash chain)  │
     │                            │                            │
     │  2. Approve intent         │                            │
     │ ──────────────────────────>│                            │
     │                            │  Record approval           │
     │                            │                            │
     │  3. Execute on-chain       │                            │
     │ ──────────────────────────>│                            │
     │                            │  Record chain ref          │
     │                            │                            │
     │  4. Verify execution       │                            │
     │ ──────────────────────────>│                            │
     │                            │  Reconcile: intent ↔       │
     │                            │  ledger ↔ chain            │
     │                            │                            │
     │                            │  5. Attest result          │
     │                            │ ──────────────────────────>│
     │                            │                            │  Write memo
     │                            │  6. Store witness record   │
     │                            │ <──────────────────────────│
     │                            │                            │
     │  7. Export for audit       │                            │
     │ <──────────────────────────│                            │
```

### Trust Boundaries

```
┌────────────────────────────────────────────────────────┐
│                    Trusted Boundary                      │
│                                                         │
│  ┌──────────┐   ┌────────────────────────────────┐     │
│  │  Client   │   │         Attestia Node           │     │
│  │ (API key) │──>│                                 │     │
│  └──────────┘   │  ┌────────┐  ┌──────────────┐  │     │
│                  │  │  Auth  │  │ Tenant       │  │     │
│                  │  │  Gate  │──│ Registry     │  │     │
│                  │  └────────┘  └──────────────┘  │     │
│                  │       │                         │     │
│                  │  ┌────▼──────────────────────┐  │     │
│                  │  │  Per-Tenant Service        │  │     │
│                  │  │  (Vault, Ledger, etc.)    │  │     │
│                  │  └───────────────────────────┘  │     │
│                  │       │                         │     │
│                  │  ┌────▼──────────────────────┐  │     │
│                  │  │  Event Store (JSONL)      │  │     │
│                  │  │  Hash-chained, append-only │  │     │
│                  │  └───────────────────────────┘  │     │
│                  └──────────────┬───────────────────┘     │
│                                │                         │
└────────────────────────────────┼─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  XRPL (External Chain)  │
                    │  Witness transactions    │
                    └─────────────────────────┘
```

---

## Deployment Patterns

### Pattern 1: Single-Node (Default)

One Attestia node serving one or more tenants. Suitable for small-to-medium organizations.

```yaml
services:
  attestia:
    image: attestia-node
    ports: ["3000:3000"]
    volumes: [attestia-data:/app/data]
    environment:
      ATTESTIA_EVENTS_FILE: /app/data/events.jsonl
      ATTESTIA_AUTH_MODE: api-key
```

- Events: JSONL file on local volume
- Auth: API key or JWT
- Witness: Optional XRPL connection
- Monitoring: Prometheus `/metrics`

### Pattern 2: Multi-Tenant SaaS

One Attestia node with tenant isolation via auth-derived tenant IDs. Each tenant gets isolated service instances.

```
Client A ──(API key A)──┐
                        ├──> Attestia Node ──> Shared Event Store
Client B ──(API key B)──┘
```

Tenant isolation is enforced at the middleware level. Tenant ID is derived from the authenticated identity, not from request parameters.

### Pattern 3: Auditor Sidecar

An auditor runs their own Attestia node, imports the event stream, and independently computes the GlobalStateHash.

```
Production Node ──(export events)──> Auditor Node ──(replay)──> Compare Hash
```

The auditor uses:
- `GET /api/v1/export/events` to download the event stream
- `GET /api/v1/export/state` to get the current state + GlobalStateHash
- Local replay to independently compute the hash

---

## Integration Points

| Integration | Protocol | Direction | Purpose |
|-------------|----------|-----------|---------|
| Client applications | REST API (HTTP) | Inbound | Intent lifecycle, queries |
| Prometheus | HTTP `/metrics` | Outbound (pull) | Monitoring and alerting |
| XRPL | WebSocket | Outbound | Witness attestation |
| EVM chains | JSON-RPC | Outbound | Chain observation |
| Auditor tools | REST API (HTTP) | Inbound | Event/state export |

---

## Health & Observability

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Basic liveness check |
| `GET /ready` | Deep readiness with per-subsystem status |
| `GET /metrics` | Prometheus text format metrics |

### Key Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `attestia_intents_total` | Counter | Intent lifecycle actions |
| `attestia_reconciliation_total` | Counter | Reconciliation results |
| `attestia_attestation_total` | Counter | Attestation operations |
| `attestia_witness_total` | Counter | Witness submission outcomes |
| `http_requests_total` | Counter | HTTP request count by method/path/status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |

### Alerting

See `packages/node/alerts/attestia-alerts.yml` for Prometheus AlertManager rules covering: high error rate, reconciliation mismatches, witness failures, and event store health.
