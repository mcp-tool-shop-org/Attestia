/**
 * Tests for snapshot integrity — stateHash computation and verification.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { InMemorySnapshotStore, FileSnapshotStore } from "../src/snapshot-store.js";
import { computeSnapshotHash, verifySnapshotIntegrity } from "../src/snapshot-store.js";
import type { StoredSnapshot } from "../src/snapshot-store.js";
import { join } from "node:path";
import { rmSync, mkdirSync } from "node:fs";

// =============================================================================
// computeSnapshotHash
// =============================================================================

describe("computeSnapshotHash", () => {
  it("produces a 64-char hex string", () => {
    const hash = computeSnapshotHash({ key: "value" });
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    const state = { accounts: [{ id: "a" }], total: 100 };
    expect(computeSnapshotHash(state)).toBe(computeSnapshotHash(state));
  });

  it("is order-independent for object keys (canonical JSON)", () => {
    const a = computeSnapshotHash({ b: 2, a: 1 });
    const b = computeSnapshotHash({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it("changes when state changes", () => {
    const h1 = computeSnapshotHash({ x: 1 });
    const h2 = computeSnapshotHash({ x: 2 });
    expect(h1).not.toBe(h2);
  });
});

// =============================================================================
// verifySnapshotIntegrity
// =============================================================================

describe("verifySnapshotIntegrity", () => {
  it("returns true for a valid snapshot", () => {
    const state = { accounts: [{ id: "a", balance: 100 }] };
    const snapshot: StoredSnapshot = {
      streamId: "s",
      version: 1,
      state,
      createdAt: "2025-01-01T00:00:00Z",
      stateHash: computeSnapshotHash(state),
    };
    expect(verifySnapshotIntegrity(snapshot)).toBe(true);
  });

  it("returns false for a tampered snapshot", () => {
    const state = { accounts: [{ id: "a", balance: 100 }] };
    const snapshot: StoredSnapshot = {
      streamId: "s",
      version: 1,
      state: { accounts: [{ id: "a", balance: 999 }] }, // tampered
      createdAt: "2025-01-01T00:00:00Z",
      stateHash: computeSnapshotHash(state), // hash of original
    };
    expect(verifySnapshotIntegrity(snapshot)).toBe(false);
  });

  it("returns false for empty stateHash", () => {
    const snapshot: StoredSnapshot = {
      streamId: "s",
      version: 1,
      state: {},
      createdAt: "2025-01-01T00:00:00Z",
      stateHash: "",
    };
    expect(verifySnapshotIntegrity(snapshot)).toBe(false);
  });
});

// =============================================================================
// InMemorySnapshotStore — stateHash
// =============================================================================

describe("InMemorySnapshotStore stateHash", () => {
  it("saved snapshot includes stateHash", () => {
    const store = new InMemorySnapshotStore();
    const state = { balance: 42 };
    store.save({ streamId: "s", version: 1, state });

    const loaded = store.load("s");
    expect(loaded).toBeDefined();
    expect(loaded!.stateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifySnapshotIntegrity(loaded!)).toBe(true);
  });
});

// =============================================================================
// FileSnapshotStore — stateHash
// =============================================================================

describe("FileSnapshotStore stateHash", () => {
  const testDir = join(process.cwd(), ".test-snapshot-integrity");

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("saved and loaded snapshot has valid stateHash", () => {
    const store = new FileSnapshotStore(testDir);
    const state = { ledger: { entries: [1, 2, 3] } };
    store.save({ streamId: "ledger", version: 5, state });

    const loaded = store.load("ledger");
    expect(loaded).toBeDefined();
    expect(loaded!.stateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(verifySnapshotIntegrity(loaded!)).toBe(true);
  });

  it("detects tampered state in loaded snapshot", () => {
    const store = new FileSnapshotStore(testDir);
    const state = { value: "original" };
    store.save({ streamId: "s", version: 1, state });

    const loaded = store.load("s")!;
    // Simulate tampering by modifying state in the loaded object
    const tampered: StoredSnapshot = {
      ...loaded,
      state: { value: "tampered" },
    };
    expect(verifySnapshotIntegrity(tampered)).toBe(false);
  });
});
