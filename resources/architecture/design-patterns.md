# Architecture Patterns for Web3 Financial Stack

Design patterns drawn from our research, relevant to the combined system.

---

## 1. Intent → Approve → Execute → Verify

The universal interaction pattern across our entire stack.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   INTENT    │───▶│   APPROVE   │───▶│   EXECUTE   │───▶│   VERIFY    │
│             │    │             │    │             │    │             │
│ User/system │    │ Human signs │    │ On-chain tx │    │ Reconcile   │
│ declares    │    │ or rejects  │    │ submitted   │    │ + attest    │
│ desired     │    │             │    │             │    │             │
│ outcome     │    │ Registrum   │    │ Wallet/     │    │ Registrum   │
│             │    │ validates   │    │ multi-sig   │    │ snapshots   │
│             │    │ transition  │    │ signs       │    │ XRPL attests│
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

**Where this appears:**
- NextLedger: `XrplIntent` (Draft → Approved → Matched)
- Payroll Engine: `FundingGateEvaluation` → `PaymentInstruction` → Settlement
- Registrum: `Transition` → `RegistrationResult` (accepted/rejected)

**Why it matters for web3:**
- Account abstraction (EIP-7702) makes the "approve" step a smart wallet operation
- Intent architectures (industry trend) match this exact flow
- Human approval is non-negotiable — this is our core differentiator from automated DeFi

---

## 2. Observation → Interpretation → Action

Layered capability model from the Future Ledger Vision.

```
Layer 1: OBSERVE     │ See balances, transactions, positions across chains
Layer 2: INTERPRET   │ Classify, normalize, explain (envelope budgeting, spending analysis)
Layer 3: DECLARE     │ Capture intent (what should happen)
Layer 4: CONSTRAIN   │ Enforce rules (budget limits, multi-sig quorum)
Layer 5: EXECUTE     │ Finalize with human approval (never alone)
```

**Design rules:**
- Each layer only depends on layers below it
- Layers 1-2 are read-only (no mutation, no signing)
- Layer 3 captures intent but does NOT execute
- Layer 4 can refuse but cannot act
- Layer 5 requires explicit human approval

**Multi-chain observation model:**
```
┌─────────────────────────────────────────┐
│          UNIFIED OBSERVATION            │
├──────────┬──────────┬──────────┬────────┤
│ Ethereum │  XRPL    │  Solana  │ L2s    │
│ ERC-20   │  Trust   │  SPL     │ ERC-20 │
│ ERC-721  │  Lines   │  Tokens  │        │
│ DeFi pos │  Offers  │          │        │
│ ENS      │  Escrows │          │        │
└──────────┴──────────┴──────────┴────────┘
```

---

## 3. Dual-Gate Approval Model

Simplified from payroll engine's commit/pay gates for web3:

**Fiat (original):**
```
Commit Gate (policy, soft-fail OK) → hours/days → Pay Gate (absolute, hard-fail)
```

**Web3 (simplified):**
```
Intent Gate (structural validation) → Human Approval → Execute Gate (balance/gas check)
```

The time gap shrinks (crypto settles in seconds, not days), but the *two-check* pattern remains:
1. **Intent Gate:** Is this structurally valid? Does it comply with rules? (Registrum validates)
2. **Execute Gate:** Do we still have the assets? Is gas affordable? (Checked at sign time)

---

## 4. Append-Only Event Architecture

Both NextLedger and payroll-engine use append-only patterns. For web3:

```
Event Store (append-only, replayable)
  │
  ├── IntentDeclared { who, what, when, why }
  ├── IntentApproved { who, signature, timestamp }
  ├── TransactionSubmitted { chain, txHash, payload }
  ├── TransactionConfirmed { chain, blockNumber, receipt }
  ├── ReconciliationMatched { internalId, onChainId }
  ├── AttestationGenerated { snapshotHash, registrumMode }
  └── AttestationPublished { chain: "xrpl", txHash, memoData }
```

**Properties:**
- No UPDATE, no DELETE — only new entries
- Every event has: timestamp, actor, causation_id, correlation_id
- Deterministic replay: same events → same state
- Cross-system: org events + personal events + registrum events

---

## 5. Structural Governance Pattern

Registrum's contribution — a constitutional layer for state transitions:

```
Any System ──── proposes transition ────▶ Registrum
                                           │
                                    11 Invariants
                                    (Identity × 3)
                                    (Lineage  × 4)
                                    (Ordering × 4)
                                           │
                                    ┌──────┴──────┐
                                    │             │
                                 Accepted     Rejected
                                 (ordered)    (violations)
```

**Key properties:**
- Registrum never interprets semantic meaning
- It only validates structural validity
- Dual-witness: two independent engines must agree
- XRPL attestation: external timestamp of decisions
- Fail-closed: disagreement halts, never heals silently

---

## 6. Cross-System Reconciliation

The bridge between Personal Vault and Org Treasury:

```
Org Treasury                    Personal Vault
     │                               │
     │  DistributionExecuted         │
     │  { contributor, amount,       │
     │    token, chain, txHash }     │
     │                               │
     │           CHAIN               │
     │    ┌─────────────────┐        │
     │    │  On-chain tx    │        │
     │    │  (observable    │        │
     │    │   by both)      │        │
     │    └─────────────────┘        │
     │                               │
     │         IncomingDetected      │
     │         { from, amount,       │
     │           token, txHash }     │
     │                               │
     ▼           REGISTRUM           ▼
  Register ◀──────────────────▶  Register
  transition                    transition
     │                               │
     └────── XRPL Attestation ───────┘
             (neutral timestamp)
```

**Three-party proof:**
1. Org says: "We sent $X"
2. Individual says: "We received $X"
3. XRPL attests: "Both registered transitions at time T"

---

## 7. Smart Wallet Integration Pattern

Leveraging EIP-7702 / EIP-4337 for our approval flows:

```
Intent Declared
     │
     ▼
Registrum Validates (structural)
     │
     ▼
Smart Wallet presents approval
  ├── Readable summary (EIP-712 typed data)
  ├── Risk warnings from advisory AI
  ├── Budget impact (envelope allocation effect)
  └── Multi-sig quorum status (if org wallet)
     │
     ▼
User signs (or multi-sig threshold met)
     │
     ▼
Transaction submitted to chain
     │
     ▼
Confirmation observed → Reconciliation → Attestation
```

**EIP-7702 benefits:**
- EOAs get smart wallet features without migrating
- Batching: approve + execute in one transaction
- Sponsorship: org pays gas for contributor's approval
- Privilege de-escalation: sub-keys for specific operations

---

## 8. Advisory AI Boundary

From payroll-engine's proven pattern:

```
┌──────────────────────────────────────┐
│           ADVISORY ZONE              │
│                                      │
│  "This distribution would exceed     │
│   your monthly budget by 12%"        │
│                                      │
│  "Consider splitting across two      │
│   pay periods to maintain reserves"  │
│                                      │
│  "Three recipients have new          │
│   addresses — verify before sending" │
│                                      │
│  ✅ Can: analyze, warn, explain,     │
│         suggest, simulate            │
│  ❌ Cannot: approve, sign, execute,  │
│            move assets, override     │
└──────────────────────────────────────┘
```

**Non-negotiable:** AI advisory is disabled by default, always inspectable, never authoritative.
