/**
 * Solana-Specific Chain Types
 *
 * Extensions to the base chain observation primitives for Solana's
 * unique concepts: slots (not blocks), program accounts, signatures.
 *
 * Rules:
 * - All types are immutable (readonly)
 * - These extend, not replace, the base chain types
 * - Solana events satisfy base OnChainEvent via structural typing
 */

import type { OnChainEvent } from "./chain.js";

// =============================================================================
// Solana Primitives
// =============================================================================

/**
 * Solana account public key (base58-encoded).
 */
export type SolanaAccountKey = string;

/**
 * Solana transaction signature (base58-encoded, 88 characters).
 */
export type SolanaSignature = string;

/**
 * Solana commitment level for RPC queries.
 *
 * - processed: Transaction processed by leader, no confirmation
 * - confirmed: Transaction confirmed by supermajority of stake
 * - finalized: Transaction finalized (cannot be rolled back)
 */
export type SolanaCommitment = "processed" | "confirmed" | "finalized";

// =============================================================================
// Solana Slot Reference
// =============================================================================

/**
 * Reference to a specific Solana slot.
 *
 * Solana uses slots rather than blocks. Each slot may or may not contain
 * a block (skipped slots are possible). Block time is Unix timestamp.
 */
export interface SolanaSlotRef {
  /** Slot number */
  readonly slot: number;

  /** Unix timestamp of the block in this slot (null for skipped slots) */
  readonly blockTime: number | null;

  /** Commitment level at which this slot was observed */
  readonly commitment: SolanaCommitment;
}

// =============================================================================
// Solana On-Chain Event
// =============================================================================

/**
 * An observed on-chain event from the Solana network.
 *
 * Extends the base OnChainEvent with Solana-specific metadata:
 * - slot: The slot number (Solana's equivalent of block number)
 * - programId: The program that emitted this event
 * - accountKeys: All accounts involved in the instruction
 * - signature: The transaction signature
 *
 * Structural typing ensures this satisfies OnChainEvent.
 */
export interface SolanaOnChainEvent extends OnChainEvent {
  /** Solana slot number */
  readonly slot: number;

  /** Program ID that emitted this event */
  readonly programId: string;

  /** Account public keys involved in the instruction */
  readonly accountKeys: readonly string[];

  /** Transaction signature (base58) */
  readonly signature: string;
}

// =============================================================================
// Solana Transfer Event Extension
// =============================================================================

/**
 * Solana-specific metadata that can be attached to a TransferEvent.
 *
 * Not a separate type — this documents the additional fields that
 * a Solana TransferEvent carries in its data.
 */
export interface SolanaTransferMeta {
  /** Slot number */
  readonly slot: number;

  /** Transaction signature */
  readonly signature: SolanaSignature;

  /** Program that processed the transfer (System Program for SOL, Token Program for SPL) */
  readonly programId: string;

  /** Pre-transaction balance of sender (lamports) */
  readonly preBalance?: string;

  /** Post-transaction balance of sender (lamports) */
  readonly postBalance?: string;
}
