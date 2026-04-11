/**
 * Property-Based Tests for @attestia/ledger
 *
 * Uses fast-check to verify invariants that must hold for ANY valid input:
 *
 * 1. Trial balance always balances (debits = credits per currency)
 * 2. No value from nothing (conservation of money)
 * 3. Append idempotency (snapshot → restore → snapshot is identical)
 * 4. Bigint arithmetic roundtrip (parse → format → parse = identity)
 * 5. Money addition is commutative and associative
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { AccountRef, LedgerEntry, Money } from "@attestia/types";
import { Ledger } from "../src/ledger.js";
import {
  parseAmount,
  formatAmount,
  addMoney,
  subtractMoney,
  isZero,
  zeroMoney,
} from "../src/money-math.js";

// =============================================================================
// Arbitraries
// =============================================================================

const accountTypes = ["asset", "liability", "income", "expense", "equity"] as const;

/** Generate a valid account type. */
const arbAccountType = fc.constantFrom(...accountTypes);

/** Generate a valid decimal count (0-18, typical for crypto). */
const arbDecimals = fc.integer({ min: 0, max: 18 });

/** Generate a valid currency code. */
const arbCurrency = fc.stringMatching(/^[A-Z]{3,5}$/);

/**
 * Generate a valid positive amount string with the given decimals.
 * Avoids trivially large numbers that would be slow.
 */
function arbPositiveAmount(decimals: number): fc.Arbitrary<string> {
  const intPart = fc.integer({ min: 1, max: 999_999_999 });
  const fracPart =
    decimals > 0
      ? fc.integer({ min: 0, max: 10 ** Math.min(decimals, 9) - 1 }).map((f) =>
          f.toString().padStart(Math.min(decimals, 9), "0").slice(0, decimals),
        )
      : fc.constant("");

  return fc.tuple(intPart, fracPart).map(([int, frac]) =>
    frac ? `${int}.${frac}` : `${int}`,
  );
}

/**
 * Generate a valid Money object with positive amount.
 */
const arbPositiveMoney: fc.Arbitrary<Money> = fc.tuple(arbDecimals, arbCurrency).chain(
  ([decimals, currency]) =>
    arbPositiveAmount(decimals).map((amount) => ({
      amount,
      currency,
      decimals,
    })),
);

/**
 * Generate a Money object with a fixed currency/decimals for arithmetic tests.
 */
function arbMoneyWithSpec(currency: string, decimals: number): fc.Arbitrary<Money> {
  return arbPositiveAmount(decimals).map((amount) => ({
    amount,
    currency,
    decimals,
  }));
}

// =============================================================================
// Ledger Builder Helpers
// =============================================================================

interface BalancedTransaction {
  accounts: { debit: AccountRef; credit: AccountRef };
  entries: LedgerEntry[];
}

let txCounter = 0;

function resetCounter(): void {
  txCounter = 0;
}

/**
 * Build a balanced transaction (1 debit entry + 1 credit entry).
 */
function makeBalancedTx(
  debitAccountId: string,
  creditAccountId: string,
  money: Money,
): LedgerEntry[] {
  txCounter++;
  const corrId = `tx-${txCounter}`;
  const ts = `2025-01-01T00:00:${String(txCounter).padStart(2, "0")}Z`;

  return [
    {
      id: `entry-${txCounter}-d`,
      accountId: debitAccountId,
      type: "debit",
      money,
      timestamp: ts,
      correlationId: corrId,
    },
    {
      id: `entry-${txCounter}-c`,
      accountId: creditAccountId,
      type: "credit",
      money,
      timestamp: ts,
      correlationId: corrId,
    },
  ];
}

// =============================================================================
// Property: Trial Balance Always Balances
// =============================================================================

