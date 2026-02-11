/**
 * XRPL Verifier
 *
 * Reads attestation memos back from XRPL and verifies their integrity.
 *
 * Verification steps:
 * 1. Fetch the transaction from XRPL by txHash
 * 2. Extract memo data from the transaction
 * 3. Decode the attestation payload
 * 4. Verify the content hash matches
 * 5. Compare against the expected witness record
 */

import { Client as XrplClient } from "xrpl";
import { decodeMemo, isAttestiaMemo } from "./memo-encoder.js";
import { verifyPayloadHash } from "./payload.js";
import type {
  AttestationPayload,
  VerificationResult,
  WitnessConfig,
  WitnessRecord,
  XrplMemo,
} from "./types.js";

export class XrplVerifier {
  private client: XrplClient | null = null;
  private readonly config: Pick<WitnessConfig, "rpcUrl" | "chainId" | "timeoutMs">;

  constructor(config: Pick<WitnessConfig, "rpcUrl" | "chainId" | "timeoutMs">) {
    this.config = config;
  }

  /**
   * Connect to the XRPL node for verification queries.
   */
  async connect(): Promise<void> {
    this.client = new XrplClient(this.config.rpcUrl, {
      timeout: this.config.timeoutMs ?? 30_000,
    });
    await this.client.connect();
  }

  /**
   * Disconnect from the XRPL node.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
  }

  /**
   * Verify a witness record by fetching the transaction from XRPL.
   *
   * Checks:
   * 1. Transaction exists on-chain
   * 2. Transaction contains an Attestia memo
   * 3. Decoded payload hash matches the witness record's payload hash
   * 4. Payload content hash is self-consistent
   */
  async verify(record: WitnessRecord): Promise<VerificationResult> {
    if (!this.client) {
      throw new Error("XrplVerifier: not connected. Call connect() first.");
    }

    try {
      const response = await this.client.request({
        command: "tx",
        transaction: record.txHash,
        binary: false,
      });

      const tx = response.result;

      // Extract memos from transaction
      const memos = (tx as unknown as Record<string, unknown>).Memos as
        | readonly { Memo: XrplMemo }[]
        | undefined;

      if (!memos || memos.length === 0) {
        return {
          verified: false,
          witnessRecord: record,
          discrepancies: ["Transaction has no memos"],
        };
      }

      // Find Attestia memo
      const attestiaMemo = memos.find((m) => isAttestiaMemo(m.Memo));
      if (!attestiaMemo) {
        return {
          verified: false,
          witnessRecord: record,
          discrepancies: ["No Attestia witness memo found in transaction"],
        };
      }

      // Decode the payload
      const onChainPayload = decodeMemo(attestiaMemo.Memo);
      const discrepancies: string[] = [];

      // Verify hash consistency
      if (onChainPayload.hash !== record.payload.hash) {
        discrepancies.push(
          `Hash mismatch: on-chain=${onChainPayload.hash} expected=${record.payload.hash}`,
        );
      }

      // Verify payload self-consistency (content hash matches content)
      if (!verifyPayloadHash(onChainPayload)) {
        discrepancies.push("On-chain payload hash does not match its content");
      }

      return {
        verified: discrepancies.length === 0,
        witnessRecord: record,
        onChainHash: onChainPayload.hash,
        discrepancies,
      };
    } catch (error) {
      return {
        verified: false,
        witnessRecord: record,
        discrepancies: [
          `Failed to fetch transaction: ${error instanceof Error ? error.message : String(error)}`,
        ],
      };
    }
  }

  /**
   * Fetch and decode an attestation payload from an XRPL transaction hash.
   *
   * @returns The decoded payload, or null if the tx has no Attestia memo
   */
  async fetchPayload(txHash: string): Promise<AttestationPayload | null> {
    if (!this.client) {
      throw new Error("XrplVerifier: not connected. Call connect() first.");
    }

    const response = await this.client.request({
      command: "tx",
      transaction: txHash,
      binary: false,
    });

    const tx = response.result;
    const memos = (tx as unknown as Record<string, unknown>).Memos as
      | readonly { Memo: XrplMemo }[]
      | undefined;

    if (!memos) return null;

    const attestiaMemo = memos.find((m) => isAttestiaMemo(m.Memo));
    if (!attestiaMemo) return null;

    return decodeMemo(attestiaMemo.Memo);
  }
}
