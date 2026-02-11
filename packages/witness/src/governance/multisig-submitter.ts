/**
 * Multi-Sig XRPL Submitter
 *
 * Like XrplSubmitter but accepts multiple signers for N-of-M governance.
 * Builds the same 1-drop self-payment with attestation memo, but collects
 * signatures from N signers and combines them via XRPL multi-sign format.
 *
 * Design:
 * - Fail-closed: quorum must be met before submission
 * - Timestamps normalized to UTC
 * - Uses existing withRetry() for transient failure resilience
 * - Compatible with existing XrplSubmitter memo format
 */

import { Client as XrplClient, Wallet, multisign } from "xrpl";
import type { Payment, Transaction } from "xrpl";
import { encodeMemo } from "../memo-encoder.js";
import type { AttestationPayload, WitnessRecord, XrplMemo } from "../types.js";
import { WitnessSubmitError } from "../types.js";
import {
  withRetry,
  DEFAULT_RETRY_CONFIG,
  isRetryableXrplError,
  type RetryConfig,
} from "../retry.js";
import {
  buildCanonicalSigningPayload,
  aggregateSignatures,
  type SignerSignature,
} from "./signing.js";
import type { GovernancePolicy } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for a single signer in the multi-sig set.
 */
export interface SignerConfig {
  /** Signer's XRPL address */
  readonly address: string;

  /** Signer's secret/seed for signing */
  readonly secret: string;
}

/**
 * Configuration for the multi-sig submitter.
 */
export interface MultiSigConfig {
  /** XRPL WebSocket endpoint */
  readonly rpcUrl: string;

  /** XRPL chain identifier (e.g. "xrpl:testnet") */
  readonly chainId: string;

  /** The multi-sig master account (the account that sends the transaction) */
  readonly account: string;

  /** Signer configurations for each participant */
  readonly signers: readonly SignerConfig[];

  /** Optional fee in drops */
  readonly feeDrops?: string;

  /** Optional connection timeout */
  readonly timeoutMs?: number;

  /** Optional retry configuration */
  readonly retry?: RetryConfig;
}

/**
 * Result of collecting signatures from multiple signers.
 */
export interface MultiSignResult {
  /** The signed transaction blobs from each signer */
  readonly signedBlobs: readonly string[];

  /** Signer signatures (for governance aggregation) */
  readonly signerSignatures: readonly SignerSignature[];

  /** The combined multi-signed transaction blob */
  readonly combinedBlob: string;
}

// =============================================================================
// MultiSigSubmitter
// =============================================================================

export class MultiSigSubmitter {
  private client: XrplClient | null = null;
  private wallets: Map<string, Wallet> = new Map();
  private readonly config: MultiSigConfig;
  private readonly retryConfig: RetryConfig;

  constructor(config: MultiSigConfig) {
    this.config = config;
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
  }

  /**
   * Connect to the XRPL node and prepare all signer wallets.
   */
  async connect(): Promise<void> {
    this.client = new XrplClient(this.config.rpcUrl, {
      timeout: this.config.timeoutMs ?? 30_000,
    });
    await this.client.connect();

    this.wallets.clear();
    for (const signer of this.config.signers) {
      const wallet = Wallet.fromSeed(signer.secret);
      this.wallets.set(signer.address, wallet);
    }
  }

  /**
   * Disconnect from the XRPL node.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    this.wallets.clear();
  }

  /**
   * Check whether the submitter is connected.
   */
  isConnected(): boolean {
    return this.client?.isConnected() === true && this.wallets.size > 0;
  }