describe("property: trial balance always balances", () => {
  it("after any sequence of valid balanced appends, trial balance is balanced", () => {
    fc.assert(
      fc.property(
        // Generate 1-10 transactions, each with a positive Money
        fc.array(arbPositiveMoney, { minLength: 1, maxLength: 10 }),
        (monies) => {
          resetCounter();
          const ledger = new Ledger();

          // Register two accounts: asset (debit-normal) and liability (credit-normal)
          ledger.registerAccount(
            { id: "cash", type: "asset", name: "Cash" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "loan", type: "liability", name: "Loan" },
            "2025-01-01T00:00:00Z",
          );

          for (const money of monies) {
            const entries = makeBalancedTx("cash", "loan", money);
            ledger.append(entries);
          }

          const tb = ledger.getTrialBalance("2025-12-31T00:00:00Z");
          expect(tb.balanced).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("with multiple currency types, each currency independently balances", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.constantFrom("USD", "EUR", "XRP"),
            fc.integer({ min: 1, max: 999_999 }),
          ),
          { minLength: 1, maxLength: 15 },
        ),
        (txSpecs) => {
          resetCounter();
          const ledger = new Ledger();

          ledger.registerAccount(
            { id: "cash", type: "asset", name: "Cash" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "revenue", type: "income", name: "Revenue" },
            "2025-01-01T00:00:00Z",
          );

          for (const [currency, amountInt] of txSpecs) {
            const decimals = currency === "XRP" ? 6 : 2;
            const money: Money = {
              amount: formatAmount(BigInt(amountInt), decimals),
              currency,
              decimals,
            };
            const entries = makeBalancedTx("cash", "revenue", money);
            ledger.append(entries);
          }

          const tb = ledger.getTrialBalance("2025-12-31T00:00:00Z");
          expect(tb.balanced).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// =============================================================================
// Property: No Value from Nothing
// =============================================================================

describe("property: no value from nothing (conservation)", () => {
  it("sum of all debits equals sum of all credits per currency", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1_000_000 }),
          { minLength: 1, maxLength: 20 },
        ),
        (amounts) => {
          resetCounter();
          const ledger = new Ledger();

          ledger.registerAccount(
            { id: "a", type: "asset", name: "A" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "b", type: "expense", name: "B" },
            "2025-01-01T00:00:00Z",
          );

          for (const amt of amounts) {
            const money: Money = {
              amount: formatAmount(BigInt(amt), 2),
              currency: "USD",
              decimals: 2,
            };
            ledger.append(makeBalancedTx("a", "b", money));
          }

          const entries = ledger.getEntries();
          let totalDebits = 0n;
          let totalCredits = 0n;
          for (const e of entries) {
            const scaled = parseAmount(e.money.amount, e.money.decimals);
            if (e.type === "debit") totalDebits += scaled;
            else totalCredits += scaled;
          }

          expect(totalDebits).toBe(totalCredits);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("unbalanced transactions are always rejected", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 999_999 }),
        fc.integer({ min: 1, max: 999_999 }),
        (debitAmt, creditAmt) => {
          // Only test when amounts differ (unbalanced)
          fc.pre(debitAmt !== creditAmt);

          resetCounter();
          const ledger = new Ledger();

          ledger.registerAccount(
            { id: "a", type: "asset", name: "A" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "b", type: "liability", name: "B" },
            "2025-01-01T00:00:00Z",
          );

          const entries: LedgerEntry[] = [
            {
              id: "e1",
              accountId: "a",
              type: "debit",
              money: { amount: formatAmount(BigInt(debitAmt), 2), currency: "USD", decimals: 2 },
              timestamp: "2025-01-01T00:00:00Z",
              correlationId: "tx-unbalanced",
            },
            {
              id: "e2",
              accountId: "b",
              type: "credit",
              money: { amount: formatAmount(BigInt(creditAmt), 2), currency: "USD", decimals: 2 },
              timestamp: "2025-01-01T00:00:00Z",
              correlationId: "tx-unbalanced",
            },
          ];

          expect(() => ledger.append(entries)).toThrow("unbalanced");
        },
      ),
      { numRuns: 200 },
    );
  });
});

// =============================================================================
// Property: Snapshot Roundtrip Idempotency
// =============================================================================

describe("property: snapshot → restore → snapshot is idempotent", () => {
  it("roundtrip preserves all entries and balances", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 1_000_000 }),
          { minLength: 1, maxLength: 10 },
        ),
        (amounts) => {
          resetCounter();
          const ledger = new Ledger();

          ledger.registerAccount(
            { id: "cash", type: "asset", name: "Cash" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "equity", type: "equity", name: "Equity" },
            "2025-01-01T00:00:00Z",
          );

          for (const amt of amounts) {
            const money: Money = {
              amount: formatAmount(BigInt(amt), 2),
              currency: "USD",
              decimals: 2,
            };
            ledger.append(makeBalancedTx("cash", "equity", money));
          }

          const snap1 = ledger.snapshot();
          const restored = Ledger.fromSnapshot(snap1);
          const snap2 = restored.snapshot();

          // Structural equality (ignoring createdAt timestamps on snapshots)
          expect(snap2.version).toBe(snap1.version);
          expect(snap2.accounts.length).toBe(snap1.accounts.length);
          expect(snap2.entries.length).toBe(snap1.entries.length);

          // Every entry is identical
          for (let i = 0; i < snap1.entries.length; i++) {
            expect(snap2.entries[i]!.id).toBe(snap1.entries[i]!.id);
            expect(snap2.entries[i]!.accountId).toBe(snap1.entries[i]!.accountId);
            expect(snap2.entries[i]!.type).toBe(snap1.entries[i]!.type);
            expect(snap2.entries[i]!.money).toEqual(snap1.entries[i]!.money);
          }

          // Balances match
          const bal1 = ledger.getTrialBalance("2025-12-31T00:00:00Z");
          const bal2 = restored.getTrialBalance("2025-12-31T00:00:00Z");
          expect(bal2.balanced).toBe(bal1.balanced);
          expect(bal2.lines.length).toBe(bal1.lines.length);
          for (let i = 0; i < bal1.lines.length; i++) {
            expect(bal2.lines[i]!.debitBalance).toBe(bal1.lines[i]!.debitBalance);
            expect(bal2.lines[i]!.creditBalance).toBe(bal1.lines[i]!.creditBalance);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property: Bigint Arithmetic Roundtrip
// =============================================================================

describe("property: parseAmount ↔ formatAmount roundtrip", () => {
  it("parse(format(n, d), d) === n for any bigint n and decimals d", () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: -999_999_999_999n, max: 999_999_999_999n }),
        fc.integer({ min: 0, max: 12 }),
        (scaled, decimals) => {
          const formatted = formatAmount(scaled, decimals);
          const reparsed = parseAmount(formatted, decimals);
          expect(reparsed).toBe(scaled);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("format(parse(s, d), d) produces valid decimal for well-formed inputs", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        (decimals) => {
          return fc.assert(
            fc.property(
              arbPositiveAmount(decimals),
              (amountStr) => {
                const parsed = parseAmount(amountStr, decimals);
                const reformatted = formatAmount(parsed, decimals);
                const reparsed = parseAmount(reformatted, decimals);
                expect(reparsed).toBe(parsed);
              },
            ),
            { numRuns: 50 },
          );
        },
      ),
      { numRuns: 10 },
    );
  });
});

