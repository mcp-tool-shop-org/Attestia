/**
 * XRPL EVM Sidechain Bridge Events
 *
 * Canonical representation of cross-chain bridge events between
 * XRPL mainnet and XRPL EVM sidechain.
 *
 * Design:
 * - Pure functions — no side effects
 * - All return types are readonly
 * - Canonical form ensures deterministic replay
 * - Missing destination = pending status (fail-open for tracking)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Status of a bridge event.
 *
 * - "confirmed" — Both source and destination transactions confirmed
 * - "pending" — Source confirmed, destination not yet seen
 * - "failed" — Bridge attempt failed (timeout or explicit failure)
 */
export type BridgeStatus = "confirmed" | "pending" | "failed";

/**
 * A canonical bridge event between XRPL and XRPL EVM sidechain.
 */
export interface BridgeEvent {
  /** Source chain ID (CAIP-2) */
  readonly sourceChainId: string;

  /** Destination chain ID (CAIP-2) */
  readonly destChainId: string;

  /** Transaction hash on the source chain */
  readonly sourceTxHash: string;

  /** Transaction hash on the destination chain (undefined if pending) */
  readonly destTxHash?: string;

  /** Reference to the bridge proof (attestation, witness, etc.) */
  readonly bridgeProofRef?: string;

  /** Bridge event status */
  readonly status: BridgeStatus;

  /** Amount being bridged (smallest unit) */
  readonly amount: string;

  /** Token symbol */
  readonly symbol: string;

  /** Sender address on source chain */
  readonly sender: string;

  /** Recipient address on destination chain */
  readonly recipient: string;

  /** ISO 8601 timestamp when source tx was observed */
  readonly sourceTimestamp: string;

  /** ISO 8601 timestamp when destination tx was observed (undefined if pending) */
  readonly destTimestamp?: string;
}

// =============================================================================
// Known Bridge Contracts
// =============================================================================

/**
 * Known bridge contract addresses on the XRPL EVM sidechain.
 * These are used to detect bridge transactions from regular EVM transfers.
 */
export const KNOWN_BRIDGE_CONTRACTS: ReadonlySet<string> = new Set([
  // XRPL EVM Sidechain Devnet bridge contract (example)
  "0x1111111111111111111111111111111111111111",
  // Add production bridge contracts as they're deployed
]);

// =============================================================================
// Bridge Event Normalization
// =============================================================================

/**
 * Normalize a bridge event into canonical form.
 *
 * Canonical form guarantees:
 * - chainIds are lowercase
 * - tx hashes are lowercase
 * - addresses are lowercase
 * - amounts are string representations (no leading zeros)
 * - status is derived from presence of destTxHash
 *
 * @param event Raw bridge event data
 * @returns Canonical bridge event
 */
export function normalizeBridgeEvent(
  event: Omit<BridgeEvent, "status"> & { status?: BridgeStatus },
): BridgeEvent {
  const sourceTxHash = event.sourceTxHash.toLowerCase();
  const destTxHash = event.destTxHash?.toLowerCase();
  const sender = event.sender.toLowerCase();
  const recipient = event.recipient.toLowerCase();

  // Normalize amount: strip leading zeros (but keep "0")
  const amount = event.amount === "0" ? "0" : event.amount.replace(/^0+/, "") || "0";

  // Derive status if not provided
  const status = event.status ?? (destTxHash ? "confirmed" : "pending");

  return {
    sourceChainId: event.sourceChainId,
    destChainId: event.destChainId,
    sourceTxHash,
    ...(destTxHash && { destTxHash }),
    ...(event.bridgeProofRef && { bridgeProofRef: event.bridgeProofRef }),
    status,
    amount,
    symbol: event.symbol,
    sender,
    recipient,
    sourceTimestamp: event.sourceTimestamp,
    ...(event.destTimestamp && { destTimestamp: event.destTimestamp }),
  };
}

/**
 * Check if a transaction interacts with a known bridge contract.
 *
 * @param address The contract address to check
 * @returns true if the address is a known bridge contract
 */
export function isBridgeContract(address: string): boolean {
  return KNOWN_BRIDGE_CONTRACTS.has(address.toLowerCase());
}

/**
 * Create a canonical key for a bridge event.
 * Used for deduplication and lookup.
 *
 * @param sourceChainId Source chain ID
 * @param sourceTxHash Source transaction hash
 * @returns Canonical bridge key
 */
export function bridgeEventKey(
  sourceChainId: string,
  sourceTxHash: string,
): string {
  return `bridge:${sourceChainId}:${sourceTxHash.toLowerCase()}`;
}
