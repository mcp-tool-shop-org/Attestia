/**
 * Tests for IntentManager — vault intent lifecycle.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IntentManager, IntentError } from "../src/intent-manager.js";
import { BudgetEngine } from "../src/budget.js";
import type { Money } from "@attestia/types";

function usdc(amount: string): Money {
  return { amount, currency: "USDC", decimals: 6 };
}

describe("IntentManager", () => {
  let budget: BudgetEngine;
  let intents: IntentManager;

  beforeEach(() => {
    budget = new BudgetEngine("owner-1", "USDC", 6);
    intents = new IntentManager(budget);
  });

  // ─── Declare ────────────────────────────────────────────────────────

  describe("declare", () => {
    it("creates a new intent in declared state", () => {
      const intent = intents.declare(
        "i-1",
        "transfer",
        "Send 100 USDC",
        "owner-1",
        { amount: usdc("100"), toAddress: "0xRecipient" },
      );

      expect(intent.id).toBe("i-1");
      expect(intent.status).toBe("declared");
      expect(intent.kind).toBe("transfer");
      expect(intent.description).toBe("Send 100 USDC");
    });

    it("throws on duplicate ID", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      expect(() =>
        intents.declare("i-1", "transfer", "Test 2", "owner-1", {}),
      ).toThrow(/already exists/i);
    });

    it("links to an envelope and checks budget", () => {
      budget.createEnvelope("rent", "Rent");
      budget.allocate("rent", usdc("500"));

      const intent = intents.declare(
        "i-1",
        "transfer",
        "Pay rent",
        "owner-1",
        { amount: usdc("400") },
        "rent",
      );

      expect(intent.envelopeId).toBe("rent");
    });

    it("rejects if envelope has insufficient budget", () => {
      budget.createEnvelope("rent", "Rent");
      budget.allocate("rent", usdc("100"));

      expect(() =>
        intents.declare(
          "i-1",
          "transfer",
          "Pay rent",
          "owner-1",
          { amount: usdc("500") },
          "rent",
        ),
      ).toThrow(/requires|budget/i);
    });
  });

  // ─── Approve / Reject ──────────────────────────────────────────────

  describe("approve", () => {
    it("transitions to approved state", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      const approved = intents.approve("i-1", "owner-1", "LGTM");

      expect(approved.status).toBe("approved");
      expect(approved.approval?.approved).toBe(true);
      expect(approved.approval?.reason).toBe("LGTM");
    });

    it("throws for non-existent intent", () => {
      expect(() => intents.approve("nope", "owner-1")).toThrow(
        IntentError,
      );
    });

    it("throws for invalid transition", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      intents.approve("i-1", "owner-1");
      // approved → approved should fail
      expect(() => intents.approve("i-1", "owner-1")).toThrow(
        /cannot transition/i,
      );
    });
  });

  describe("reject", () => {
    it("transitions to rejected state", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      const rejected = intents.reject("i-1", "owner-1", "Too expensive");

      expect(rejected.status).toBe("rejected");
      expect(rejected.approval?.approved).toBe(false);
      expect(rejected.approval?.reason).toBe("Too expensive");
    });
  });

  // ─── Execute ───────────────────────────────────────────────────────

  describe("markExecuting", () => {
    it("transitions approved → executing", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      intents.approve("i-1", "owner-1");
      const executing = intents.markExecuting("i-1");

      expect(executing.status).toBe("executing");
    });

    it("throws for non-approved intent", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      expect(() => intents.markExecuting("i-1")).toThrow(
        /cannot transition/i,
      );
    });
  });

  describe("recordExecution", () => {
    it("transitions executing → executed and debits budget", () => {
      budget.createEnvelope("rent", "Rent");
      budget.allocate("rent", usdc("1000"));

      intents.declare(
        "i-1",
        "transfer",
        "Pay rent",
        "owner-1",
        { amount: usdc("500") },
        "rent",
      );
      intents.approve("i-1", "owner-1");
      intents.markExecuting("i-1");
      const executed = intents.recordExecution(
        "i-1",
        "eip155:1",
        "0xTxHash123",
      );

      expect(executed.status).toBe("executed");
      expect(executed.execution?.chainId).toBe("eip155:1");
      expect(executed.execution?.txHash).toBe("0xTxHash123");

      // Budget should be debited
      const env = budget.getEnvelope("rent");
      expect(env.spent).toBe("500.000000");
      expect(env.available).toBe("500.000000");
    });
  });

  // ─── Verify ────────────────────────────────────────────────────────

  describe("verify", () => {
    it("transitions executed → verified", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      intents.approve("i-1", "owner-1");
      intents.markExecuting("i-1");
      intents.recordExecution("i-1", "eip155:1", "0xHash");
      const verified = intents.verify("i-1", true);

      expect(verified.status).toBe("verified");
      expect(verified.verification?.matched).toBe(true);
    });

    it("records discrepancies on mismatch", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});
      intents.approve("i-1", "owner-1");
      intents.markExecuting("i-1");
      intents.recordExecution("i-1", "eip155:1", "0xHash");
      const verified = intents.verify("i-1", false, [
        "Amount mismatch: expected 100, got 99",
      ]);

      expect(verified.verification?.matched).toBe(false);
      expect(verified.verification?.discrepancies?.length).toBe(1);
    });
  });

  // ─── Failure ───────────────────────────────────────────────────────

  describe("recordFailure", () => {
    it("transitions executed → failed and reverses budget", () => {
      budget.createEnvelope("rent", "Rent");
      budget.allocate("rent", usdc("1000"));

      intents.declare(
        "i-1",
        "transfer",
        "Pay rent",
        "owner-1",
        { amount: usdc("500") },
        "rent",
      );
      intents.approve("i-1", "owner-1");
      intents.markExecuting("i-1");
      intents.recordExecution("i-1", "eip155:1", "0xHash");

      // Budget was debited
      expect(budget.getEnvelope("rent").spent).toBe("500.000000");

      // Now record failure — should reverse
      const failed = intents.recordFailure("i-1", ["Tx reverted"]);

      expect(failed.status).toBe("failed");
      expect(budget.getEnvelope("rent").spent).toBe("0.000000");
      expect(budget.getEnvelope("rent").available).toBe("1000.000000");
    });
  });

  // ─── Queries ───────────────────────────────────────────────────────

  describe("queries", () => {
    it("lists all intents", () => {
      intents.declare("i-1", "transfer", "A", "owner-1", {});
      intents.declare("i-2", "swap", "B", "owner-1", {});
      expect(intents.listIntents().length).toBe(2);
    });

    it("filters by status", () => {
      intents.declare("i-1", "transfer", "A", "owner-1", {});
      intents.declare("i-2", "transfer", "B", "owner-1", {});
      intents.approve("i-2", "owner-1");

      expect(intents.listIntents("declared").length).toBe(1);
      expect(intents.listIntents("approved").length).toBe(1);
    });

    it("lists by envelope", () => {
      budget.createEnvelope("rent", "Rent");
      budget.allocate("rent", usdc("1000"));

      intents.declare("i-1", "transfer", "A", "owner-1", {}, "rent");
      intents.declare("i-2", "transfer", "B", "owner-1", {});

      expect(intents.listByEnvelope("rent").length).toBe(1);
    });

    it("counts intents", () => {
      expect(intents.count).toBe(0);
      intents.declare("i-1", "transfer", "A", "owner-1", {});
      expect(intents.count).toBe(1);
    });
  });

  // ─── Full lifecycle ────────────────────────────────────────────────

  describe("full lifecycle", () => {
    it("goes through declare → approve → executing → executed → verified", () => {
      intents.declare("i-1", "transfer", "Send USDC", "owner-1", {
        amount: usdc("100"),
        toAddress: "0xRecipient",
      });

      intents.approve("i-1", "owner-1", "Approved");
      intents.markExecuting("i-1");
      intents.recordExecution("i-1", "eip155:1", "0xHash123");
      const final = intents.verify("i-1", true);

      expect(final.status).toBe("verified");
      expect(final.verification?.matched).toBe(true);
      expect(final.execution?.txHash).toBe("0xHash123");
    });

    it("invalid transitions are blocked at every step", () => {
      intents.declare("i-1", "transfer", "Test", "owner-1", {});

      // declared → executing (skip approve)
      expect(() => intents.markExecuting("i-1")).toThrow();

      // declared → executed (skip approve + executing)
      expect(() =>
        intents.recordExecution("i-1", "eip155:1", "0xhash"),
      ).toThrow();

      // declared → verified (skip everything)
      expect(() => intents.verify("i-1", true)).toThrow();
    });
  });

  // ─── Export / Import ───────────────────────────────────────────────

  describe("export / import", () => {
    it("round-trips intents", () => {
      intents.declare("i-1", "transfer", "A", "owner-1", {});
      intents.declare("i-2", "swap", "B", "owner-1", {});
      intents.approve("i-2", "owner-1");

      const exported = intents.exportIntents();
      expect(exported.length).toBe(2);

      const budget2 = new BudgetEngine("owner-1", "USDC", 6);
      const intents2 = new IntentManager(budget2);
      intents2.importIntents(exported);

      expect(intents2.count).toBe(2);
      expect(intents2.getIntent("i-2")?.status).toBe("approved");
    });
  });
});
