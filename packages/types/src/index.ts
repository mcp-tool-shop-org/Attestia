/**
 * @attestia/types — Shared domain types for the Attestia stack.
 *
 * These types are used across all Attestia packages:
 * - Intent declaration and lifecycle
 * - Financial primitives (Money, entries, accounts)
 * - Chain references and observations
 * - Event architecture
 * - Identity
 *
 * Design rules (inherited from Registrum):
 * - All types are immutable (readonly)
 * - No runtime dependencies
 * - No methods that mutate state
 * - No semantic interpretation in types — meaning lives in consuming code
 */

// Intent types
export type {
  Intent,
  IntentStatus,
  IntentDeclaration,
  IntentApproval,
  IntentExecution,
  IntentVerification,
} from "./intent.js";

// Financial types
export type {
  Money,
  Currency,
  LedgerEntry,
  LedgerEntryType,
  AccountRef,
} from "./financial.js";

// Chain types
export type {
  ChainId,
  ChainRef,
  TxHash,
  BlockRef,
  TokenRef,
  OnChainEvent,
} from "./chain.js";

// Event types
export type {
  DomainEvent,
  EventMetadata,
} from "./event.js";

// Runtime type guards
export {
  isMoney,
  isAccountRef,
  isLedgerEntryType,
  isLedgerEntry,
  isIntentStatus,
  isIntent,
  isEventMetadata,
  isDomainEvent,
  isChainRef,
  isBlockRef,
  isTokenRef,
  isOnChainEvent,
} from "./guards.js";