  /**
   * Submit an attestation with multi-sig signatures.
   *
   * 1. Builds the 1-drop self-send transaction with attestation memo
   * 2. Each signer independently signs the prepared transaction
   * 3. Signatures are aggregated and quorum is verified
   * 4. The combined multi-signed transaction is submitted
   *
   * @param payload The attestation payload
   * @param policy The governance policy (for quorum verification)
   * @returns WitnessRecord with on-chain proof reference
   * @throws WitnessSubmitError if submission fails after retries
   * @throws Error if quorum is not met or not connected
   */
  async submit(
    payload: AttestationPayload,
    policy: GovernancePolicy,
  ): Promise<WitnessRecord> {
    if (!this.client || this.wallets.size === 0) {
      throw new Error("MultiSigSubmitter: not connected. Call connect() first.");
    }

    const client = this.client;

    try {
      return await withRetry(
        async () => this._submitOnce(payload, policy, client),
        this.retryConfig,
        isRetryableXrplError,
      );
    } catch (err: unknown) {
      if (err instanceof WitnessSubmitError) {
        throw err;
      }
      const attempts = (err as { attempts?: number }).attempts ?? 1;
      throw new WitnessSubmitError(attempts, err, payload);
    }
  }

  /**
   * Build the multi-sign result without submitting (for inspection/dry-run).
   */
  buildMultiSign(
    payload: AttestationPayload,
    policy: GovernancePolicy,
    prepared: Transaction,
  ): MultiSignResult {
    const signedBlobs: string[] = [];
    const signerSignatures: SignerSignature[] = [];
    const now = normalizeTimestamp(new Date());

    for (const [address, wallet] of this.wallets) {
      // Each signer independently signs the prepared transaction
      const signed = wallet.sign(prepared, /* multisign */ true);
      signedBlobs.push(signed.tx_blob);

      signerSignatures.push({
        address,
        signature: signed.hash,
        signedAt: now,
      });
    }

    // Verify quorum via governance signing module
    const payloadHash = buildCanonicalSigningPayload(payload, policy);
    aggregateSignatures(signerSignatures, policy, payloadHash);

    // Combine all signed blobs into a single multi-signed transaction
    const combinedBlob = multisign([...signedBlobs]);

    return {
      signedBlobs,
      signerSignatures,
      combinedBlob,
    };
  }

  /**
   * Build the unsigned transaction (for inspection).
   */
  buildTransaction(payload: AttestationPayload): {
    memo: XrplMemo;
    account: string;
    destination: string;
    amount: string;
  } {
    const memo = encodeMemo(payload);
    return {
      memo,
      account: this.config.account,
      destination: this.config.account,
      amount: "1",
    };
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private async _submitOnce(
    payload: AttestationPayload,
    policy: GovernancePolicy,
    client: XrplClient,
  ): Promise<WitnessRecord> {
    const memo: XrplMemo = encodeMemo(payload);

    const tx: Payment = {
      TransactionType: "Payment",
      Account: this.config.account,
      Destination: this.config.account, // Self-send
      Amount: "1", // 1 drop
      Memos: [
        {
          Memo: {
            MemoType: memo.MemoType,
            MemoData: memo.MemoData,
            ...(memo.MemoFormat ? { MemoFormat: memo.MemoFormat } : {}),
          },
        },
      ],
      ...(this.config.feeDrops ? { Fee: this.config.feeDrops } : {}),
    };

    // Auto-fill sequence, fee, last ledger sequence
    const prepared = await client.autofill(tx);

    // Build multi-sign result (each signer signs, quorum verified, combined)
    const multiSignResult = this.buildMultiSign(payload, policy, prepared);

    // Submit the combined multi-signed transaction
    const result = await client.submitAndWait(multiSignResult.combinedBlob);

    const meta = result.result.meta;
    const ledgerIndex =
      typeof meta === "object" && meta !== null && "ledger_index" in meta
        ? (meta as Record<string, unknown>).ledger_index as number
        : result.result.ledger_index ?? 0;

    return {
      id: `witness:multisig:${payload.hash.slice(0, 16)}`,
      payload,
      chainId: this.config.chainId,
      txHash: result.result.hash ?? "",
      ledgerIndex,
      witnessedAt: normalizeTimestamp(new Date()),
      witnessAccount: this.config.account,
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize a Date to UTC ISO 8601 string.
 * Ensures all timestamps are consistent regardless of system timezone.
 */
export function normalizeTimestamp(date: Date): string {
  return date.toISOString();
}
