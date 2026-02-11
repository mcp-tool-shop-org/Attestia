/**
 * Tests for InMemorySnapshotStore and FileSnapshotStore.
 *
 * Verifies:
 * - Save and load snapshots
 * - Latest snapshot retrieval
 * - Version-specific retrieval
 * - Delete all snapshots
 * - Overwrite at same version
 * - File persistence across store instances
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  InMemorySnapshotStore,
  FileSnapshotStore,
} from "../src/snapshot-store.js";
import type { SnapshotStore } from "../src/snapshot-store.js";

// =============================================================================
// Shared test suite that runs against both implementations
// =============================================================================

function runSharedTests(createStore: () => SnapshotStore) {
  describe("save and load", () => {
    it("saves and loads a snapshot", () => {
      const store = createStore();
      store.save({
        streamId: "stream-1",
        version: 5,
        state: { count: 42, name: "test" },
      });

      const snapshot = store.load("stream-1");

      expect(snapshot).toBeDefined();
      expect(snapshot!.streamId).toBe("stream-1");
      expect(snapshot!.version).toBe(5);
      expect(snapshot!.state).toEqual({ count: 42, name: "test" });
      expect(snapshot!.createdAt).toBeTruthy();
    });

    it("returns undefined for non-existent stream", () => {
      const store = createStore();

      expect(store.load("nope")).toBeUndefined();
    });

    it("loads latest snapshot when multiple exist", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: { v: 1 } });
      store.save({ streamId: "stream-1", version: 5, state: { v: 5 } });
      store.save({ streamId: "stream-1", version: 3, state: { v: 3 } });

      const snapshot = store.load("stream-1");

      expect(snapshot!.version).toBe(5);
      expect(snapshot!.state).toEqual({ v: 5 });
    });
  });

  describe("loadAtVersion", () => {
    it("loads a specific version", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: { v: 1 } });
      store.save({ streamId: "stream-1", version: 3, state: { v: 3 } });
      store.save({ streamId: "stream-1", version: 5, state: { v: 5 } });

      const snapshot = store.loadAtVersion("stream-1", 3);

      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(3);
      expect(snapshot!.state).toEqual({ v: 3 });
    });

    it("returns undefined for non-existent version", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: { v: 1 } });

      expect(store.loadAtVersion("stream-1", 99)).toBeUndefined();
    });

    it("returns undefined for non-existent stream", () => {
      const store = createStore();

      expect(store.loadAtVersion("nope", 1)).toBeUndefined();
    });
  });

  describe("overwrite", () => {
    it("overwrites snapshot at same version", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 3, state: { old: true } });
      store.save({ streamId: "stream-1", version: 3, state: { new: true } });

      const snapshot = store.loadAtVersion("stream-1", 3);

      expect(snapshot!.state).toEqual({ new: true });
    });
  });

  describe("deleteAll", () => {
    it("deletes all snapshots for a stream", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: { v: 1 } });
      store.save({ streamId: "stream-1", version: 3, state: { v: 3 } });

      store.deleteAll("stream-1");

      expect(store.load("stream-1")).toBeUndefined();
      expect(store.hasSnapshot("stream-1")).toBe(false);
    });

    it("does not affect other streams", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: { v: 1 } });
      store.save({ streamId: "stream-2", version: 1, state: { v: 1 } });

      store.deleteAll("stream-1");

      expect(store.hasSnapshot("stream-1")).toBe(false);
      expect(store.hasSnapshot("stream-2")).toBe(true);
    });

    it("is safe to call on non-existent stream", () => {
      const store = createStore();
      store.deleteAll("nope"); // Should not throw
    });
  });

  describe("hasSnapshot", () => {
    it("returns false for empty store", () => {
      const store = createStore();
      expect(store.hasSnapshot("stream-1")).toBe(false);
    });

    it("returns true after save", () => {
      const store = createStore();
      store.save({ streamId: "stream-1", version: 1, state: {} });
      expect(store.hasSnapshot("stream-1")).toBe(true);
    });
  });

  describe("multiple streams", () => {
    it("maintains independent snapshots per stream", () => {
      const store = createStore();
      store.save({ streamId: "stream-a", version: 1, state: { name: "a" } });
      store.save({ streamId: "stream-b", version: 1, state: { name: "b" } });

      expect(store.load("stream-a")!.state).toEqual({ name: "a" });
      expect(store.load("stream-b")!.state).toEqual({ name: "b" });
    });
  });
}

// =============================================================================
// InMemorySnapshotStore
// =============================================================================

describe("InMemorySnapshotStore", () => {
  runSharedTests(() => new InMemorySnapshotStore());
});

// =============================================================================
// FileSnapshotStore
// =============================================================================

describe("FileSnapshotStore", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(
      tmpdir(),
      `attestia-snapshot-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  runSharedTests(() => new FileSnapshotStore(join(testDir, "snapshots")));

  describe("file persistence", () => {
    it("snapshots survive store recreation", () => {
      const dir = join(testDir, "persistent");

      const store1 = new FileSnapshotStore(dir);
      store1.save({ streamId: "stream-1", version: 5, state: { data: "test" } });

      const store2 = new FileSnapshotStore(dir);
      const snapshot = store2.load("stream-1");

      expect(snapshot).toBeDefined();
      expect(snapshot!.version).toBe(5);
      expect(snapshot!.state).toEqual({ data: "test" });
    });

    it("creates base directory", () => {
      const dir = join(testDir, "deep", "nested", "dir");
      const _store = new FileSnapshotStore(dir);

      expect(existsSync(dir)).toBe(true);
    });

    it("exposes base directory", () => {
      const dir = join(testDir, "base");
      const store = new FileSnapshotStore(dir);

      expect(store.baseDir).toBe(dir);
    });

    it("sanitizes stream IDs for filesystem", () => {
      const store = new FileSnapshotStore(join(testDir, "sanitize"));
      store.save({
        streamId: "org/repo:branch",
        version: 1,
        state: { safe: true },
      });

      const snapshot = store.load("org/repo:branch");
      expect(snapshot!.state).toEqual({ safe: true });
    });
  });
});
