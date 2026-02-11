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
// Observer Events — Solana
// =============================================================================

export interface SolanaEventDetectedPayload {
  readonly chainId: string;
  readonly txHash: string;
  readonly slot: number;
  readonly programId: string;
  readonly eventType: string;
}

export interface SolanaBalanceObservedPayload {
  readonly chainId: string;
  readonly address: string;
  readonly balance: string;
  readonly currency: string;
  readonly slot: number;
  readonly commitment: string;
}

// =============================================================================
// Observer Events — L2
// =============================================================================

export interface L2ReorgDetectedPayload {
  readonly chainId: string;
  readonly blockNumber: number;
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly detectedAt: string;
}

export interface L2FinalityConfirmedPayload {
  readonly chainId: string;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly settlementChainId: string;
  readonly confirmedAt: string;
}

// =============================================================================
// Governance Events
// =============================================================================

export interface GovernanceSignerAddedPayload {
  readonly signerAddress: string;
  readonly addedBy: string;
  readonly newSignerCount: number;
}

export interface GovernanceSignerRemovedPayload {
  readonly signerAddress: string;
  readonly removedBy: string;
  readonly newSignerCount: number;
}

export interface GovernanceQuorumChangedPayload {
  readonly previousQuorum: number;
  readonly newQuorum: number;
  readonly changedBy: string;
  readonly totalSigners: number;
}

// =============================================================================
// Witness Events — Multi-Sig
// =============================================================================

export interface WitnessMultisigSubmittedPayload {
  readonly txHash: string;
  readonly signerCount: number;
  readonly quorumRequired: number;
  readonly payloadHash: string;
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
// Verification Events (Phase 12)
// =============================================================================

export interface VerificationExternalRequestedPayload {
  readonly bundleHash: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
}

export interface VerificationExternalCompletedPayload {
  readonly reportId: string;
  readonly verifierId: string;
  readonly bundleHash: string;
  readonly verdict: "PASS" | "FAIL";
  readonly discrepancyCount: number;
  readonly completedAt: string;
}

export interface VerificationConsensusReachedPayload {
  readonly bundleHash: string;
  readonly verdict: "PASS" | "FAIL";
  readonly totalVerifiers: number;
  readonly agreementRatio: number;
  readonly consensusAt: string;
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

  // Observer — Solana
  SOLANA_EVENT_DETECTED: "observer.solana.event_detected",
  SOLANA_BALANCE_OBSERVED: "observer.solana.balance_observed",

  // Observer — L2
  L2_REORG_DETECTED: "observer.l2.reorg_detected",
  L2_FINALITY_CONFIRMED: "observer.l2.finality_confirmed",

  // Governance
  GOVERNANCE_SIGNER_ADDED: "governance.signer.added",
  GOVERNANCE_SIGNER_REMOVED: "governance.signer.removed",
  GOVERNANCE_QUORUM_CHANGED: "governance.quorum.changed",

  // Witness — Multi-Sig
  WITNESS_MULTISIG_SUBMITTED: "witness.multisig.submitted",

  // Reconciler
  RECONCILIATION_COMPLETED: "reconciler.reconciliation.completed",
  ATTESTATION_RECORDED: "reconciler.attestation.recorded",

  // Witness
  WITNESS_RECORD_SUBMITTED: "witness.record.submitted",

