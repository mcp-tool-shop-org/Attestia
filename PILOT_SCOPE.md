# Attestia Pilot Scope — Monthly Payroll Reconciliation

## Use Case

Reconcile monthly payroll disbursements across three subsystems:

1. **Vault** — Intent lifecycle (declare, approve, execute, verify)
2. **Ledger** — Double-entry accounting records
3. **Chain Observer** — On-chain transaction confirmations

The pilot proves that Attestia can detect, reconcile, and cryptographically attest that off-chain financial records match on-chain state.

## Actors

| Actor | Role |
|-------|------|
| CFO | Declares payroll intents, approves disbursements |
| Treasury Bot | Executes on-chain transactions |
| Reconciler | Matches intent ↔ ledger ↔ chain triples |
| Attestor | Signs reconciliation reports via registrum |
| Auditor | Exports events + state, independently replays to verify |

## Data Flow

```
CFO                    Treasury Bot           Chain
 │                          │                   │
 ├─ POST /intents ──────────┤                   │
 │   (declare)              │                   │
 │                          │                   │
 ├─ POST /intents/:id/approve                   │
 │                          │                   │
 │                          ├─ Execute on-chain ─┤
 │                          │                   │
 ├─ POST /intents/:id/execute (record txHash)   │
 │                          │                   │
 ├─ POST /intents/:id/verify                    │
 │                          │                   │
 ├─ POST /reconcile ────────┤                   │
 │   (intent + ledger + chain events)           │
 │                          │                   │
 ├─ POST /attest ───────────┤                   │
 │   (reconcile + sign)     │                   │
 │                          │                   │
 Auditor                    │                   │
 ├─ GET /export/events      │                   │
 ├─ GET /export/state       │                   │
 └─ Replay → compare GlobalStateHash           │
```

## Success Criteria

1. Full lifecycle completes without errors (declare → attest)
2. Reconciliation report includes all three match types
3. Attestation produces a valid `reportHash` (SHA-256 hex)
4. Export events returns valid NDJSON with hash chain
5. Export state returns deterministic `GlobalStateHash`
6. Second state export produces identical hash (determinism)
7. Auditor can independently verify the hash chain

## Failure Modes

| Failure | Detection | Response |
|---------|-----------|----------|
| Intent not found | 404 from approve/execute/verify | Retry with correct ID |
| Concurrency conflict | 409 from intent mutation | Re-read and retry |
| Reconciliation mismatch | `summary.allReconciled === false` | Investigate discrepancies |
| Hash chain tampered | `verifyIntegrity()` returns errors | Alert, stop processing |
| Witness unreachable | `WitnessSubmitError` after retries | Degrade gracefully, log |
| Event store corrupt | `/ready` returns 503 | Restart, investigate |

## Test Coverage

- `tests/pilot/payroll-lifecycle.test.ts` — Full E2E via HTTP
- `tests/export.test.ts` — NDJSON format, GlobalStateHash structure
