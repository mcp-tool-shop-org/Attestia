/**
 * Tests for the account registry.
 *
 * Covers:
 * - Registration and retrieval
 * - Duplicate rejection
 * - Normal balance rules
 * - Type-based filtering
 * - Immutability enforcement
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { AccountRef } from "@attestia/types";
import { AccountRegistry } from "../src/accounts.js";
import { LedgerError } from "../src/types.js";

// ─── Fixtures ────────────────────────────────────────────────────────────

const CASH: AccountRef = { id: "cash", type: "asset", name: "Cash" };
const REVENUE: AccountRef = { id: "revenue", type: "income", name: "Revenue" };
const PAYABLE: AccountRef = { id: "ap", type: "liability", name: "Accounts Payable" };
const RENT: AccountRef = { id: "rent", type: "expense", name: "Rent Expense" };
const EQUITY: AccountRef = { id: "equity", type: "equity", name: "Owner Equity" };

const TS = "2024-01-01T00:00:00.000Z";

// ─── Tests ───────────────────────────────────────────────────────────────

describe("AccountRegistry", () => {
  let registry: AccountRegistry;

  beforeEach(() => {
    registry = new AccountRegistry();
  });

  describe("register", () => {
    it("registers an account and returns it", () => {
      const account = registry.register(CASH, TS);
      expect(account.ref.id).toBe("cash");
      expect(account.ref.type).toBe("asset");
      expect(account.ref.name).toBe("Cash");
      expect(account.createdAt).toBe(TS);
    });

    it("throws on duplicate account ID", () => {
      registry.register(CASH, TS);
      expect(() => registry.register(CASH, TS)).toThrow(LedgerError);
      expect(() => registry.register(CASH, TS)).toThrow(/already exists/);
    });

    it("allows different IDs with same type", () => {
      const bank: AccountRef = { id: "bank", type: "asset", name: "Bank" };
      registry.register(CASH, TS);
      expect(() => registry.register(bank, TS)).not.toThrow();
    });
  });

  describe("get / has", () => {
    it("returns undefined for unknown account", () => {
      expect(registry.get("nonexistent")).toBeUndefined();
    });

    it("returns account after registration", () => {
      registry.register(CASH, TS);
      const account = registry.get("cash");
      expect(account).toBeDefined();
      expect(account!.ref.id).toBe("cash");
    });

    it("has returns false for unknown account", () => {
      expect(registry.has("nonexistent")).toBe(false);
    });

    it("has returns true for registered account", () => {
      registry.register(CASH, TS);
      expect(registry.has("cash")).toBe(true);
    });
  });

  describe("assertExists", () => {
    it("returns account if it exists", () => {
      registry.register(CASH, TS);
      const account = registry.assertExists("cash");
      expect(account.ref.id).toBe("cash");
    });

    it("throws for unknown account", () => {
      expect(() => registry.assertExists("nonexistent")).toThrow(LedgerError);
      expect(() => registry.assertExists("nonexistent")).toThrow(/Unknown account/);
    });
  });

  describe("getType / getNormalBalance", () => {
    beforeEach(() => {
      registry.register(CASH, TS);
      registry.register(REVENUE, TS);
      registry.register(PAYABLE, TS);
      registry.register(RENT, TS);
      registry.register(EQUITY, TS);
    });

    it("returns correct type for each account", () => {
      expect(registry.getType("cash")).toBe("asset");
      expect(registry.getType("revenue")).toBe("income");
      expect(registry.getType("ap")).toBe("liability");
      expect(registry.getType("rent")).toBe("expense");
      expect(registry.getType("equity")).toBe("equity");
    });

    it("returns debit for asset and expense accounts", () => {
      expect(registry.getNormalBalance("cash")).toBe("debit");
      expect(registry.getNormalBalance("rent")).toBe("debit");
    });

    it("returns credit for liability, income, and equity accounts", () => {
      expect(registry.getNormalBalance("ap")).toBe("credit");
      expect(registry.getNormalBalance("revenue")).toBe("credit");
      expect(registry.getNormalBalance("equity")).toBe("credit");
    });

    it("throws when getting type of unknown account", () => {
      expect(() => registry.getType("nonexistent")).toThrow(LedgerError);
    });

    it("throws when getting normal balance of unknown account", () => {
      expect(() => registry.getNormalBalance("nonexistent")).toThrow(LedgerError);
    });
  });

  describe("getAll / count / getByType", () => {
    beforeEach(() => {
      registry.register(CASH, TS);
      registry.register(REVENUE, TS);
      registry.register(PAYABLE, TS);
      registry.register(RENT, TS);
      registry.register(EQUITY, TS);
    });

    it("returns all accounts", () => {
      const all = registry.getAll();
      expect(all).toHaveLength(5);
    });

    it("returns correct count", () => {
      expect(registry.count).toBe(5);
    });

    it("returns empty count for new registry", () => {
      const empty = new AccountRegistry();
      expect(empty.count).toBe(0);
    });

    it("filters by type", () => {
      const assets = registry.getByType("asset");
      expect(assets).toHaveLength(1);
      expect(assets[0]!.ref.id).toBe("cash");
    });

    it("returns empty array for type with no accounts", () => {
      const empty = new AccountRegistry();
      expect(empty.getByType("asset")).toHaveLength(0);
    });
  });
});
