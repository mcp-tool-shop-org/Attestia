/**
 * @attestia/chain-observer — Multi-chain read-only observation layer.
 *
 * This package provides a unified interface for observing blockchain state
 * across multiple chains (EVM, XRPL, and future additions).
 *
 * Design rules:
 * - READ-ONLY: No signing, no submission, no execution
 * - Chain-agnostic interface, chain-specific implementations
 * - All observations are immutable once captured
 * - Observation timestamps are always recorded
 * - Errors are surfaced, never swallowed
 */

// Core observer interface
export type {
  ChainObserver,
  ObserverConfig,
  BalanceQuery,
  BalanceResult,
  TransferQuery,
  TransferEvent,
  TokenBalanceQuery,
  TokenBalance,
  ConnectionStatus,
} from "./observer.js";

// Observer registry
export {
  ObserverRegistry,
} from "./registry.js";

// Chain definitions
export {
  CHAINS,
  getChainRef,
  isEvmChain,
  isXrplChain,
} from "./chains.js";

// Chain-specific observers
export { EvmObserver } from "./evm/index.js";
export { XrplObserver } from "./xrpl/index.js";

// Re-export chain types from @attestia/types for convenience
export type {
  ChainId,
  ChainRef,
  TxHash,
  BlockRef,
  TokenRef,
  OnChainEvent,
} from "@attestia/types";
