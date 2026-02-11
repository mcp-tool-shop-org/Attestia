/**
 * Reconciler — Top-level coordinator
 *
 * Orchestrates all three matchers (intent↔ledger, ledger↔chain, intent↔chain)
 * and optionally attests results through Registrum.
 *
 * Usage:
 *   const reconciler = new Reconciler({ registrar, attestorId });
 *   const report = reconciler.reconcile({ intents, ledgerEntries, chainEvents });
 *   const attestation = await reconciler.attest(report);
 */

import type { Registrar } from "@attestia/registrum";
import { IntentLedgerMatcher } from "./intent-ledger-matcher.js";
import { LedgerChainMatcher } from "./ledger-chain-matcher.js";
import { IntentChainMatcher } from "./intent-chain-matcher.js";
import { Attestor } from "./attestor.js";
import type {
  ReconciliationReport,
  ReconciliationScope,
  ReconciliationSummary,
  ReconcilableIntent,
  ReconcilableLedgerEntry,
  ReconcilableChainEvent,
  AttestationRecord,
} from "./types.js";

// =============================================================================
// Configuration
// =============================================================================

export interface ReconcilerConfig {
  /** Registrar instance for attestation. Optional — reconciliation works without it. */
  readonly registrar?: Registrar;
  /** Identity of the attestor (e.g. "reconciler-service-1"). Required if registrar is provided. */
  readonly attestorId?: string;
}

// =============================================================================
// Input
// =============================================================================

export interface ReconciliationInput {
  readonly intents: readonly ReconcilableIntent[];
  readonly ledgerEntries: readonly ReconcilableLedgerEntry[];
  readonly chainEvents: readonly ReconcilableChainEvent[];
  readonly scope?: ReconciliationScope;
}

// =============================================================================
// Reconciler
// =============================================================================

let reportCounter = 0;

export class Reconciler {
  private readonly intentLedgerMatcher = new IntentLedgerMatcher();
  private readonly ledgerChainMatcher = new LedgerChainMatcher();
  private readonly intentChainMatcher = new IntentChainMatcher();
  private readonly attestor: Attestor | null;

  constructor(config: ReconcilerConfig = {}) {
    if (config.registrar) {
      if (!config.attestorId) {
        throw new Error("attestorId is required when registrar is provided");
      }
      this.attestor = new Attestor(config.registrar, config.attestorId);
    } else {
      this.attestor = null;
    }
  }

  /**
   * Run a full reconciliation across all three matching dimensions.
   */
  reconcile(input: ReconciliationInput): ReconciliationReport {
    const { intents, ledgerEntries, chainEvents, scope } = input;

    // Filter inputs by scope
    const scopedIntents = this.filterIntents(intents, scope);
    const scopedEntries = this.filterEntries(ledgerEntries, scope);
    const scopedEvents = this.filterEvents(chainEvents, scope);

    // Run all three matchers
    const intentLedgerMatches = this.intentLedgerMatcher.match(
      scopedIntents,
      scopedEntries,
    );
    const ledgerChainMatches = this.ledgerChainMatcher.match(
      scopedEntries,
      scopedEvents,
    );
    const intentChainMatches = this.intentChainMatcher.match(
      scopedIntents,
      scopedEvents,
    );

    // Compute summary
    const summary = this.computeSummary(
      scopedIntents,
      scopedEntries,
      scopedEvents,
      intentLedgerMatches,
      ledgerChainMatches,
      intentChainMatches,
    );

    reportCounter += 1;
    const id = `recon:${Date.now()}:${reportCounter}`;

    return {
      id,
      scope: scope ?? {},
      timestamp: new Date().toISOString(),
      intentLedgerMatches,
      ledgerChainMatches,
      intentChainMatches,
      summary,
    };
  }

  /**
   * Attest a reconciliation report through Registrum.
   * Throws if no registrar was provided at construction.
   */
  async attest(report: ReconciliationReport): Promise<AttestationRecord> {
    if (!this.attestor) {
      throw new Error("Cannot attest: no registrar configured");
    }
    return this.attestor.attest(report);
  }

  /**
   * Run reconciliation and immediately attest the result.
   */
  async reconcileAndAttest(
    input: ReconciliationInput,
  ): Promise<{ report: ReconciliationReport; attestation: AttestationRecord }> {
    const report = this.reconcile(input);
    const attestation = await this.attest(report);
    return { report, attestation };
  }

  // ===========================================================================
  // Scope Filtering
  // ===========================================================================

  private filterIntents(
    intents: readonly ReconcilableIntent[],
    scope?: ReconciliationScope,
  ): readonly ReconcilableIntent[] {
    if (!scope) return intents;
    return intents.filter((i) => {
      if (scope.intentId && i.id !== scope.intentId) return false;
      if (scope.chainId && i.chainId !== scope.chainId) return false;
      if (scope.correlationId && i.correlationId !== scope.correlationId) return false;
      if (scope.from && i.declaredAt < scope.from) return false;
      if (scope.to && i.declaredAt > scope.to) return false;
      return true;
    });
  }

  private filterEntries(
    entries: readonly ReconcilableLedgerEntry[],
    scope?: ReconciliationScope,
  ): readonly ReconcilableLedgerEntry[] {
    if (!scope) return entries;
    return entries.filter((e) => {
      if (scope.correlationId && e.correlationId !== scope.correlationId) return false;
      if (scope.from && e.timestamp < scope.from) return false;
      if (scope.to && e.timestamp > scope.to) return false;
      return true;
    });
  }

  private filterEvents(
    events: readonly ReconcilableChainEvent[],
    scope?: ReconciliationScope,
  ): readonly ReconcilableChainEvent[] {
    if (!scope) return events;
    return events.filter((e) => {
      if (scope.chainId && e.chainId !== scope.chainId) return false;
      if (scope.from && e.timestamp < scope.from) return false;
      if (scope.to && e.timestamp > scope.to) return false;
      return true;
    });
  }

  // ===========================================================================
  // Summary Computation
  // ===========================================================================

  private computeSummary(
    intents: readonly ReconcilableIntent[],
    ledgerEntries: readonly ReconcilableLedgerEntry[],
    chainEvents: readonly ReconcilableChainEvent[],
    intentLedger: readonly { status: string; discrepancies: readonly string[] }[],
    ledgerChain: readonly { status: string; discrepancies: readonly string[] }[],
    intentChain: readonly { status: string; discrepancies: readonly string[] }[],
  ): ReconciliationSummary {
    const allMatches = [...intentLedger, ...ledgerChain, ...intentChain];

    const matchedCount = allMatches.filter((m) => m.status === "matched").length;
    const mismatchCount = allMatches.filter((m) => m.status === "amount-mismatch").length;
    const missingCount = allMatches.filter(
      (m) =>
        m.status === "missing-ledger" ||
        m.status === "missing-intent" ||
        m.status === "missing-chain" ||
        m.status === "unmatched",
    ).length;

    const allDiscrepancies = allMatches.flatMap((m) => m.discrepancies);

    return {
      totalIntents: intents.length,
      totalLedgerEntries: ledgerEntries.length,
      totalChainEvents: chainEvents.length,
      matchedCount,
      mismatchCount,
      missingCount,
      allReconciled: mismatchCount === 0 && missingCount === 0,
      discrepancies: allDiscrepancies,
    };
  }
}
