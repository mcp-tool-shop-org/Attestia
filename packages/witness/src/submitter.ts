/**
 * XRPL Submitter
 *
 * Submits attestation transactions to XRPL.
 * Each attestation is a 1-drop self-send Payment with memo data.
 *
 * Transaction flow:
 * 1. Build Payment transaction (self-send, 1 drop)
 * 2. Attach attestation memo
 * 3. Auto-fill sequence/fee
 * 4. Sign with witness account secret
 * 5. Submit and wait for validation (with retry on transient failures)
 *
 * The resulting transaction hash and ledger index are returned
 * as proof that the attestation was written on-chain.
 */

import { Client as XrplClient, Wallet } from "xrpl";
import type { Payment } from "xrpl";
import { encodeMemo } from "./memo-encoder.js";
import type { AttestationPayload, WitnessConfig, WitnessRecord, XrplMemo } from "./types.js";
import { WitnessSubmitError } from "./types.js";
import {
  withRetry,
  DEFAULT_RETRY_CONFIG,
  isRetryableXrplError,
  type RetryConfig,
} from "./retry.js";

export class XrplSubmitter {
  private client: XrplClient | null = null;
  private wallet: Wallet | null = null;
  private readonly config: WitnessConfig;
  private readonly retryConfig: RetryConfig;

  constructor(config: WitnessConfig) {
    this.config = config;
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
  }

  /**
   * Connect to the XRPL node and prepare the wallet.
   */
  async connect(): Promise<void> {
    this.client = new XrplClient(this.config.rpcUrl, {
      timeout: this.config.timeoutMs ?? 30_000,
    });
    await this.client.connect();
    this.wallet = Wallet.fromSeed(this.config.secret);
  }

  /**
   * Disconnect from the XRPL node.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    this.wallet = null;
  }

  /**
   * Check whether the submitter is connected.
   */
  isConnected(): boolean {
    return this.client?.isConnected() === true && this.wallet !== null;
  }

  /**
   * Submit an attestation payload to XRPL with retry.
   *
   * Creates a 1-drop self-send Payment with the attestation encoded as a memo.
   * Waits for the transaction to be validated on-ledger.
   * Retries on transient failures with exponential backoff.
   *
   * @returns A WitnessRecord with the on-chain proof reference
   * @throws WitnessSubmitError if all retry attempts are exhausted
   * @throws Error if not connected (permanent, no retry)
   */
  async submit(payload: AttestationPayload): Promise<WitnessRecord> {
    if (!this.client || !this.wallet) {
      throw new Error("XrplSubmitter: not connected. Call connect() first.");
    }

    const client = this.client;
    const wallet = this.wallet;

    try {
      return await withRetry(
        async () => this._submitOnce(payload, client, wallet),
        this.retryConfig,
        isRetryableXrplError,
      );
    } catch (err: unknown) {
      // Wrap RetryExhaustedError in WitnessSubmitError for domain-specific error type
      if (err instanceof WitnessSubmitError) {
        throw err;
      }
      // RetryExhaustedError or non-retryable error
      const attempts = (err as { attempts?: number }).attempts ?? 1;
      throw new WitnessSubmitError(
        attempts,
        err,
        payload,
      );
    }
  }

  /**
   * Build a transaction without submitting (for dry-run / inspection).
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

  /**
   * Single submission attempt (no retry).
   */
  private async _submitOnce(
    payload: AttestationPayload,
    client: XrplClient,
    wallet: Wallet,
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

    // Auto-fill sequence, fee (if not set), last ledger sequence
    const prepared = await client.autofill(tx);

    // Sign with witness wallet
    const signed = wallet.sign(prepared);

    // Submit and wait for validation
    const result = await client.submitAndWait(signed.tx_blob);

    const meta = result.result.meta;
    const ledgerIndex = typeof meta === "object" && meta !== null && "ledger_index" in meta
      ? (meta as Record<string, unknown>).ledger_index as number
      : result.result.ledger_index ?? 0;

    return {
      id: `witness:${payload.hash.slice(0, 16)}`,
      payload,
      chainId: this.config.chainId,
      txHash: signed.hash,
      ledgerIndex,
      witnessedAt: new Date().toISOString(),
      witnessAccount: this.config.account,
    };
  }
}
