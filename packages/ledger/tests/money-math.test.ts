/**
 * Tests for the deterministic money math engine.
 *
 * Covers:
 * - parseAmount / formatAmount round-trip
 * - Arithmetic operations (add, subtract, compare)
 * - Validation and error cases
 * - Edge cases (zero, negative, large values)
 * - Currency safety (cross-currency rejection)
 */

import { describe, it, expect } from "vitest";
import type { Money } from "@attestia/types";
import {
  parseAmount,
  formatAmount,
  validateMoney,
  assertSameCurrency,
  addMoney,
  subtractMoney,
  isZero,
  isPositive,
  isNegative,
  zeroMoney,
  compareMoney,
  absMoney,
} from "../src/money-math.js";
import { LedgerError } from "../src/types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────

function money(amount: string, currency = "USDC", decimals = 6): Money {
  return { amount, currency, decimals };
}

// ─── parseAmount ─────────────────────────────────────────────────────────

describe("parseAmount", () => {
  it("parses a whole number", () => {
    expect(parseAmount("100", 6)).toBe(100_000_000n);
  });

  it("parses a decimal number", () => {
    expect(parseAmount("100.50", 2)).toBe(10050n);
  });

  it("parses zero", () => {
    expect(parseAmount("0", 6)).toBe(0n);
  });

  it("parses zero with decimals", () => {
    expect(parseAmount("0.000000", 6)).toBe(0n);
  });

  it("parses a negative number", () => {
    expect(parseAmount("-50.25", 2)).toBe(-5025n);
  });

  it("pads fractional part when shorter than decimals", () => {
    expect(parseAmount("1.5", 6)).toBe(1_500_000n);
  });

  it("handles zero decimals", () => {
    expect(parseAmount("42", 0)).toBe(42n);
  });

  it("handles large amounts (18 decimals like ETH)", () => {
    expect(parseAmount("1.000000000000000001", 18)).toBe(1_000_000_000_000_000_001n);
  });

  it("rejects empty string", () => {
    expect(() => parseAmount("", 6)).toThrow(LedgerError);
  });

  it("rejects whitespace-only", () => {
    expect(() => parseAmount("   ", 6)).toThrow(LedgerError);
  });

  it("rejects non-numeric", () => {
    expect(() => parseAmount("abc", 6)).toThrow(LedgerError);
  });

  it("rejects excess decimal places", () => {
    expect(() => parseAmount("1.1234567", 6)).toThrow(LedgerError);
  });

  it("rejects double decimal points", () => {
    expect(() => parseAmount("1.2.3", 6)).toThrow(LedgerError);
  });

  it("rejects leading plus sign", () => {
    expect(() => parseAmount("+100", 6)).toThrow(LedgerError);
  });
});

// ─── formatAmount ────────────────────────────────────────────────────────

describe("formatAmount", () => {
  it("formats a whole number with decimals", () => {
    expect(formatAmount(100_000_000n, 6)).toBe("100.000000");
  });

  it("formats a fractional amount", () => {
    expect(formatAmount(10050n, 2)).toBe("100.50");
  });

  it("formats zero", () => {
    expect(formatAmount(0n, 6)).toBe("0.000000");
  });

  it("formats negative amount", () => {
    expect(formatAmount(-5025n, 2)).toBe("-50.25");
  });

  it("formats zero decimals", () => {
    expect(formatAmount(42n, 0)).toBe("42");
  });

  it("formats sub-unit amount (less than 1.0)", () => {
    expect(formatAmount(500n, 6)).toBe("0.000500");
  });

  it("round-trips with parseAmount", () => {
    const original = "123.456789";
    const parsed = parseAmount(original, 6);
    expect(formatAmount(parsed, 6)).toBe(original);
  });
});

// ─── validateMoney ───────────────────────────────────────────────────────

describe("validateMoney", () => {
  it("accepts valid money", () => {
    expect(() => validateMoney(money("100.00"))).not.toThrow();
  });

  it("rejects empty amount", () => {
    expect(() => validateMoney(money(""))).toThrow(LedgerError);
  });

  it("rejects empty currency", () => {
    expect(() => validateMoney({ amount: "100", currency: "", decimals: 6 })).toThrow(LedgerError);
  });

  it("rejects negative decimals", () => {
    expect(() => validateMoney({ amount: "100", currency: "USDC", decimals: -1 })).toThrow(LedgerError);
  });

  it("rejects non-integer decimals", () => {
    expect(() => validateMoney({ amount: "100", currency: "USDC", decimals: 1.5 })).toThrow(LedgerError);
  });

  it("rejects invalid amount format", () => {
    expect(() => validateMoney(money("abc"))).toThrow(LedgerError);
  });
});

