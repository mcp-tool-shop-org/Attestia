/**
 * @attestia/event-store — Attestia Domain Event Definitions.
 *
 * The unified catalog of all domain events across Attestia subsystems.
 *
 * Naming convention: `<subsystem>.<entity>.<action>`
 * Examples:
 * - vault.intent.declared
 * - ledger.transaction.appended
 * - treasury.payroll.executed
 * - registrum.state.registered
 * - observer.event.detected
 *
 * Each event type defines:
 * - A payload interface (what data the event carries)
 * - A schema registration (type + version + validation)
 */

import type { EventSchema } from "./catalog.js";
import { EventCatalog } from "./catalog.js";

// =============================================================================
// Vault Events
// =============================================================================

export interface IntentDeclaredPayload {
  readonly intentId: string;
  readonly kind: string;
  readonly description: string;
  readonly declaredBy: string;
  readonly params: Record<string, unknown>;
}

export interface IntentApprovedPayload {
  readonly intentId: string;
  readonly approvedBy: string;
}

export interface IntentRejectedPayload {
  readonly intentId: string;
  readonly rejectedBy: string;
  readonly reason: string;
}

export interface IntentExecutedPayload {
  readonly intentId: string;
  readonly correlationId: string;
}

export interface IntentVerifiedPayload {
  readonly intentId: string;
  readonly verifiedAt: string;
}

export interface IntentFailedPayload {
  readonly intentId: string;
  readonly reason: string;
  readonly failedAt: string;
}

export interface BudgetAllocatedPayload {
  readonly budgetId: string;
  readonly envelopeId: string;
  readonly amount: string;
  readonly currency: string;
}

export interface PortfolioObservedPayload {
  readonly portfolioId: string;
  readonly chainRef: string;
  readonly observedAt: string;
}

// =============================================================================
// Ledger Events
// =============================================================================

export interface TransactionAppendedPayload {
  readonly correlationId: string;
  readonly entryCount: number;
  readonly currency: string;
  readonly totalAmount: string;
}

export interface AccountRegisteredPayload {
  readonly accountId: string;
  readonly accountType: string;
  readonly name: string;
}

// =============================================================================
// Treasury Events
// =============================================================================

export interface PayrollExecutedPayload {
  readonly runId: string;
  readonly recipientCount: number;
  readonly totalAmount: string;
  readonly currency: string;
}

export interface DistributionExecutedPayload {
  readonly planId: string;
  readonly recipientCount: number;
  readonly totalAmount: string;
  readonly currency: string;
}

export interface FundingGateApprovedPayload {
  readonly gateId: string;
  readonly approverId: string;
  readonly level: number;
}

// =============================================================================
// Registrum Events
// =============================================================================

export interface StateRegisteredPayload {
  readonly stateId: string;
  readonly parentId: string | null;
  readonly orderIndex: number;
}

export interface AttestationEmittedPayload {
  readonly registrumVersion: string;
  readonly snapshotHash: string;
  readonly stateCount: number;
}

// =============================================================================
// Observer Events
// =============================================================================

export interface ChainEventDetectedPayload {
  readonly chainId: string;
  readonly txHash: string;
  readonly blockNumber: number;
  readonly eventType: string;
}

export interface BalanceObservedPayload {
  readonly chainId: string;
  readonly address: string;
  readonly balance: string;
  readonly currency: string;
}

// =============================================================================
// Reconciler Events
// =============================================================================

export interface ReconciliationCompletedPayload {
  readonly reportId: string;
  readonly matchedCount: number;
  readonly mismatchCount: number;
  readonly missingCount: number;
}

export interface AttestationRecordedPayload {
  readonly reportId: string;
  readonly stateId: string;
  readonly snapshotHash: string;
}

// =============================================================================
// Witness Events
// =============================================================================

export interface WitnessRecordSubmittedPayload {
  readonly txHash: string;
  readonly witnessAddress: string;
  readonly payloadHash: string;
}

// =============================================================================
// Event Type Constants
// =============================================================================

/**
 * All known Attestia event types as constants.
 * Use these instead of string literals for type safety.
 */
