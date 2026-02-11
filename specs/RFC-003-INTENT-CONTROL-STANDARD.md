# RFC-003: Intent Control Standard

**Status:** Draft
**Created:** 2026-02-11
**Author:** Attestia Working Group

---

## Abstract

This specification defines the Intent Control Standard — the universal interaction pattern for financial actions in Attestia. It covers the intent lifecycle state machine, transition rules, record formats for each lifecycle phase, double-entry accounting integration, and monetary representation. The pattern enforces that every financial action passes through declaration, human approval, execution, and post-execution verification.

---

## Status of This Document

Draft. This document is subject to revision before finalization.

---

## 1. Introduction

On-chain financial systems lack a standard control layer between "someone wants to do something" and "something happened on-chain." Smart contracts enforce execution rules but do not capture intent, require human approval, or verify outcomes against expectations.

The Intent Control Standard fills this gap. Every financial action follows a mandatory lifecycle: declare what you want to do, get human approval, execute, then verify the outcome matches the intent.

---

## 2. Terminology

All terms are defined in [DEFINITIONS.md](DEFINITIONS.md). Key terms:

- **Intent**, **Intent Status**, **Declaration**, **Approval**, **Execution**, **Verification**
- **Money**, **Account**, **Ledger Entry**, **Trial Balance**

---

## 3. Specification

### 3.1 Intent Structure

An Intent MUST contain the following fields:

```typescript
interface Intent {
  readonly id: string;
  readonly status: IntentStatus;
  readonly kind: string;
  readonly description: string;
  readonly declaredBy: string;
  readonly declaredAt: string;
  readonly params: Record<string, unknown>;
}
```

- `id`: Globally unique identifier. MUST be unique across all intents.
- `status`: Current lifecycle state (Section 3.2).
- `kind`: Intent type identifier (e.g., `"transfer"`, `"allocation"`, `"distribution"`). Application-specific.
- `description`: Human-readable description of the desired outcome.
- `declaredBy`: Identity of the entity that declared this intent.
- `declaredAt`: ISO 8601 timestamp of declaration.
- `params`: Intent-kind-specific parameters. Opaque to the framework.

### 3.2 Lifecycle States

```
                    ┌──────────┐
                    │ declared │
                    └────┬─────┘
                         │
                ┌────────┴────────┐
                │                 │
           ┌────▼────┐     ┌─────▼────┐
           │ approved │     │ rejected │
           └────┬─────┘     └──────────┘
                │
           ┌────▼─────┐
           │ executing │
           └────┬──────┘
                │
         ┌──────┴──────┐
         │             │
    ┌────▼────┐   ┌────▼───┐
    │ executed │   │ failed │
    └────┬─────┘  └────────┘
         │
    ┌────▼─────┐
    │ verified │
    └──────────┘
```

The complete set of intent states:

| State | Meaning |
|-------|---------|
| `declared` | Intent has been proposed but not yet approved |
| `approved` | A human has authorized the intent for execution |
| `rejected` | A human has denied the intent |
| `executing` | Execution is in progress |
| `executed` | Execution completed (on-chain transaction submitted) |
| `failed` | Execution failed |
| `verified` | Post-execution verification confirmed the outcome |

### 3.3 Transition Rules

The following state transitions are permitted:

| From | To | Trigger |
|------|----|---------|
| `declared` | `approved` | Human approval |
| `declared` | `rejected` | Human rejection |
| `approved` | `executing` | Execution begins |
| `executing` | `executed` | On-chain transaction confirmed |
| `executing` | `failed` | Execution error |
| `executed` | `verified` | Post-execution verification passes |

All other transitions MUST be rejected. An implementation MUST NOT allow:

- Skipping states (e.g., `declared` → `executed`)
- Backward transitions (e.g., `approved` → `declared`)
- Transitions from terminal states (`rejected`, `failed`, `verified`)

### 3.4 Lifecycle Records

Each transition produces a typed record:

#### Declaration

