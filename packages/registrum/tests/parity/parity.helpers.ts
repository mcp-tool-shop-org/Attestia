/**
 * Parity Test Harness Utilities
 *
 * This module provides the core abstractions for behavioral parity testing
 * between the legacy TypeScript invariant system and the registry-based system.
 *
 * Design Principles:
 * - Tests equivalence, not performance or ergonomics
 * - Compares normalized outcomes only
 * - Never compares messages, stack traces, or error ordering
 * - Structural outcome + invariant IDs are the only comparison points
 *
 * This is the scientific control that enables defensible migration decisions.
 */

import * as fs from "fs";
import * as path from "path";
import { expect } from "vitest";

import { StructuralRegistrar } from "../../src/structural-registrar";
import {
  loadInvariantRegistry,
  RegistryDrivenRegistrar,
} from "../../src/registry/index";
import type {
  State,
  Transition,
  RegistrationResult,
  ValidationReport,
} from "../../src/types";
import type { Registrar } from "../../src/registrar";

// =============================================================================
// Normalized Result Types
// =============================================================================

/**
 * Normalized outcome for parity comparison.
 *
 * The two systems differ internally (error shapes, etc).
 * Parity tests compare normalized outcomes only.
 */
export type NormalizedResult =
  | { kind: "accepted"; orderIndex: number }
  | { kind: "rejected"; invariantIds: readonly string[]; hasHalt: boolean }
  | { kind: "halted"; invariantIds: readonly string[] };

/**
 * Normalized validation report for parity comparison.
 */
export type NormalizedValidation = {
  valid: boolean;
  invariantIds: readonly string[];
};

// =============================================================================
// Result Normalization
// =============================================================================

/**
 * Normalize a registration result for parity comparison.
 *
 * Important:
 * - Never compare messages, stack traces, or ordering of errors
 * - Only structural outcome + sorted invariant IDs
 */
export function normalizeResult(result: RegistrationResult): NormalizedResult {
  if (result.kind === "accepted") {
    return {
      kind: "accepted",
      orderIndex: result.orderIndex,
    };
  }

  // Check for halt violations (marked with [HALT] prefix in messages)
  const hasHalt = result.violations.some((v) => v.message.includes("[HALT]"));
  const invariantIds = result.violations.map((v) => v.invariantId).sort();

  if (hasHalt) {
    return {
      kind: "halted",
      invariantIds,
    };
  }

  return {
    kind: "rejected",
    invariantIds,
    hasHalt: false,
  };
}

/**
 * Normalize a validation report for parity comparison.
 */
export function normalizeValidation(
  report: ValidationReport
): NormalizedValidation {
  return {
    valid: report.valid,
    invariantIds: report.violations.map((v) => v.invariantId).sort(),
  };
}

// =============================================================================
// Registrar Factory
// =============================================================================

/**
 * Create a fresh pair of registrars for parity testing.
 *
 * As of Phase H, registry is default. This helper explicitly creates
 * both modes for behavioral parity verification.
 */
export function createRegistrarPair(): {
  legacy: StructuralRegistrar;
  registry: RegistryDrivenRegistrar;
} {
  // Legacy mode requires explicit selection (secondary witness)
  const legacy = new StructuralRegistrar({ mode: "legacy" });

  const registryPath = path.join(
    process.cwd(),
    "invariants",
    "registry.json"
  );
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const compiledRegistry = loadInvariantRegistry(raw);
  const registry = new RegistryDrivenRegistrar(compiledRegistry);

  return { legacy, registry };
}

// =============================================================================
// State Factories
// =============================================================================

/**
 * Create a root state (for null parent transitions).
 * Root states MUST have isRoot: true in structure per invariant B.1.
 */
export function createRootState(
  id: string,
  additionalStructure: Record<string, unknown> = {}
): State {
  return {
    id,
    structure: { isRoot: true, ...additionalStructure },
    data: null,
  };
}