// ─── assertSameCurrency ──────────────────────────────────────────────────

describe("assertSameCurrency", () => {
  it("accepts same currency and decimals", () => {
    expect(() => assertSameCurrency(money("10"), money("20"))).not.toThrow();
  });

  it("rejects different currencies", () => {
    expect(() => assertSameCurrency(money("10", "USDC"), money("20", "XRP"))).toThrow(LedgerError);
    expect(() => assertSameCurrency(money("10", "USDC"), money("20", "XRP"))).toThrow(/different currencies/);
  });

  it("rejects different decimals for same currency", () => {
    const a: Money = { amount: "10", currency: "USDC", decimals: 6 };
    const b: Money = { amount: "20", currency: "USDC", decimals: 2 };
    expect(() => assertSameCurrency(a, b)).toThrow(LedgerError);
  });
});

// ─── Arithmetic ──────────────────────────────────────────────────────────

describe("addMoney", () => {
  it("adds two positive amounts", () => {
    const result = addMoney(money("100.000000"), money("50.500000"));
    expect(result.amount).toBe("150.500000");
    expect(result.currency).toBe("USDC");
    expect(result.decimals).toBe(6);
  });

  it("adds zero", () => {
    const result = addMoney(money("100.000000"), money("0.000000"));
    expect(result.amount).toBe("100.000000");
  });

  it("rejects cross-currency addition", () => {
    expect(() => addMoney(money("10", "USDC"), money("10", "XRP"))).toThrow(LedgerError);
  });
});

describe("subtractMoney", () => {
  it("subtracts a smaller from a larger", () => {
    const result = subtractMoney(money("100.000000"), money("30.000000"));
    expect(result.amount).toBe("70.000000");
  });

  it("subtracts equal amounts to zero", () => {
    const result = subtractMoney(money("50.000000"), money("50.000000"));
    expect(result.amount).toBe("0.000000");
  });

  it("produces negative result", () => {
    const result = subtractMoney(money("10.000000"), money("30.000000"));
    expect(result.amount).toBe("-20.000000");
  });

  it("rejects cross-currency subtraction", () => {
    expect(() => subtractMoney(money("10", "USDC"), money("10", "XRP"))).toThrow(LedgerError);
  });
});

// ─── Comparison & Predicates ─────────────────────────────────────────────

describe("compareMoney", () => {
  it("returns 0 for equal amounts", () => {
    expect(compareMoney(money("100.000000"), money("100.000000"))).toBe(0);
  });

  it("returns -1 when a < b", () => {
    expect(compareMoney(money("50.000000"), money("100.000000"))).toBe(-1);
  });

  it("returns 1 when a > b", () => {
    expect(compareMoney(money("100.000000"), money("50.000000"))).toBe(1);
  });

  it("rejects cross-currency comparison", () => {
    expect(() => compareMoney(money("10", "USDC"), money("10", "XRP"))).toThrow(LedgerError);
  });
});

describe("isZero / isPositive / isNegative", () => {
  it("identifies zero", () => {
    expect(isZero(money("0.000000"))).toBe(true);
    expect(isZero(money("0"))).toBe(true);
    expect(isZero(money("1.000000"))).toBe(false);
  });

  it("identifies positive", () => {
    expect(isPositive(money("1.000000"))).toBe(true);
    expect(isPositive(money("0.000000"))).toBe(false);
    expect(isPositive(money("-1.000000"))).toBe(false);
  });

  it("identifies negative", () => {
    expect(isNegative(money("-1.000000"))).toBe(true);
    expect(isNegative(money("0.000000"))).toBe(false);
    expect(isNegative(money("1.000000"))).toBe(false);
  });
});

describe("zeroMoney", () => {
  it("creates a zero money in the given currency", () => {
    const z = zeroMoney("USDC", 6);
    expect(z.amount).toBe("0.000000");
    expect(z.currency).toBe("USDC");
    expect(z.decimals).toBe(6);
    expect(isZero(z)).toBe(true);
  });
});

describe("absMoney", () => {
  it("returns positive for negative", () => {
    const result = absMoney(money("-50.000000"));
    expect(result.amount).toBe("50.000000");
  });

  it("returns same for positive", () => {
    const result = absMoney(money("50.000000"));
    expect(result.amount).toBe("50.000000");
  });

  it("returns zero for zero", () => {
    const result = absMoney(money("0.000000"));
    expect(result.amount).toBe("0.000000");
  });
});
