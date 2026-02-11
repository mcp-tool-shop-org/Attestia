/**
 * XRPL Memo Encoder
 *
 * Encodes attestation payloads into XRPL transaction memo format
 * and decodes memos back into attestation payloads.
 *
 * XRPL memos are hex-encoded strings in the transaction:
 * - MemoType: identifies the memo purpose (hex of "attestia/witness/v1")
 * - MemoData: the payload content (hex of JSON)
 * - MemoFormat: encoding format hint (hex of "application/json")
 *
 * Transaction structure:
 * - Self-send 1 drop XRP (minimum payment)
 * - Memo attached with attestation data
 * - No smart contracts, no Turing-complete execution
 */

import type { AttestationPayload, XrplMemo } from "./types.js";

/** The memo type identifier for Attestia witness payloads */
export const MEMO_TYPE = "attestia/witness/v1";

/** The memo format for JSON-encoded payloads */
export const MEMO_FORMAT = "application/json";

/**
 * Encode an attestation payload as an XRPL memo.
 *
 * Converts the payload to JSON, then hex-encodes all memo fields
 * per XRPL convention.
 */
export function encodeMemo(payload: AttestationPayload): XrplMemo {
  const payloadJson = JSON.stringify(payload);

  return {
    MemoType: toHex(MEMO_TYPE),
    MemoData: toHex(payloadJson),
    MemoFormat: toHex(MEMO_FORMAT),
  };
}

/**
 * Decode an XRPL memo back into an attestation payload.
 *
 * Validates that the memo type matches our expected type,
 * then parses the JSON payload from the memo data.
 *
 * @throws Error if memo type doesn't match or payload is invalid
 */
export function decodeMemo(memo: XrplMemo): AttestationPayload {
  const memoType = fromHex(memo.MemoType);

  if (memoType !== MEMO_TYPE) {
    throw new Error(
      `Unexpected memo type: expected "${MEMO_TYPE}", got "${memoType}"`,
    );
  }

  const payloadJson = fromHex(memo.MemoData);

  try {
    return JSON.parse(payloadJson) as AttestationPayload;
  } catch {
    throw new Error("Failed to parse attestation payload from memo data");
  }
}

/**
 * Check if a memo is an Attestia witness memo.
 */
export function isAttestiaMemo(memo: XrplMemo): boolean {
  try {
    return fromHex(memo.MemoType) === MEMO_TYPE;
  } catch {
    return false;
  }
}

// =============================================================================
// Hex encoding/decoding helpers
// =============================================================================

/**
 * Convert a UTF-8 string to uppercase hex encoding (XRPL convention).
 */
export function toHex(str: string): string {
  return Buffer.from(str, "utf8").toString("hex").toUpperCase();
}

/**
 * Convert a hex-encoded string back to UTF-8.
 */
export function fromHex(hex: string): string {
  return Buffer.from(hex, "hex").toString("utf8");
}
