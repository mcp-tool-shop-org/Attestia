/**
 * AttestiaService — Composition root for all domain packages.
 *
 * Route handlers delegate to this service; they never import domain
 * packages directly. Each tenant gets its own AttestiaService instance
 * for data isolation.
 */

import { Vault } from "@attestia/vault";
import { Ledger } from "@attestia/ledger";
import { Treasury } from "@attestia/treasury";
import { Reconciler } from "@attestia/reconciler";
import type {
  ReconciliationInput,
  ReconciliationReport,
  AttestationRecord,
} from "@attestia/reconciler";
import { InMemoryEventStore } from "@attestia/event-store";
import type { StoredEvent, ReadOptions, ReadAllOptions } from "@attestia/event-store";
import { StructuralRegistrar } from "@attestia/registrum";
import { ObserverRegistry } from "@attestia/chain-observer";
import {
  verifyByReplay,
  verifyHash,
} from "@attestia/verify";
import type { ReplayInput, ReplayResult, VerificationResult } from "@attestia/verify";

// =============================================================================
// Configuration
// =============================================================================

export interface AttestiaServiceConfig {
  readonly ownerId: string;
  readonly defaultCurrency: string;
  readonly defaultDecimals: number;
}

// =============================================================================
// Service
// =============================================================================

export class AttestiaService {
  readonly vault: Vault;
  readonly ledger: Ledger;
  readonly treasury: Treasury;
  readonly reconciler: Reconciler;
  readonly eventStore: InMemoryEventStore;
  readonly registrar: StructuralRegistrar;

  private readonly _attestations: AttestationRecord[] = [];
  private _ready = false;

  constructor(config: AttestiaServiceConfig) {
    this.registrar = new StructuralRegistrar();
    this.ledger = new Ledger();
    this.eventStore = new InMemoryEventStore();

    const observerRegistry = new ObserverRegistry();
    this.vault = new Vault(
      {
        ownerId: config.ownerId,
        watchedAddresses: [],
        defaultCurrency: config.defaultCurrency,
        defaultDecimals: config.defaultDecimals,
      },
      observerRegistry,
    );

    this.treasury = new Treasury({
      orgId: config.ownerId,
      name: `${config.ownerId}-treasury`,
      defaultCurrency: config.defaultCurrency,
      defaultDecimals: config.defaultDecimals,
      gatekeepers: ["gatekeeper-1", "gatekeeper-2"],
    });

    this.reconciler = new Reconciler({
      registrar: this.registrar,
      attestorId: "attestia-node",
    });

    this._ready = true;
  }

  // ─── Intent Lifecycle ──────────────────────────────────────────────

  declareIntent(
    id: string,
    kind: string,
    description: string,
    params: Record<string, unknown>,
    envelopeId?: string,
  ) {
    return this.vault.declareIntent(
      id,
      kind as Parameters<Vault["declareIntent"]>[1],
      description,
      params as Parameters<Vault["declareIntent"]>[3],
      envelopeId,
    );
  }

  approveIntent(id: string, reason?: string) {
    return this.vault.approveIntent(id, reason);
  }

  rejectIntent(id: string, reason: string) {
    return this.vault.rejectIntent(id, reason);
  }

  executeIntent(id: string, chainId: string, txHash: string) {
    this.vault.markIntentExecuting(id);
    return this.vault.recordIntentExecution(id, chainId, txHash);
  }

  verifyIntent(
    id: string,
    matched: boolean,
    discrepancies?: readonly string[],
  ) {
    return this.vault.verifyIntent(id, matched, discrepancies);
  }

  getIntent(id: string) {
    return this.vault.intents.getIntent(id);
  }

  listIntents(status?: string) {
    return this.vault.intents.listIntents(
      status as Parameters<Vault["intents"]["listIntents"]>[0],
    );
  }

  // ─── Events ────────────────────────────────────────────────────────

  readAllEvents(options?: ReadAllOptions): readonly StoredEvent[] {
    return this.eventStore.readAll(options);
  }

  readStreamEvents(
    streamId: string,
    options?: ReadOptions,
  ): readonly StoredEvent[] {
    return this.eventStore.read(streamId, options);
  }

  // ─── Verification ──────────────────────────────────────────────────

  replayVerify(input: ReplayInput): ReplayResult {
    return verifyByReplay(input);
  }

  hashVerify(
    ledgerSnapshot: unknown,
    registrumSnapshot: unknown,
    expectedHash: string,
  ): VerificationResult {
    return verifyHash(
      {
        ledgerSnapshot: ledgerSnapshot as Parameters<typeof verifyHash>[0]["ledgerSnapshot"],
        registrumSnapshot: registrumSnapshot as Parameters<typeof verifyHash>[0]["registrumSnapshot"],
      },
      expectedHash,
    );
  }

  // ─── Reconciliation & Attestation ─────────────────────────────────

  reconcile(input: ReconciliationInput): ReconciliationReport {
    return this.reconciler.reconcile(input);
  }

  async attest(report: ReconciliationReport): Promise<AttestationRecord> {
    const attestation = await this.reconciler.attest(report);
    this._attestations.push(attestation);
    return attestation;
  }

  listAttestations(): readonly AttestationRecord[] {
    return this._attestations;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────

  isReady(): boolean {
    return this._ready;
  }

  async stop(): Promise<void> {
    this._ready = false;
  }
}
