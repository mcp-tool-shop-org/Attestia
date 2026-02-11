/**
 * Financial Types
 *
 * Core financial primitives for deterministic accounting.
 * Ported from payroll-engine concepts, simplified for web3.
 *
 * Rules:
 * - All amounts are strings to avoid floating-point errors
 * - Currency is always explicit (no implicit USD)
 * - Ledger entries are append-only by contract
 */

/**
 * Supported currency identifiers.
 * Token symbols for crypto, ISO 4217 codes for reference.
 */
export type Currency = string;

/**
 * A precise monetary amount.
 * String representation to avoid IEEE 754 floating-point issues.
 * Use a bigint or decimal library for arithmetic.
 */
export interface Money {
  /** String representation of the amount (e.g., "100.50", "1000000") */
  readonly amount: string;

  /** Currency symbol or identifier (e.g., "USDC", "XRP", "RLUSD") */
  readonly currency: Currency;

  /**
   * Number of decimal places for this currency.
   * XRP = 6 (drops), USDC = 6, ETH = 18 (wei).
   */
  readonly decimals: number;
}

/**
 * Reference to an account in the ledger.
 */
export interface AccountRef {
  /** Unique account identifier */
  readonly id: string;

  /** Account type (asset, liability, income, expense, equity) */
  readonly type: "asset" | "liability" | "income" | "expense" | "equity";

  /** Human-readable name */
  readonly name: string;
}

/**
 * Type of ledger entry (double-entry accounting).
 */
export type LedgerEntryType = "debit" | "credit";

/**
 * A single line in the ledger.
 * Always part of a balanced transaction (debits = credits).
 */
export interface LedgerEntry {
  /** Unique entry identifier */
  readonly id: string;

  /** Which account this entry affects */
  readonly accountId: string;

  /** Debit or credit */
  readonly type: LedgerEntryType;

  /** The amount */
  readonly money: Money;

  /** ISO 8601 timestamp */
  readonly timestamp: string;

  /** Reference to the intent that caused this entry */
  readonly intentId?: string;

  /** Reference to the on-chain transaction */
  readonly txHash?: string;

  /** Correlation ID for grouping related entries */
  readonly correlationId: string;
}