  // Verification (Phase 12)
  VERIFICATION_EXTERNAL_REQUESTED: "verification.external.requested",
  VERIFICATION_EXTERNAL_COMPLETED: "verification.external.completed",
  VERIFICATION_CONSENSUS_REACHED: "verification.consensus.reached",
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
  {
    type: ATTESTIA_EVENTS.SOLANA_EVENT_DETECTED,
    version: 1,
    description: "A Solana on-chain event was detected by the observer",
    source: "observer",
    validate: (p): p is SolanaEventDetectedPayload =>
      isObject(p) &&
      hasString(p, "chainId") &&
      hasString(p, "txHash") &&
      hasNumber(p, "slot") &&
      hasString(p, "programId"),
  },
  {
    type: ATTESTIA_EVENTS.SOLANA_BALANCE_OBSERVED,
    version: 1,
    description: "A Solana on-chain balance was observed with commitment level",
    source: "observer",
    validate: (p): p is SolanaBalanceObservedPayload =>
      isObject(p) &&
      hasString(p, "chainId") &&
      hasString(p, "address") &&
      hasNumber(p, "slot") &&
      hasString(p, "commitment"),
  },
  {
    type: ATTESTIA_EVENTS.L2_REORG_DETECTED,
    version: 1,
    description: "A chain reorganization was detected on an L2",
    source: "observer",
    validate: (p): p is L2ReorgDetectedPayload =>
      isObject(p) &&
      hasString(p, "chainId") &&
      hasNumber(p, "blockNumber") &&
      hasString(p, "expectedHash") &&
      hasString(p, "actualHash"),
  },
  {
    type: ATTESTIA_EVENTS.L2_FINALITY_CONFIRMED,
    version: 1,
    description: "An L2 block was confirmed final on the settlement chain",
    source: "observer",
    validate: (p): p is L2FinalityConfirmedPayload =>
      isObject(p) &&
      hasString(p, "chainId") &&
      hasNumber(p, "blockNumber") &&
      hasString(p, "blockHash") &&
      hasString(p, "settlementChainId"),
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

const GOVERNANCE_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.GOVERNANCE_SIGNER_ADDED,
    version: 1,
    description: "A signer was added to the multi-sig governance policy",
    source: "registrum",
    validate: (p): p is GovernanceSignerAddedPayload =>
      isObject(p) &&
      hasString(p, "signerAddress") &&
      hasString(p, "addedBy") &&
      hasNumber(p, "newSignerCount"),
  },
  {
    type: ATTESTIA_EVENTS.GOVERNANCE_SIGNER_REMOVED,
    version: 1,
    description: "A signer was removed from the multi-sig governance policy",
    source: "registrum",
    validate: (p): p is GovernanceSignerRemovedPayload =>
      isObject(p) &&
      hasString(p, "signerAddress") &&
      hasString(p, "removedBy") &&
      hasNumber(p, "newSignerCount"),
  },
  {
    type: ATTESTIA_EVENTS.GOVERNANCE_QUORUM_CHANGED,
    version: 1,
    description: "The multi-sig quorum threshold was changed",
    source: "registrum",
    validate: (p): p is GovernanceQuorumChangedPayload =>
      isObject(p) &&
      hasNumber(p, "previousQuorum") &&
      hasNumber(p, "newQuorum") &&
      hasString(p, "changedBy"),
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
  {
    type: ATTESTIA_EVENTS.WITNESS_MULTISIG_SUBMITTED,
    version: 1,
    description: "A multi-sig witness record was submitted to the XRPL",
    source: "registrum",
    validate: (p): p is WitnessMultisigSubmittedPayload =>
      isObject(p) &&
      hasString(p, "txHash") &&
      hasNumber(p, "signerCount") &&
      hasNumber(p, "quorumRequired") &&
      hasString(p, "payloadHash"),
  },
];

const VERIFICATION_SCHEMAS: readonly EventSchema[] = [
  {
    type: ATTESTIA_EVENTS.VERIFICATION_EXTERNAL_REQUESTED,
    version: 1,
    description: "An external verification of a state bundle was requested",
    source: "registrum",
    validate: (p): p is VerificationExternalRequestedPayload =>
      isObject(p) &&
      hasString(p, "bundleHash") &&
      hasString(p, "requestedBy") &&
      hasString(p, "requestedAt"),
  },
  {
    type: ATTESTIA_EVENTS.VERIFICATION_EXTERNAL_COMPLETED,
    version: 1,
    description: "An external verifier completed verification of a state bundle",
    source: "registrum",
    validate: (p): p is VerificationExternalCompletedPayload =>
      isObject(p) &&
      hasString(p, "reportId") &&
      hasString(p, "verifierId") &&
      hasString(p, "bundleHash") &&
      hasString(p, "verdict") &&
      hasNumber(p, "discrepancyCount") &&
      hasString(p, "completedAt"),
  },
  {
    type: ATTESTIA_EVENTS.VERIFICATION_CONSENSUS_REACHED,
    version: 1,
    description: "Multiple verifiers reached consensus on a state bundle",
    source: "registrum",
    validate: (p): p is VerificationConsensusReachedPayload =>
      isObject(p) &&
      hasString(p, "bundleHash") &&
      hasString(p, "verdict") &&
      hasNumber(p, "totalVerifiers") &&
      hasNumber(p, "agreementRatio") &&
      hasString(p, "consensusAt"),
  },
];

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a pre-populated EventCatalog with all Attestia domain events.
 *
 * This is the standard catalog for production use.
 * All 31 event types are registered at version 1.
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
    ...GOVERNANCE_SCHEMAS,
    ...WITNESS_SCHEMAS,
    ...VERIFICATION_SCHEMAS,
  ];

  for (const schema of allSchemas) {
    catalog.register(schema);
  }

  return catalog;
}
