/**
 * @attestia/witness domain types.
 *
 * XRPL attestation pipeline types for:
 * - Content-addressed attestation payloads
 * - XRPL transaction memo encoding
 * - Witness records (on-chain proof references)
 */

import type { TxHash, ChainId } from "@attestia/types";

// =============================================================================
// Attestation Payload
// =============================================================================

/**
 * A content-addressed attestation payload.
 *
 * This is the canonical data structure that gets encoded as an XRPL memo.
 * The hash is SHA-256 of the canonical JSON representation.
 */
export interface AttestationPayload {
  /** SHA-256 hash of the payload content */
  readonly hash: string;

  /** ISO 8601 timestamp when the payload was created */
  readonly timestamp: string;

  /** Source attestation (reconciliation report or registrum state) */
  readonly source: AttestationSource;

  /** Summary data included in the memo for quick verification */
  readonly summary: PayloadSummary;
}

export type AttestationSource =
  | { readonly kind: "reconciliation"; readonly reportId: string; readonly reportHash: string }
  | { readonly kind: "registrum"; readonly stateId: string; readonly orderIndex: number };

export interface PayloadSummary {
  /** Whether the attestation represents a clean state */
  readonly clean: boolean;
  /** Number of matched items */
  readonly matchedCount: number;
  /** Number of mismatched items */
  readonly mismatchCount: number;
  /** Number of missing items */
  readonly missingCount: number;
  /** Attestor identity */
  readonly attestedBy: string;
}

// =============================================================================
// XRPL Memo
// =============================================================================

/**
 * An XRPL transaction memo (pre-hex-encoding).
 *
 * Per XRPL convention:
 * - MemoType: MIME type or identifier
 * - MemoData: the payload content
 * - MemoFormat (optional): encoding hint
 */
export interface XrplMemo {
  /** Memo type identifier (e.g. "attestia/witness/v1") */
  readonly MemoType: string;
  /** Hex-encoded payload data */
  readonly MemoData: string;
  /** Optional format hint (e.g. "application/json") */
  readonly MemoFormat?: string;
}

// =============================================================================
// Witness Record
// =============================================================================

/**
 * A witness record — the proof that an attestation was written on-chain.
 */
export interface WitnessRecord {
  /** Unique witness record ID */
  readonly id: string;

  /** The attestation payload that was witnessed */
  readonly payload: AttestationPayload;

  /** XRPL chain ID (e.g. "xrpl:mainnet", "xrpl:testnet") */
  readonly chainId: ChainId;

  /** XRPL transaction hash */
  readonly txHash: TxHash;

  /** XRPL ledger index where the tx was validated */
  readonly ledgerIndex: number;

  /** ISO 8601 timestamp of the witness */
  readonly witnessedAt: string;

  /** Witness account address */
  readonly witnessAccount: string;
}

// =============================================================================
// Verification
// =============================================================================

/** Result of verifying a witness record against on-chain data. */
export interface VerificationResult {
  /** Whether the on-chain data matches the expected payload */
  readonly verified: boolean;

  /** The witness record being verified */
  readonly witnessRecord: WitnessRecord;

  /** On-chain payload hash (from memo data) */
  readonly onChainHash?: string;

  /** Discrepancies found during verification */
  readonly discrepancies: readonly string[];
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for the XRPL witness.
 */
export interface WitnessConfig {
  /** XRPL WebSocket endpoint (e.g. "wss://s.altnet.rippletest.net:51233") */
  readonly rpcUrl: string;

  /** XRPL chain identifier (e.g. "xrpl:testnet") */
  readonly chainId: ChainId;

  /** Witness account address (r-address) */
  readonly account: string;

  /** Witness account secret/seed (for signing attestation txs) */
  readonly secret: string;

  /** Optional: fee in drops (defaults to 12) */
  readonly feeDrops?: string;

  /** Optional: connection timeout in ms */
  readonly timeoutMs?: number;
}