// =============================================================================
// Property: Money Addition is Commutative and Associative
// =============================================================================

describe("property: money arithmetic laws", () => {
  it("addition is commutative: a + b = b + a", () => {
    fc.assert(
      fc.property(
        arbMoneyWithSpec("USD", 2),
        arbMoneyWithSpec("USD", 2),
        (a, b) => {
          const ab = addMoney(a, b);
          const ba = addMoney(b, a);
          expect(ab.amount).toBe(ba.amount);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("addition is associative: (a + b) + c = a + (b + c)", () => {
    fc.assert(
      fc.property(
        arbMoneyWithSpec("USD", 2),
        arbMoneyWithSpec("USD", 2),
        arbMoneyWithSpec("USD", 2),
        (a, b, c) => {
          const lhs = addMoney(addMoney(a, b), c);
          const rhs = addMoney(a, addMoney(b, c));
          expect(lhs.amount).toBe(rhs.amount);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("zero is the identity: a + 0 = a", () => {
    fc.assert(
      fc.property(
        arbMoneyWithSpec("USD", 2),
        (a) => {
          const zero = zeroMoney("USD", 2);
          const result = addMoney(a, zero);
          expect(result.amount).toBe(a.amount);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("subtraction is the inverse of addition: (a + b) - b = a", () => {
    fc.assert(
      fc.property(
        arbMoneyWithSpec("USD", 2),
        arbMoneyWithSpec("USD", 2),
        (a, b) => {
          const sum = addMoney(a, b);
          const diff = subtractMoney(sum, b);
          expect(diff.amount).toBe(a.amount);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("a - a = zero", () => {
    fc.assert(
      fc.property(
        arbMoneyWithSpec("USD", 6),
        (a) => {
          const diff = subtractMoney(a, a);
          expect(isZero(diff)).toBe(true);
        },
      ),
      { numRuns: 500 },
    );
  });
});

// =============================================================================
// Property: Entry Count Monotonically Increases
// =============================================================================

describe("property: append-only ledger growth", () => {
  it("entry count only increases, never decreases", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 1, max: 100_000 }),
          { minLength: 2, maxLength: 15 },
        ),
        (amounts) => {
          resetCounter();
          const ledger = new Ledger();

          ledger.registerAccount(
            { id: "a", type: "asset", name: "A" },
            "2025-01-01T00:00:00Z",
          );
          ledger.registerAccount(
            { id: "b", type: "liability", name: "B" },
            "2025-01-01T00:00:00Z",
          );

          let prevCount = 0;
          for (const amt of amounts) {
            const money: Money = {
              amount: formatAmount(BigInt(amt), 2),
              currency: "USD",
              decimals: 2,
            };
            ledger.append(makeBalancedTx("a", "b", money));
            const newCount = ledger.entryCount;
            expect(newCount).toBeGreaterThan(prevCount);
            prevCount = newCount;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