```typescript
interface IntentDeclaration {
  readonly intentId: string;
  readonly declaredBy: string;
  readonly declaredAt: string;
  readonly kind: string;
  readonly params: Record<string, unknown>;
}
```

#### Approval

```typescript
interface IntentApproval {
  readonly intentId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly approved: boolean;
  readonly reason?: string;
}
```

When `approved` is `false`, the intent transitions to `rejected`.

#### Execution

```typescript
interface IntentExecution {
  readonly intentId: string;
  readonly executedAt: string;
  readonly chainId: string;
  readonly txHash: string;
}
```

#### Verification

```typescript
interface IntentVerification {
  readonly intentId: string;
  readonly verifiedAt: string;
  readonly matched: boolean;
  readonly discrepancies?: readonly string[];
}
```

### 3.5 Monetary Representation

All monetary amounts MUST use the following structure:

```typescript
interface Money {
  readonly amount: string;
  readonly currency: string;
  readonly decimals: number;
}
```

- `amount`: String representation to avoid floating-point errors. MUST be a valid decimal number.
- `currency`: Symbol or identifier (e.g., `"USDC"`, `"XRP"`, `"RLUSD"`).
- `decimals`: Number of decimal places for this currency (e.g., XRP = 6, ETH = 18).

Implementations MUST use string or arbitrary-precision arithmetic for all monetary calculations. IEEE 754 floating-point arithmetic MUST NOT be used.

### 3.6 Double-Entry Accounting

Every financial event that modifies account balances MUST produce balanced ledger entries.

#### Account Types

Five account types: `asset`, `liability`, `income`, `expense`, `equity`.

#### Ledger Entry

```typescript
interface LedgerEntry {
  readonly id: string;
  readonly accountId: string;
  readonly type: "debit" | "credit";
  readonly money: Money;
  readonly timestamp: string;
  readonly intentId?: string;
  readonly txHash?: string;
  readonly correlationId: string;
}
```

#### Balancing Invariant

For every transaction (group of entries with the same correlation identifier), the sum of debit amounts MUST equal the sum of credit amounts. An implementation MUST reject any transaction that violates this invariant.

#### Append-Only

Ledger entries MUST be append-only. No UPDATE or DELETE operations are permitted. Corrections are made by appending reversing entries.

---

## 4. Algorithms

### 4.1 State Transition Validation

```
function validateTransition(current: IntentStatus, target: IntentStatus): boolean {
  const allowed = {
    declared:  ["approved", "rejected"],
    approved:  ["executing"],
    executing: ["executed", "failed"],
    executed:  ["verified"],
    rejected:  [],
    failed:    [],
    verified:  [],
  };
  return allowed[current].includes(target);
}
```

An implementation MUST reject any transition not in this table.

---

## 5. Security Considerations

- **Human approval requirement**: The `declared` → `approved` transition MUST require human authorization. Automated approval systems MUST NOT bypass human review.
- **State machine enforcement**: Implementations MUST enforce the state machine in Section 3.3. Allowing arbitrary transitions defeats the control purpose.
- **Floating-point risk**: Using IEEE 754 floating-point for monetary amounts can cause silent rounding errors. String-based representation eliminates this class of bug.
- **Ledger immutability**: Allowing modifications to historical entries undermines auditability. Append-only is non-negotiable.

---

## 6. Conformance

A conforming implementation:

1. MUST implement the intent lifecycle state machine as specified in Section 3.3.
2. MUST enforce all transition rules — no skipping, no backward transitions, no transitions from terminal states.
3. MUST produce lifecycle records for each transition as specified in Section 3.4.
4. MUST use string-based monetary representation as specified in Section 3.5.
5. MUST enforce the double-entry balancing invariant as specified in Section 3.6.
6. MUST NOT permit modification or deletion of ledger entries.

---

## 7. References

- `packages/types/src/intent.ts` — Intent, IntentStatus, lifecycle records
- `packages/types/src/financial.ts` — Money, AccountRef, LedgerEntry
- `packages/ledger/src/ledger.ts` — Double-entry engine
- `packages/vault/src/vault.ts` — State machine enforcement
