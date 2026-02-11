/**
 * @attestia/ledger — Deterministic monetary arithmetic.
 *
 * All arithmetic uses bigint internally for precision.
 * String amounts are converted to/from bigint via decimal scaling.
 *
 * Rules:
 * - No floating-point operations
 * - Currency must match for all operations
 * - Amounts must be valid decimal strings
 * - Zero runtime dependencies
 */

import type { Money } from "@attestia/types";
import { LedgerError } from "./types.js";

// ─── Internal Helpers ────────────────────────────────────────────────────

/**
 * Parse a decimal string amount into a bigint scaled by decimals.
 *
 * "100.50" with decimals=2 → 10050n
 * "100" with decimals=6 → 100000000n
 * "-50.25" with decimals=2 → -5025n
 */
export function parseAmount(amount: string, decimals: number): bigint {
  if (typeof amount !== "string" || amount.trim() === "") {
    throw new LedgerError("INVALID_AMOUNT", `Invalid amount: "${String(amount)}"`);
  }

  const trimmed = amount.trim();

  // Validate format: optional minus, digits, optional decimal point + digits
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new LedgerError("INVALID_AMOUNT", `Invalid amount format: "${trimmed}"`);
  }

  const negative = trimmed.startsWith("-");
  const abs = negative ? trimmed.slice(1) : trimmed;
  const parts = abs.split(".");
  const intPart = parts[0] ?? "0";
  const fracPart = parts[1] ?? "";

  // Check that fractional part doesn't exceed allowed decimals
  if (fracPart.length > decimals) {
    throw new LedgerError(
      "INVALID_AMOUNT",
      `Amount "${trimmed}" has ${String(fracPart.length)} decimal places, but currency allows ${String(decimals)}`,
    );
  }

  // Pad or truncate fractional part to exact decimal places
  const paddedFrac = fracPart.padEnd(decimals, "0");
  const combined = intPart + paddedFrac;
  const value = BigInt(combined);

  return negative ? -value : value;
}

/**
 * Convert a scaled bigint back to a decimal string.
 *
 * 10050n with decimals=2 → "100.50"
 * 100000000n with decimals=6 → "100.000000"
 * -5025n with decimals=2 → "-50.25"
 */
export function formatAmount(scaled: bigint, decimals: number): string {
  if (decimals === 0) {
    return scaled.toString();
  }

  const negative = scaled < 0n;
  const abs = negative ? -scaled : scaled;
  const str = abs.toString().padStart(decimals + 1, "0");
  const intPart = str.slice(0, str.length - decimals);
  const fracPart = str.slice(str.length - decimals);
  const result = `${intPart}.${fracPart}`;

  return negative ? `-${result}` : result;
}

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Validate that a Money object is well-formed.
 * Throws LedgerError if invalid.
 */
export function validateMoney(money: Money): void {
  if (typeof money.amount !== "string" || money.amount.trim() === "") {
    throw new LedgerError("INVALID_MONEY", `Money amount must be a non-empty string, got: "${String(money.amount)}"`);
  }

  if (typeof money.currency !== "string" || money.currency.trim() === "") {
    throw new LedgerError("INVALID_MONEY", `Money currency must be a non-empty string, got: "${String(money.currency)}"`);
  }

  if (typeof money.decimals !== "number" || !Number.isInteger(money.decimals) || money.decimals < 0) {
    throw new LedgerError("INVALID_MONEY", `Money decimals must be a non-negative integer, got: ${String(money.decimals)}`);
  }

  // Validate the amount can be parsed
  parseAmount(money.amount, money.decimals);
}

/**
 * Assert two Money values have the same currency and decimals.
 * Throws LedgerError if they differ.
 */
export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new LedgerError(
      "CURRENCY_MISMATCH",
      `Cannot operate on different currencies: "${a.currency}" vs "${b.currency}"`,
    );
  }
  if (a.decimals !== b.decimals) {
    throw new LedgerError(
      "CURRENCY_MISMATCH",
      `Decimal mismatch for currency "${a.currency}": ${String(a.decimals)} vs ${String(b.decimals)}`,
    );
  }
}

/**
 * Add two Money values. They must have the same currency.
 */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const sum = parseAmount(a.amount, a.decimals) + parseAmount(b.amount, b.decimals);
  return {
    amount: formatAmount(sum, a.decimals),
    currency: a.currency,
    decimals: a.decimals,
  };
}

/**
 * Subtract b from a. They must have the same currency.
 */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  const diff = parseAmount(a.amount, a.decimals) - parseAmount(b.amount, b.decimals);
  return {
    amount: formatAmount(diff, a.decimals),
    currency: a.currency,
    decimals: a.decimals,
  };
}

/**
 * Check if a Money amount is zero.
 */
export function isZero(money: Money): boolean {
  return parseAmount(money.amount, money.decimals) === 0n;
}

/**
 * Check if a Money amount is positive (> 0).
 */
export function isPositive(money: Money): boolean {
  return parseAmount(money.amount, money.decimals) > 0n;
}

/**
 * Check if a Money amount is negative (< 0).
 */
export function isNegative(money: Money): boolean {
  return parseAmount(money.amount, money.decimals) < 0n;
}

/**
 * Create a zero Money value for a given currency.
 */
export function zeroMoney(currency: string, decimals: number): Money {
  return {
    amount: formatAmount(0n, decimals),
    currency,
    decimals,
  };
}

/**
 * Compare two Money values. Returns -1, 0, or 1.
 * They must have the same currency.
 */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  const va = parseAmount(a.amount, a.decimals);
  const vb = parseAmount(b.amount, b.decimals);
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

/**
 * Return the absolute value of a Money amount.
 */
export function absMoney(money: Money): Money {
  const scaled = parseAmount(money.amount, money.decimals);
  const abs = scaled < 0n ? -scaled : scaled;
  return {
    amount: formatAmount(abs, money.decimals),
    currency: money.currency,
    decimals: money.decimals,
  };
}