export const ATTESTIA_EVENTS = {
  // Vault
  INTENT_DECLARED: "vault.intent.declared",
  INTENT_APPROVED: "vault.intent.approved",
  INTENT_REJECTED: "vault.intent.rejected",
  INTENT_EXECUTED: "vault.intent.executed",
  INTENT_VERIFIED: "vault.intent.verified",
  INTENT_FAILED: "vault.intent.failed",
  BUDGET_ALLOCATED: "vault.budget.allocated",
  PORTFOLIO_OBSERVED: "vault.portfolio.observed",

  // Ledger
  TRANSACTION_APPENDED: "ledger.transaction.appended",
  ACCOUNT_REGISTERED: "ledger.account.registered",

  // Treasury
  PAYROLL_EXECUTED: "treasury.payroll.executed",
  DISTRIBUTION_EXECUTED: "treasury.distribution.executed",
  FUNDING_GATE_APPROVED: "treasury.funding-gate.approved",

  // Registrum
  STATE_REGISTERED: "registrum.state.registered",
  ATTESTATION_EMITTED: "registrum.attestation.emitted",

  // Observer
  CHAIN_EVENT_DETECTED: "observer.event.detected",
  BALANCE_OBSERVED: "observer.balance.observed",

  // Reconciler
  RECONCILIATION_COMPLETED: "reconciler.reconciliation.completed",
  ATTESTATION_RECORDED: "reconciler.attestation.recorded",

  // Witness
  WITNESS_RECORD_SUBMITTED: "witness.record.submitted",
} as const;

export type AttestiaEventType =
  (typeof ATTESTIA_EVENTS)[keyof typeof ATTESTIA_EVENTS];

// =============================================================================
// Schema Definitions
// =============================================================================

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasString(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "string";
}

function hasNumber(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "number";
}

const VAULT_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.INTENT_DECLARED,
    version: 1,
    description: "A new intent was declared in the vault",
    source: "vault",
    validate: (p): p is IntentDeclaredPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "kind"),
  },
  {
    type: ATTESTIA_EVENTS.INTENT_APPROVED,
    version: 1,
    description: "An intent was approved by a human",
    source: "vault",
    validate: (p): p is IntentApprovedPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "approvedBy"),
  },
  {
    type: ATTESTIA_EVENTS.INTENT_REJECTED,
    version: 1,
    description: "An intent was rejected by a human",
    source: "vault",
    validate: (p): p is IntentRejectedPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "reason"),
  },
  {
    type: ATTESTIA_EVENTS.INTENT_EXECUTED,
    version: 1,
    description: "An intent was executed (ledger entries created)",
    source: "vault",
    validate: (p): p is IntentExecutedPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "correlationId"),
  },
  {
    type: ATTESTIA_EVENTS.INTENT_VERIFIED,
    version: 1,
    description: "An intent was verified against on-chain data",
    source: "vault",
    validate: (p): p is IntentVerifiedPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "verifiedAt"),
  },
  {
    type: ATTESTIA_EVENTS.INTENT_FAILED,
    version: 1,
    description: "An intent failed during execution or verification",
    source: "vault",
    validate: (p): p is IntentFailedPayload =>
      isObject(p) && hasString(p, "intentId") && hasString(p, "reason"),
  },
  {
    type: ATTESTIA_EVENTS.BUDGET_ALLOCATED,
    version: 1,
    description: "Budget was allocated to an envelope",
    source: "vault",
    validate: (p): p is BudgetAllocatedPayload =>
      isObject(p) && hasString(p, "budgetId") && hasString(p, "amount"),
  },
  {
    type: ATTESTIA_EVENTS.PORTFOLIO_OBSERVED,
    version: 1,
    description: "Portfolio balances were observed from chain",
    source: "vault",
    validate: (p): p is PortfolioObservedPayload =>
      isObject(p) && hasString(p, "portfolioId") && hasString(p, "chainRef"),
  },
];

const LEDGER_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.TRANSACTION_APPENDED,
    version: 1,
    description: "A balanced set of entries was appended to the ledger",
    source: "treasury",
    validate: (p): p is TransactionAppendedPayload =>
      isObject(p) && hasString(p, "correlationId") && hasNumber(p, "entryCount"),
  },
  {
    type: ATTESTIA_EVENTS.ACCOUNT_REGISTERED,
    version: 1,
    description: "A new account was registered in the chart of accounts",
    source: "treasury",
    validate: (p): p is AccountRegisteredPayload =>
      isObject(p) && hasString(p, "accountId") && hasString(p, "accountType"),
  },
];

