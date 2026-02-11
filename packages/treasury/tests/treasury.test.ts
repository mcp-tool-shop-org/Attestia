/**
 * Tests for Treasury — top-level coordinator.
 *
 * Integration tests verifying Payroll, Distribution, and Funding
 * all coordinate through the Treasury with ledger recording.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Treasury } from "../src/treasury.js";
import type { Money } from "@attestia/types";
import type { TreasuryConfig } from "../src/types.js";

function usdc(amount: string): Money {
  return { amount, currency: "USDC", decimals: 6 };
}

const CONFIG: TreasuryConfig = {
  orgId: "org-1",
  name: "Attestia DAO Treasury",
  defaultCurrency: "USDC",
  defaultDecimals: 6,
  gatekeepers: ["cfo", "ceo"],
};

describe("Treasury", () => {
  let treasury: Treasury;

  beforeEach(() => {
    treasury = new Treasury(CONFIG);
  });

  // ─── Payroll via Treasury ─────────────────────────────────────────

  describe("payroll", () => {
    it("create → approve → execute payroll run", () => {
      treasury.registerPayee("p-1", "Alice", "0xAlice");
      treasury.setPaySchedule("p-1", [
        {
          id: "base",
          name: "Base Salary",
          type: "base",
          amount: usdc("5000"),
          recurring: true,
          taxable: true,
        },
      ]);

      const run = treasury.createPayrollRun("run-1", {
        start: "2024-01-01",
        end: "2024-01-31",
        label: "2024-Jan",
      });

      expect(run.status).toBe("draft");
      expect(run.entries.length).toBe(1);

      treasury.approvePayrollRun("run-1");
      const executed = treasury.executePayrollRun("run-1");

      expect(executed.status).toBe("executed");

      // Verify ledger
      const ledgerEntries = treasury.getLedger().getEntries();
      expect(ledgerEntries.length).toBe(2); // 1 payee × 2 entries
    });
  });

  // ─── Distribution via Treasury ────────────────────────────────────

  describe("distribution", () => {
    it("create → approve → execute distribution", () => {
      treasury.createDistribution(
        "d-1",
        "Q1 Revenue Share",
        "proportional",
        usdc("10000"),
        [
          { payeeId: "p-1", share: 5000 },
          { payeeId: "p-2", share: 5000 },
        ],
      );

      treasury.approveDistribution("d-1");

      const result = treasury.executeDistribution("d-1");

      expect(result.payouts.length).toBe(2);
      expect(result.payouts[0]!.amount.amount).toBe("5000.000000");
      expect(result.payouts[1]!.amount.amount).toBe("5000.000000");

      const ledgerEntries = treasury.getLedger().getEntries();
      expect(ledgerEntries.length).toBe(4); // 2 recipients × 2 entries
    });

    it("compute without executing", () => {
      treasury.createDistribution(
        "d-1",
        "Test",
        "proportional",
        usdc("1000"),
        [{ payeeId: "p-1", share: 10000 }],
      );

      const result = treasury.computeDistribution("d-1");
      expect(result.payouts[0]!.amount.amount).toBe("1000.000000");

      // Ledger should be empty (not executed)
      expect(treasury.getLedger().getEntries().length).toBe(0);
    });
  });

  // ─── Funding via Treasury ─────────────────────────────────────────

  describe("funding", () => {
    it("submit → dual-gate approve → execute funding", () => {
      treasury.submitFunding(
        "f-1",
        "Office equipment",
        usdc("2000"),
        "alice",
      );

      treasury.approveFundingGate("f-1", "cfo", "Budget available");
      const request = treasury.approveFundingGate("f-1", "ceo", "Approved");

      expect(request.status).toBe("approved");

      treasury.executeFunding("f-1");

      const ledgerEntries = treasury.getLedger().getEntries();
      expect(ledgerEntries.length).toBe(2); // 1 request × 2 entries
    });

    it("rejects funding request", () => {
      treasury.submitFunding("f-1", "Yacht", usdc("1000000"), "mallory");
      const rejected = treasury.rejectFunding("f-1", "cfo", "Not in budget");

      expect(rejected.status).toBe("rejected");
    });
  });

  // ─── Snapshot ─────────────────────────────────────────────────────

  describe("snapshot", () => {
    it("captures full treasury state", () => {
      treasury.registerPayee("p-1", "Alice", "0xAlice");
      treasury.submitFunding("f-1", "Test", usdc("100"), "alice");

      const snap = treasury.snapshot();

      expect(snap.version).toBe(1);
      expect(snap.config.orgId).toBe("org-1");
      expect(snap.payees.length).toBe(1);
      expect(snap.fundingRequests.length).toBe(1);
    });

    it("restores from snapshot", () => {
      treasury.registerPayee("p-1", "Alice", "0xAlice");
      treasury.submitFunding("f-1", "Test", usdc("100"), "alice");

      const snap = treasury.snapshot();
      const restored = Treasury.fromSnapshot(snap);

      const snap2 = restored.snapshot();
      expect(snap2.payees.length).toBe(1);
      expect(snap2.fundingRequests.length).toBe(1);
    });
  });

  // ─── Combined flow ────────────────────────────────────────────────

  describe("combined flow", () => {
    it("payroll + distribution + funding all record to same ledger", () => {
      // 1. Payroll
      treasury.registerPayee("p-1", "Alice", "0xAlice");
      treasury.setPaySchedule("p-1", [
        {
          id: "base",
          name: "Salary",
          type: "base",
          amount: usdc("5000"),
          recurring: true,
          taxable: true,
        },
      ]);
      treasury.createPayrollRun("run-1", {
        start: "2024-01-01",
        end: "2024-01-31",
        label: "2024-Jan",
      });
      treasury.approvePayrollRun("run-1");
      treasury.executePayrollRun("run-1");

      // 2. Distribution
      treasury.createDistribution(
        "d-1",
        "Bonus",
        "proportional",
        usdc("1000"),
        [{ payeeId: "p-1", share: 10000 }],
      );
      treasury.approveDistribution("d-1");
      treasury.executeDistribution("d-1");

      // 3. Funding
      treasury.submitFunding("f-1", "Equipment", usdc("500"), "alice");
      treasury.approveFundingGate("f-1", "cfo");
      treasury.approveFundingGate("f-1", "ceo");
      treasury.executeFunding("f-1");

      // All recorded in the same ledger
      const entries = treasury.getLedger().getEntries();
      // Payroll: 2 entries, Distribution: 2 entries, Funding: 2 entries
      expect(entries.length).toBe(6);
    });
  });
});
