/**
 * L2 Adapter — Gas normalization and receipt field extraction for L2 chains.
 *
 * L2 chains (Arbitrum, Optimism, Base) have different gas models:
 * - Arbitrum: ArbGas units, L1 data posting component
 * - Optimism/Base: L1 fee based on calldata compression
 *
 * This adapter normalizes gas reporting and extracts L2-specific
 * receipt fields for consistent accounting across chains.
 *
 * Rules:
 * - Pure functions — no side effects
 * - All return types are immutable (readonly)
 * - No chain-specific RPC calls — normalization only
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Normalized gas report for a transaction.
 */
export interface NormalizedGas {
  /** Chain ID where the transaction was executed */
  readonly chainId: string;

  /** L2 execution gas used */
  readonly l2GasUsed: bigint;

  /** L1 data posting gas (if applicable, else 0n) */
  readonly l1GasUsed: bigint;

  /** Total effective gas (L2 + L1 component) */
  readonly totalGas: bigint;
}

/**
 * L2-specific transaction receipt fields.
 */
export interface L2ReceiptFields {
  /** L1 fee charged for data posting (in wei) */
  readonly l1Fee?: bigint;

  /** L1 gas price at time of inclusion */
  readonly l1GasPrice?: bigint;

  /** L1 fee scalar (Optimism/Base) */
  readonly l1FeeScalar?: string;

  /** L1 blob base fee (Optimism/Base, post-Ecotone) */
  readonly l1BlobBaseFee?: bigint;
}

// =============================================================================
// Known L2 Chain Families
// =============================================================================

/** Optimism stack chain IDs (OP Mainnet, Base) */
const OP_STACK_CHAINS = new Set([
  "eip155:10",    // OP Mainnet
  "eip155:8453",  // Base
]);

/** Arbitrum chain IDs */
const ARBITRUM_CHAINS = new Set([
  "eip155:42161", // Arbitrum One
]);

/**
 * Check if a chain ID is an Optimism stack L2.
 */
export function isOpStackChain(chainId: string): boolean {
  return OP_STACK_CHAINS.has(chainId);
}

/**
 * Check if a chain ID is an Arbitrum chain.
 */
export function isArbitrumChain(chainId: string): boolean {
  return ARBITRUM_CHAINS.has(chainId);
}

/**
 * Check if a chain ID is any known L2.
 */
export function isL2Chain(chainId: string): boolean {
  return isOpStackChain(chainId) || isArbitrumChain(chainId);
}

// =============================================================================
// Gas Normalization
// =============================================================================

/**
 * Normalize gas usage for an L2 transaction.
 *
 * For L1 chains or unknown chains, l1GasUsed is 0.
 * For L2 chains, the L1 data posting component is added.
 *
 * @param chainId The CAIP-2 chain ID
 * @param l2GasUsed Gas consumed by L2 execution
 * @param l1GasUsed Optional gas consumed by L1 data posting
 */
export function normalizeL2Gas(
  chainId: string,
  l2GasUsed: bigint,
  l1GasUsed?: bigint,
): NormalizedGas {
  const l1 = l1GasUsed ?? 0n;
  return {
    chainId,
    l2GasUsed,
    l1GasUsed: l1,
    totalGas: l2GasUsed + l1,
  };
}

// =============================================================================
// Receipt Field Extraction
// =============================================================================

/**
 * Extract L2-specific fields from a transaction receipt.
 *
 * Different L2s expose different receipt fields:
 * - Optimism/Base: l1Fee, l1GasPrice, l1FeeScalar, l1BlobBaseFee
 * - Arbitrum: L1 gas is embedded in the ArbGas model
 *
 * @param chainId The CAIP-2 chain ID
 * @param receipt Raw transaction receipt (from viem or ethers)
 * @returns Extracted L2 fields, or empty object for L1/unknown chains
 */
export function extractL2ReceiptFields(
  chainId: string,
  receipt: Record<string, unknown>,
): L2ReceiptFields {
  if (isOpStackChain(chainId)) {
    return extractOpStackFields(receipt);
  }

  if (isArbitrumChain(chainId)) {
    return extractArbitrumFields(receipt);
  }

  // L1 or unknown chain — no L2-specific fields
  return {};
}

/**
 * Extract OP Stack receipt fields (Optimism, Base).
 */
function extractOpStackFields(
  receipt: Record<string, unknown>,
): L2ReceiptFields {
  const fields: L2ReceiptFields = {};
  const result: Record<string, unknown> = {};

  if (typeof receipt.l1Fee === "bigint") {
    result.l1Fee = receipt.l1Fee;
  } else if (typeof receipt.l1Fee === "string") {
    result.l1Fee = BigInt(receipt.l1Fee);
  }

  if (typeof receipt.l1GasPrice === "bigint") {
    result.l1GasPrice = receipt.l1GasPrice;
  } else if (typeof receipt.l1GasPrice === "string") {
    result.l1GasPrice = BigInt(receipt.l1GasPrice);
  }

  if (typeof receipt.l1FeeScalar === "string") {
    result.l1FeeScalar = receipt.l1FeeScalar;
  }

  if (typeof receipt.l1BlobBaseFee === "bigint") {
    result.l1BlobBaseFee = receipt.l1BlobBaseFee;
  } else if (typeof receipt.l1BlobBaseFee === "string") {
    result.l1BlobBaseFee = BigInt(receipt.l1BlobBaseFee);
  }

  return { ...fields, ...result } as L2ReceiptFields;
}

/**
 * Extract Arbitrum receipt fields.
 * Arbitrum's L1 gas cost is embedded in the gas model,
 * so receipt fields are less relevant.
 */
function extractArbitrumFields(
  receipt: Record<string, unknown>,
): L2ReceiptFields {
  const result: Record<string, unknown> = {};

  // Arbitrum may expose gasUsedForL1 in some receipt formats
  if (typeof receipt.gasUsedForL1 === "bigint") {
    result.l1Fee = receipt.gasUsedForL1;
  } else if (typeof receipt.gasUsedForL1 === "string") {
    result.l1Fee = BigInt(receipt.gasUsedForL1);
  }

  return result as L2ReceiptFields;
}
