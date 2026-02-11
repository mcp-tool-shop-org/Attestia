#!/usr/bin/env npx ts-node
/**
 * Refusal as Success — Minimal Runnable Example
 *
 * This example demonstrates Registrum's core value proposition:
 * explicit, structured refusal of invalid transitions.
 *
 * Run with: npx ts-node examples/refusal-as-success.ts
 *
 * What this demonstrates:
 * 1. A valid transition is accepted
 * 2. An invalid transition is refused
 * 3. The refusal is structured, not an exception
 * 4. The refusal names the exact invariant violated
 *
 * The refusal IS the success. Registrum's value is in what it refuses.
 */

import { StructuralRegistrar } from "../src/structural-registrar.js";
import type { State, Transition, RegistrationResult } from "../src/types.js";

// =============================================================================
// Setup: Create a registrar in legacy mode (no external dependencies)
// =============================================================================

const registrar = new StructuralRegistrar({ mode: "legacy" });

console.log("=".repeat(60));
console.log("Registrum: Refusal as Success");
console.log("=".repeat(60));
console.log();

// =============================================================================
// Step 1: Register a valid root state
// =============================================================================

console.log("Step 1: Register a valid root state");
console.log("-".repeat(40));

const rootState: State = {
  id: "document-v1",
  structure: {
    isRoot: true,
    version: 1,
    schema: { title: "string", body: "string" },
  },
  data: null,
};

const rootTransition: Transition = {
  from: null, // Root state has no parent
  to: rootState,
};

const rootResult = registrar.register(rootTransition);
printResult("Root registration", rootResult);

// =============================================================================
// Step 2: Register a valid child state (version update)
// =============================================================================

console.log();
console.log("Step 2: Register a valid version update");
console.log("-".repeat(40));

const validUpdateState: State = {
  id: "document-v1", // Same identity (version update)
  structure: {
    version: 2,
    schema: { title: "string", body: "string", author: "string" },
  },
  data: null,
};

const validUpdateTransition: Transition = {
  from: "document-v1", // Parent exists
  to: validUpdateState,
};

const validUpdateResult = registrar.register(validUpdateTransition);
printResult("Valid update", validUpdateResult);

// =============================================================================
// Step 3: Attempt an INVALID transition (orphan — parent doesn't exist)
// =============================================================================

console.log();
console.log("Step 3: Attempt an invalid transition (orphan)");
console.log("-".repeat(40));

const orphanState: State = {
  id: "orphan-document",
  structure: {
    version: 1,
    schema: { field: "string" },
  },
  data: null,
};

const orphanTransition: Transition = {
  from: "non-existent-parent", // This parent does not exist!
  to: orphanState,
};

const orphanResult = registrar.register(orphanTransition);
printResult("Orphan registration", orphanResult);

// =============================================================================
// Step 4: Attempt another INVALID transition (empty ID)
// =============================================================================

console.log();
console.log("Step 4: Attempt an invalid transition (empty ID)");
console.log("-".repeat(40));

const emptyIdState: State = {
  id: "", // Empty ID violates identity invariant
  structure: { isRoot: true },
  data: null,
};

const emptyIdTransition: Transition = {
  from: null,
  to: emptyIdState,
};

const emptyIdResult = registrar.register(emptyIdTransition);
printResult("Empty ID registration", emptyIdResult);

// =============================================================================
// Summary
// =============================================================================

console.log();
console.log("=".repeat(60));
console.log("Summary");
console.log("=".repeat(60));
console.log();
console.log("Registrum refused 2 transitions and accepted 2.");
console.log();
console.log("Each refusal:");
console.log("  - Names the exact invariant violated");
console.log("  - Provides a structural reason");
console.log("  - Is a verdict, not an error");
console.log();
console.log("The refusals ARE the success.");
console.log("Registrum's value is in what it refuses to allow.");
console.log();

// =============================================================================
// Helper: Print registration result
// =============================================================================

function printResult(label: string, result: RegistrationResult): void {
  if (result.kind === "accepted") {
    console.log(`✅ ${label}: ACCEPTED`);
    console.log(`   State ID: ${result.stateId}`);
    console.log(`   Order Index: ${result.orderIndex}`);
    console.log(`   Invariants Checked: ${result.appliedInvariants.length}`);
  } else {
    console.log(`❌ ${label}: REFUSED`);
    console.log();
    console.log("   Verdict:");
    for (const violation of result.violations) {
      // Classification is now a structured field, no message parsing needed
      const classificationLabel =
        violation.classification === "HALT"
          ? "HALT (critical)"
          : "REJECT";
      console.log(`   ┌─────────────────────────────────────`);
      console.log(`   │ Invariant: ${violation.invariantId}`);
      console.log(`   │ Classification: ${classificationLabel}`);
      console.log(`   │ Reason: ${violation.message.replace("[HALT] ", "")}`);
      console.log(`   └─────────────────────────────────────`);
    }
  }
}