const TREASURY_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.PAYROLL_EXECUTED,
    version: 1,
    description: "A payroll run was executed and ledger entries created",
    source: "treasury",
    validate: (p): p is PayrollExecutedPayload =>
      isObject(p) && hasString(p, "runId") && hasNumber(p, "recipientCount"),
  },
  {
    type: ATTESTIA_EVENTS.DISTRIBUTION_EXECUTED,
    version: 1,
    description: "A distribution plan was executed",
    source: "treasury",
    validate: (p): p is DistributionExecutedPayload =>
      isObject(p) && hasString(p, "planId") && hasNumber(p, "recipientCount"),
  },
  {
    type: ATTESTIA_EVENTS.FUNDING_GATE_APPROVED,
    version: 1,
    description: "A funding gate level was approved",
    source: "treasury",
    validate: (p): p is FundingGateApprovedPayload =>
      isObject(p) && hasString(p, "gateId") && hasString(p, "approverId"),
  },
];

const REGISTRUM_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.STATE_REGISTERED,
    version: 1,
    description: "A new state was registered in the structural registrar",
    source: "registrum",
    validate: (p): p is StateRegisteredPayload =>
      isObject(p) && hasString(p, "stateId") && hasNumber(p, "orderIndex"),
  },
  {
    type: ATTESTIA_EVENTS.ATTESTATION_EMITTED,
    version: 1,
    description: "An attestation was emitted from the registrar",
    source: "registrum",
    validate: (p): p is AttestationEmittedPayload =>
      isObject(p) && hasString(p, "registrumVersion") && hasString(p, "snapshotHash"),
  },
];

const OBSERVER_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.CHAIN_EVENT_DETECTED,
    version: 1,
    description: "An on-chain event was detected by the observer",
    source: "observer",
    validate: (p): p is ChainEventDetectedPayload =>
      isObject(p) && hasString(p, "chainId") && hasString(p, "txHash"),
  },
  {
    type: ATTESTIA_EVENTS.BALANCE_OBSERVED,
    version: 1,
    description: "An on-chain balance was observed",
    source: "observer",
    validate: (p): p is BalanceObservedPayload =>
      isObject(p) && hasString(p, "chainId") && hasString(p, "address"),
  },
];

const RECONCILER_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.RECONCILIATION_COMPLETED,
    version: 1,
    description: "A reconciliation pass was completed",
    source: "treasury",
    validate: (p): p is ReconciliationCompletedPayload =>
      isObject(p) && hasString(p, "reportId") && hasNumber(p, "matchedCount"),
  },
  {
    type: ATTESTIA_EVENTS.ATTESTATION_RECORDED,
    version: 1,
    description: "A reconciliation attestation was recorded in the registrar",
    source: "registrum",
    validate: (p): p is AttestationRecordedPayload =>
      isObject(p) && hasString(p, "reportId") && hasString(p, "stateId"),
  },
];

const WITNESS_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.WITNESS_RECORD_SUBMITTED,
    version: 1,
    description: "A witness record was submitted to the XRPL",
    source: "registrum",
    validate: (p): p is WitnessRecordSubmittedPayload =>
      isObject(p) && hasString(p, "txHash") && hasString(p, "payloadHash"),
  },
];

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a pre-populated EventCatalog with all Attestia domain events.
 *
 * This is the standard catalog for production use.
 * All 21 event types are registered at version 1.
 */
export function createAtlestiaCatalog(): EventCatalog {
  const catalog = new EventCatalog();

  const allSchemas = [
    ...VAULT_SCHEMAS,
    ...LEDGER_SCHEMAS,
    ...TREASURY_SCHEMAS,
    ...REGISTRUM_SCHEMAS,
    ...OBSERVER_SCHEMAS,
    ...RECONCILER_SCHEMAS,
    ...WITNESS_SCHEMAS,
  ];

  for (const schema of allSchemas) {
    catalog.register(schema);
  }

  return catalog;
}
