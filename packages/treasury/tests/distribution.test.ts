/**
 * Tests for DistributionEngine — DAO & org distributions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DistributionEngine, DistributionError } from "../src/distribution.js";
import { Ledger } from "@attestia/ledger";
import type { Money } from "@attestia/types";
import type { DistributionRecipient } from "../src/types.js";

function usdc(amount: string): Money {
  return { amount, currency: "USDC", decimals: 6 };
}

describe("DistributionEngine", () => {
  let engine: DistributionEngine;

  beforeEach(() => {
    engine = new DistributionEngine("USDC", 6);
  });

  // ─── Plan management ───────────────────────────────────────────────

  describe("plan management", () => {
    it("creates a distribution plan", () => {
      const plan = engine.createPlan(
        "d-1",
        "Q1 Bonus",
        "proportional",
        usdc("10000"),
        [
          { payeeId: "p-1", share: 5000 },
          { payeeId: "p-2", share: 5000 },
        ],
      );

      expect(plan.id).toBe("d-1");
      expect(plan.status).toBe("draft");
      expect(plan.recipients.length).toBe(2);
    });

    it("throws on duplicate plan ID", () => {
      engine.createPlan("d-1", "Test", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      expect(() =>
        engine.createPlan("d-1", "Test 2", "proportional", usdc("100"), [
          { payeeId: "p-1", share: 5000 },
        ]),
      ).toThrow(DistributionError);
    });

    it("throws on empty recipients", () => {
      expect(() =>
        engine.createPlan("d-1", "Test", "proportional", usdc("100"), []),
      ).toThrow(/recipient/i);
    });

    it("throws when proportional shares exceed 10000", () => {
      expect(() =>
        engine.createPlan("d-1", "Over-allocated", "proportional", usdc("100"), [
          { payeeId: "p-1", share: 6000 },
          { payeeId: "p-2", share: 5000 },
        ]),
      ).toThrow(/10000/);
    });

    it("throws when fixed amounts exceed pool", () => {
      expect(() =>
        engine.createPlan("d-1", "Too much", "fixed", usdc("100"), [
          { payeeId: "p-1", share: 60 },
          { payeeId: "p-2", share: 50 },
        ]),
      ).toThrow(/exceed/i);
    });

    it("approves a draft plan", () => {
      engine.createPlan("d-1", "Test", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      const approved = engine.approvePlan("d-1");
      expect(approved.status).toBe("approved");
    });

    it("throws approving non-draft plan", () => {
      engine.createPlan("d-1", "Test", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      engine.approvePlan("d-1");
      expect(() => engine.approvePlan("d-1")).toThrow(/cannot approve/i);
    });

    it("lists plans by status", () => {
      engine.createPlan("d-1", "A", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      engine.createPlan("d-2", "B", "proportional", usdc("200"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      engine.approvePlan("d-2");

      expect(engine.listPlans().length).toBe(2);
      expect(engine.listPlans("draft").length).toBe(1);
      expect(engine.listPlans("approved").length).toBe(1);
    });
  });

  // ─── Proportional distribution ────────────────────────────────────

  describe("proportional distribution", () => {
    it("splits pool by basis points", () => {
      engine.createPlan("d-1", "Revenue share", "proportional", usdc("10000"), [
        { payeeId: "p-1", share: 6000 }, // 60%
        { payeeId: "p-2", share: 3000 }, // 30%
        { payeeId: "p-3", share: 1000 }, // 10%
      ]);

      const result = engine.computeDistribution("d-1");

      expect(result.payouts.length).toBe(3);
      expect(result.payouts[0]!.amount.amount).toBe("6000.000000");
      expect(result.payouts[1]!.amount.amount).toBe("3000.000000");
      expect(result.payouts[2]!.amount.amount).toBe("1000.000000");
      expect(result.remainder.amount).toBe("0.000000");
    });

    it("handles uneven splits with remainder", () => {
      engine.createPlan("d-1", "Split", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 3333 }, // 33.33%
        { payeeId: "p-2", share: 3333 }, // 33.33%
        { payeeId: "p-3", share: 3333 }, // 33.33%
      ]);

      const result = engine.computeDistribution("d-1");

      // 100 * 3333 / 10000 = 33.33 each, remainder = 0.01
      const total = result.payouts.reduce(
        (sum, p) => sum + parseFloat(p.amount.amount),
        0,
      );
      expect(total).toBeLessThan(100);
      expect(parseFloat(result.remainder.amount)).toBeGreaterThan(0);
    });
  });

  // ─── Fixed distribution ───────────────────────────────────────────

  describe("fixed distribution", () => {
    it("gives fixed amounts", () => {
      engine.createPlan("d-1", "Stipend", "fixed", usdc("500"), [
        { payeeId: "p-1", share: 200 },
        { payeeId: "p-2", share: 150 },
      ]);

      const result = engine.computeDistribution("d-1");

      expect(result.payouts[0]!.amount.amount).toBe("200.000000");
      expect(result.payouts[1]!.amount.amount).toBe("150.000000");
      expect(result.remainder.amount).toBe("150.000000");
    });
  });

  // ─── Milestone distribution ───────────────────────────────────────

  describe("milestone distribution", () => {
    it("pays only recipients who met milestones", () => {
      const recipients: DistributionRecipient[] = [
        { payeeId: "p-1", share: 3000, milestoneMet: true },
        { payeeId: "p-2", share: 3000, milestoneMet: false },
        { payeeId: "p-3", share: 4000, milestoneMet: true },
      ];

      engine.createPlan("d-1", "Grants", "milestone", usdc("10000"), recipients);
      const result = engine.computeDistribution("d-1");

      // Only p-1 and p-3 get paid (shares 3000 and 4000, total 7000)
      // p-1: 10000 * 3000 / 7000 = 4285.714285
      // p-3: 10000 * 4000 / 7000 = 5714.285714
      expect(result.payouts.length).toBe(2);
      expect(result.payouts[0]!.payeeId).toBe("p-1");
      expect(result.payouts[1]!.payeeId).toBe("p-3");

      const total = parseFloat(result.totalDistributed.amount);
      expect(total).toBeLessThanOrEqual(10000);
    });

    it("distributes nothing if no milestones met", () => {
      engine.createPlan("d-1", "Grants", "milestone", usdc("1000"), [
        { payeeId: "p-1", share: 5000, milestoneMet: false },
      ]);

      const result = engine.computeDistribution("d-1");
      expect(result.payouts.length).toBe(0);
      expect(result.remainder.amount).toBe("1000.000000");
    });
  });

  // ─── Execute ──────────────────────────────────────────────────────

  describe("executeDistribution", () => {
    it("records entries in the ledger", () => {
      const ledger = new Ledger();
      engine.createPlan("d-1", "Revenue", "proportional", usdc("1000"), [
        { payeeId: "p-1", share: 5000 },
        { payeeId: "p-2", share: 5000 },
      ]);
      engine.approvePlan("d-1");

      const result = engine.executeDistribution("d-1", ledger);

      expect(result.payouts.length).toBe(2);
      // 2 recipients × 2 entries (debit + credit) = 4 entries
      expect(ledger.getEntries().length).toBe(4);

      const plan = engine.getPlan("d-1");
      expect(plan.status).toBe("executed");
    });

    it("throws executing non-approved plan", () => {
      const ledger = new Ledger();
      engine.createPlan("d-1", "Test", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);
      expect(() => engine.executeDistribution("d-1", ledger)).toThrow(
        /cannot execute/i,
      );
    });
  });

  // ─── Export / Import ──────────────────────────────────────────────

  describe("export / import", () => {
    it("round-trips plans", () => {
      engine.createPlan("d-1", "Test", "proportional", usdc("100"), [
        { payeeId: "p-1", share: 5000 },
      ]);

      const plans = engine.exportPlans();
      const engine2 = new DistributionEngine("USDC", 6);
      engine2.importPlans(plans);

      expect(engine2.getPlan("d-1").name).toBe("Test");
    });
  });
});
