/**
 * Multi-Sig Witness — Top-level coordinator for multi-signature witnessing
 *
 * Wraps MultiSigSubmitter + GovernanceStore for full N-of-M governance.
 * Falls back to single-signer XrplSubmitter when no governance config
 * is present, maintaining backward compatibility.
 *
 * Design:
 * - Backward compatible: no governance config → single-signer mode
 * - Governance mode: multi-sig with quorum enforcement
 * - Same pipeline: build payload → encode memo → submit → return record
 * - Same memo format: transparent to verifiers
 */

import type { AttestationRecord, ReconciliationReport } from "@attestia/reconciler";
import { buildReconciliationPayload, buildRegistrumPayload, verifyPayloadHash } from "../payload.js";
import { XrplSubmitter } from "../submitter.js";
import { XrplVerifier } from "../verifier.js";
import type {
  AttestationPayload,
  VerificationResult,
  WitnessConfig,
  WitnessRecord,
} from "../types.js";
import { MultiSigSubmitter, type MultiSigConfig } from "./multisig-submitter.js";
import { GovernanceStore } from "./governance-store.js";
import type { GovernancePolicy } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for the multi-sig witness.
 *
 * When `governance` is provided, multi-sig mode is used.
 * When absent, falls back to single-signer mode using `singleSignerConfig`.
 */
export interface MultiSigWitnessConfig {
  /** Multi-sig configuration (if present, multi-sig mode) */
  readonly governance?: {
    readonly multiSigConfig: MultiSigConfig;
    readonly store: GovernanceStore;
  };

  /** Single-signer fallback config (used when governance is not set) */
  readonly singleSignerConfig?: WitnessConfig;

  /** Verifier config (uses multi-sig or single-signer rpcUrl/chainId) */
  readonly verifierConfig?: WitnessConfig;
}

// =============================================================================
// MultiSigWitness
// =============================================================================

export class MultiSigWitness {
  private readonly multiSigSubmitter: MultiSigSubmitter | null;
  private readonly singleSubmitter: XrplSubmitter | null;
  private readonly verifier: XrplVerifier | null;
  private readonly governanceStore: GovernanceStore | null;
  private readonly records: WitnessRecord[] = [];
  private readonly mode: "multisig" | "single";

  constructor(config: MultiSigWitnessConfig) {
    if (config.governance) {
      // Multi-sig mode
      this.mode = "multisig";
      this.multiSigSubmitter = new MultiSigSubmitter(config.governance.multiSigConfig);
      this.governanceStore = config.governance.store;
      this.singleSubmitter = null;
    } else if (config.singleSignerConfig) {
      // Single-signer fallback mode
      this.mode = "single";
      this.singleSubmitter = new XrplSubmitter(config.singleSignerConfig);
      this.multiSigSubmitter = null;
      this.governanceStore = null;
    } else {
      throw new Error(
        "MultiSigWitness requires either governance config or singleSignerConfig",
      );
    }

    // Verifier uses explicit config, or falls back to multi-sig/single config
    if (config.verifierConfig) {
      this.verifier = new XrplVerifier(config.verifierConfig);
    } else if (config.governance) {
      const msConfig = config.governance.multiSigConfig;
      this.verifier = new XrplVerifier({
        rpcUrl: msConfig.rpcUrl,
        chainId: msConfig.chainId,
        ...(msConfig.timeoutMs !== undefined ? { timeoutMs: msConfig.timeoutMs } : {}),
      });
    } else if (config.singleSignerConfig) {
      this.verifier = new XrplVerifier(config.singleSignerConfig);
    } else {
      this.verifier = null;
    }
  }

  /**
   * Get the current operating mode.
   */
  getMode(): "multisig" | "single" {
    return this.mode;
  }

  /**
   * Connect to XRPL.
   */
  async connect(): Promise<void> {
    if (this.multiSigSubmitter) {
      await this.multiSigSubmitter.connect();
    }
    if (this.singleSubmitter) {
      await this.singleSubmitter.connect();
    }
    if (this.verifier) {
      await this.verifier.connect();
    }
  }

  /**
   * Disconnect from XRPL.
   */
  async disconnect(): Promise<void> {
    if (this.multiSigSubmitter) {
      await this.multiSigSubmitter.disconnect();
    }
    if (this.singleSubmitter) {
      await this.singleSubmitter.disconnect();
    }
    if (this.verifier) {
      await this.verifier.disconnect();
    }
  }

  /**
   * Check whether the witness is connected.
   */
  isConnected(): boolean {
    if (this.mode === "multisig") {
      return this.multiSigSubmitter?.isConnected() === true;
    }
    return this.singleSubmitter?.isConnected() === true;
  }

  /**
   * Witness a reconciliation report.
   */
  async witnessReconciliation(
    report: ReconciliationReport,
    attestation: AttestationRecord,
  ): Promise<WitnessRecord> {
    const payload = buildReconciliationPayload(report, attestation);
    return this._submitPayload(payload);
  }

  /**
   * Witness a Registrum state registration.
   */
  async witnessRegistrumState(
    stateId: string,
    orderIndex: number,
    attestedBy: string,
  ): Promise<WitnessRecord> {
    const payload = buildRegistrumPayload(stateId, orderIndex, attestedBy);
    return this._submitPayload(payload);
  }

  /**
   * Witness an arbitrary attestation payload.
   */
  async witnessPayload(payload: AttestationPayload): Promise<WitnessRecord> {
    return this._submitPayload(payload);
  }

  /**
   * Verify a witness record against on-chain data.
   */
  async verify(record: WitnessRecord): Promise<VerificationResult> {
    if (!this.verifier) {
      throw new Error("MultiSigWitness: no verifier configured");
    }
    return this.verifier.verify(record);
  }

  /**
   * Get the current governance policy (multi-sig mode only).
   */
  getCurrentPolicy(): GovernancePolicy | null {
    return this.governanceStore?.getCurrentPolicy() ?? null;
  }

  /**
   * Get all witness records from this session.
   */
  getRecords(): readonly WitnessRecord[] {
    return [...this.records];
  }

  /**
   * Verify a payload's content hash offline.
   */
  verifyPayloadIntegrity(payload: AttestationPayload): boolean {
    return verifyPayloadHash(payload);
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private async _submitPayload(payload: AttestationPayload): Promise<WitnessRecord> {
    let record: WitnessRecord;

    if (this.mode === "multisig" && this.multiSigSubmitter && this.governanceStore) {
      const policy = this.governanceStore.getCurrentPolicy();
      record = await this.multiSigSubmitter.submit(payload, policy);
    } else if (this.singleSubmitter) {
      record = await this.singleSubmitter.submit(payload);
    } else {
      throw new Error("MultiSigWitness: no submitter available");
    }

    this.records.push(record);
    return record;
  }
}
