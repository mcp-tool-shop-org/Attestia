/**
 * XRPL Witness — Top-level coordinator
 *
 * Orchestrates the full attestation pipeline:
 * 1. Build attestation payload from reconciliation report
 * 2. Encode as XRPL memo
 * 3. Submit 1-drop self-send transaction
 * 4. Return witness record (on-chain proof reference)
 *
 * Also supports verification: read back from XRPL and verify integrity.
 *
 * Usage:
 *   const witness = new XrplWitness(config);
 *   await witness.connect();
 *   const record = await witness.witnessReconciliation(report, attestation);
 *   const verified = await witness.verify(record);
 *   await witness.disconnect();
 */

import type { AttestationRecord, ReconciliationReport } from "@attestia/reconciler";
import { buildReconciliationPayload, buildRegistrumPayload, verifyPayloadHash } from "./payload.js";
import { XrplSubmitter } from "./submitter.js";
import { XrplVerifier } from "./verifier.js";
import type {
  AttestationPayload,
  VerificationResult,
  WitnessConfig,
  WitnessRecord,
} from "./types.js";

export class XrplWitness {
  private readonly submitter: XrplSubmitter;
  private readonly verifier: XrplVerifier;
  private readonly records: WitnessRecord[] = [];

  constructor(config: WitnessConfig) {
    this.submitter = new XrplSubmitter(config);
    this.verifier = new XrplVerifier(config);
  }

  /**
   * Connect to XRPL for both submission and verification.
   */
  async connect(): Promise<void> {
    await this.submitter.connect();
    await this.verifier.connect();
  }

  /**
   * Disconnect from XRPL.
   */
  async disconnect(): Promise<void> {
    await this.submitter.disconnect();
    await this.verifier.disconnect();
  }

  /**
   * Witness a reconciliation report on XRPL.
   *
   * Builds a content-addressed payload from the report, encodes it as
   * an XRPL memo, and submits a 1-drop self-send transaction.
   */
  async witnessReconciliation(
    report: ReconciliationReport,
    attestation: AttestationRecord,
  ): Promise<WitnessRecord> {
    const payload = buildReconciliationPayload(report, attestation);
    const record = await this.submitter.submit(payload);
    this.records.push(record);
    return record;
  }

  /**
   * Witness a Registrum state registration on XRPL.
   */
  async witnessRegistrumState(
    stateId: string,
    orderIndex: number,
    attestedBy: string,
  ): Promise<WitnessRecord> {
    const payload = buildRegistrumPayload(stateId, orderIndex, attestedBy);
    const record = await this.submitter.submit(payload);
    this.records.push(record);
    return record;
  }

  /**
   * Witness an arbitrary attestation payload on XRPL.
   */
  async witnessPayload(payload: AttestationPayload): Promise<WitnessRecord> {
    const record = await this.submitter.submit(payload);
    this.records.push(record);
    return record;
  }

  /**
   * Verify a witness record against on-chain data.
   */
  async verify(record: WitnessRecord): Promise<VerificationResult> {
    return this.verifier.verify(record);
  }

  /**
   * Fetch and decode an attestation payload from an XRPL transaction.
   */
  async fetchPayload(txHash: string): Promise<AttestationPayload | null> {
    return this.verifier.fetchPayload(txHash);
  }

  /**
   * Build a transaction without submitting (dry-run).
   * Useful for inspecting what would be written to XRPL.
   */
  dryRun(
    report: ReconciliationReport,
    attestation: AttestationRecord,
  ): { payload: AttestationPayload; transaction: ReturnType<XrplSubmitter["buildTransaction"]> } {
    const payload = buildReconciliationPayload(report, attestation);
    const transaction = this.submitter.buildTransaction(payload);
    return { payload, transaction };
  }

  /**
   * Get all witness records created during this session.
   */
  getRecords(): readonly WitnessRecord[] {
    return this.records;
  }

  /**
   * Verify a payload's content hash is self-consistent (offline, no XRPL needed).
   */
  verifyPayloadIntegrity(payload: AttestationPayload): boolean {
    return verifyPayloadHash(payload);
  }
}
