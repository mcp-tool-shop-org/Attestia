/**
 * Chain Types
 *
 * Multi-chain observation primitives.
 * Chain-agnostic references for the observation layer.
 *
 * Rules:
 * - Chain IDs follow CAIP-2 convention where applicable
 * - All references are read-only observation data
 * - No execution capability in these types
 */

/**
 * Chain identifier (e.g., "eip155:1" for Ethereum mainnet, "xrpl:main").
 */
export type ChainId = string;

/**
 * Transaction hash on a specific chain.
 */
export type TxHash = string;

/**
 * Reference to a specific chain.
 */
export interface ChainRef {
  /** Chain identifier */
  readonly chainId: ChainId;

  /** Human-readable chain name */
  readonly name: string;

  /** Chain family (evm, xrpl, solana, etc.) */
  readonly family: string;
}

/**
 * Reference to a specific block on a chain.
 */
export interface BlockRef {
  readonly chainId: ChainId;
  readonly blockNumber: number;
  readonly blockHash: string;
  readonly timestamp: string;
}

/**
 * Reference to a specific token on a chain.
 */
export interface TokenRef {
  /** Chain this token lives on */
  readonly chainId: ChainId;

  /** Token contract address (or native identifier) */
  readonly address: string;

  /** Token symbol (e.g., "USDC", "XRP") */
  readonly symbol: string;

  /** Decimal places */
  readonly decimals: number;
}

/**
 * An observed on-chain event.
 * Read-only — the observation layer captures these, never creates them.
 */
export interface OnChainEvent {
  /** Unique event identifier */
  readonly id: string;

  /** Which chain */
  readonly chainId: ChainId;

  /** Transaction hash */
  readonly txHash: TxHash;

  /** Block reference */
  readonly block: BlockRef;

  /** Event type (transfer, approval, swap, etc.) */
  readonly eventType: string;

  /** Event-specific data (opaque to the framework) */
  readonly data: Readonly<Record<string, unknown>>;

  /** When we observed this event */
  readonly observedAt: string;
}