/**
 * Create a child state (for non-null parent transitions).
 * Child states should NOT have isRoot marker.
 */
export function createChildState(
  id: string,
  structure: Record<string, unknown> = {}
): State {
  return {
    id,
    structure,
    data: null,
  };
}

/**
 * Create a transition.
 */
export function createTransition(
  from: string | null,
  to: State
): Transition {
  return { from, to };
}

// =============================================================================
// Parity Assertion Helpers
// =============================================================================

/**
 * Assert behavioral parity between legacy and registry systems.
 *
 * This is the core parity assertion. It:
 * 1. Registers the transition in both systems
 * 2. Normalizes both results
 * 3. Asserts structural equality
 *
 * @param legacy - The legacy TypeScript registrar
 * @param registry - The registry-driven registrar
 * @param transition - The transition to test
 * @param description - Human-readable test description for error messages
 */
export function expectRegistrationParity(
  legacy: Registrar,
  registry: Registrar,
  transition: Transition,
  description: string
): { legacy: NormalizedResult; registry: NormalizedResult } {
  const legacyResult = normalizeResult(legacy.register(transition));
  const registryResult = normalizeResult(registry.register(transition));

  expect(
    registryResult,
    `${description}: registry result should match legacy`
  ).toEqual(legacyResult);

  return { legacy: legacyResult, registry: registryResult };
}

/**
 * Assert validation parity between legacy and registry systems.
 */
export function expectValidationParity(
  legacy: Registrar,
  registry: Registrar,
  target: State | Transition,
  description: string
): { legacy: NormalizedValidation; registry: NormalizedValidation } {
  const legacyResult = normalizeValidation(legacy.validate(target));
  const registryResult = normalizeValidation(registry.validate(target));

  expect(
    registryResult,
    `${description}: registry validation should match legacy`
  ).toEqual(legacyResult);

  return { legacy: legacyResult, registry: registryResult };
}

/**
 * Assert lineage parity between legacy and registry systems.
 */
export function expectLineageParity(
  legacy: Registrar,
  registry: Registrar,
  stateId: string,
  description: string
): { legacy: readonly string[]; registry: readonly string[] } {
  const legacyLineage = legacy.getLineage(stateId);
  const registryLineage = registry.getLineage(stateId);

  expect(
    registryLineage,
    `${description}: registry lineage should match legacy`
  ).toEqual(legacyLineage);

  return { legacy: legacyLineage, registry: registryLineage };
}

/**
 * Seed a state into both registrars (helper for tests that need pre-existing state).
 */
export function seedState(
  legacy: Registrar,
  registry: Registrar,
  state: State,
  from: string | null = null
): void {
  const transition = createTransition(from, state);
  legacy.register(transition);
  registry.register(transition);
}

// =============================================================================
// Invariant Metadata Parity
// =============================================================================

/**
 * Assert that both systems list the same invariants.
 */
export function expectInvariantListParity(
  legacy: Registrar,
  registry: Registrar
): void {
  const legacyInvariants = legacy.listInvariants();
  const registryInvariants = registry.listInvariants();

  // Same count
  expect(registryInvariants.length).toBe(legacyInvariants.length);

  // Same IDs (as sets)
  const legacyIds = new Set(legacyInvariants.map((i) => i.id));
  const registryIds = new Set(registryInvariants.map((i) => i.id));
  expect(registryIds).toEqual(legacyIds);

  // Same metadata for each invariant
  const legacyMap = new Map(legacyInvariants.map((i) => [i.id, i]));
  const registryMap = new Map(registryInvariants.map((i) => [i.id, i]));

  for (const [id, legacyInv] of legacyMap) {
    const registryInv = registryMap.get(id);
    expect(registryInv, `missing invariant ${id}`).toBeDefined();
    if (registryInv) {
      expect(registryInv.failureMode, `${id} failure mode`).toBe(
        legacyInv.failureMode
      );
      expect(registryInv.scope, `${id} scope`).toBe(legacyInv.scope);
    }
  }
}
