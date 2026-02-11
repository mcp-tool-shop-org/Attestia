/**
 * Tests for JsonlEventStore.
 *
 * Verifies:
 * - Persistence: events survive store recreation
 * - Crash safety: partial/corrupt lines are skipped
 * - File creation: directory and file created on demand
 * - Parity: same behavior as InMemoryEventStore for core operations
 * - Append + fsync: data written to disk
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DomainEvent } from "@attestia/types";
import { JsonlEventStore } from "../src/jsonl-store.js";
import { EventStoreError } from "../src/types.js";

// =============================================================================
// Helpers
// =============================================================================

let testDir: string;
let testFile: string;

function freshPath(): string {
  const id = Math.random().toString(36).slice(2, 10);
  return join(testDir, `store-${id}.jsonl`);
}

function makeEvent(type: string, correlationId?: string): DomainEvent {
  return {
    type,
    metadata: {
      eventId: `evt-${type}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actor: "test",
      correlationId: correlationId ?? `corr-${Math.random().toString(36).slice(2, 8)}`,
      source: "vault",
    },
    payload: { type },
  };
}

function makeEvents(count: number, prefix = "event"): DomainEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent(`${prefix}.${i + 1}`),
  );
}

beforeEach(() => {
  testDir = join(tmpdir(), `attestia-jsonl-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(testDir, { recursive: true });
  testFile = join(testDir, "events.jsonl");
});

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

// =============================================================================
// File Creation
// =============================================================================

describe("file creation", () => {
  it("creates the file on first append", () => {
    const store = new JsonlEventStore({ filePath: testFile });

    expect(existsSync(testFile)).toBe(false);

    store.append("stream-1", [makeEvent("test")]);

    expect(existsSync(testFile)).toBe(true);
  });

  it("creates nested directories", () => {
    const nestedPath = join(testDir, "deep", "nested", "dir", "events.jsonl");
    const store = new JsonlEventStore({ filePath: nestedPath });

    store.append("stream-1", [makeEvent("test")]);

    expect(existsSync(nestedPath)).toBe(true);
  });

  it("loads from existing file on construction", () => {
    const path = freshPath();

    // Write events with first store
    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", [makeEvent("first")]);
    store1.append("stream-1", [makeEvent("second")]);

    // Recreate store from same file
    const store2 = new JsonlEventStore({ filePath: path });

    expect(store2.streamVersion("stream-1")).toBe(2);
    expect(store2.globalPosition()).toBe(2);

    const events = store2.read("stream-1");
    expect(events).toHaveLength(2);
    expect(events[0]!.event.type).toBe("first");
    expect(events[1]!.event.type).toBe("second");
  });
});

// =============================================================================
// Persistence
// =============================================================================

describe("persistence", () => {
  it("events survive store recreation", () => {
    const path = freshPath();

    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-a", makeEvents(3, "a"));
    store1.append("stream-b", makeEvents(2, "b"));

    const store2 = new JsonlEventStore({ filePath: path });

    expect(store2.streamVersion("stream-a")).toBe(3);
    expect(store2.streamVersion("stream-b")).toBe(2);
    expect(store2.globalPosition()).toBe(5);
  });

  it("preserves event data across reload", () => {
    const path = freshPath();

    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", [makeEvent("intent.declared")]);

    const store2 = new JsonlEventStore({ filePath: path });
    const [event] = store2.read("stream-1");

    expect(event!.event.type).toBe("intent.declared");
    expect(event!.event.metadata.actor).toBe("test");
    expect(event!.event.payload).toEqual({ type: "intent.declared" });
    expect(event!.streamId).toBe("stream-1");
    expect(event!.version).toBe(1);
    expect(event!.globalPosition).toBe(1);
  });

  it("continues version sequence after reload", () => {
    const path = freshPath();

    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", makeEvents(3));

    const store2 = new JsonlEventStore({ filePath: path });
    const result = store2.append("stream-1", [makeEvent("continued")]);

    expect(result.fromVersion).toBe(4);
    expect(store2.streamVersion("stream-1")).toBe(4);
    expect(store2.globalPosition()).toBe(4);
  });

  it("continues global position after reload", () => {
    const path = freshPath();

    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", makeEvents(3));
    store1.append("stream-2", makeEvents(2));

    const store2 = new JsonlEventStore({ filePath: path });
    store2.append("stream-3", [makeEvent("new")]);

    const all = store2.readAll();
    expect(all).toHaveLength(6);
    expect(all[5]!.globalPosition).toBe(6);
  });

  it("file contains one JSON per line", () => {
    const path = freshPath();

    const store = new JsonlEventStore({ filePath: path });
    store.append("stream-1", makeEvents(3));

    const content = readFileSync(path, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines).toHaveLength(3);
    for (const line of lines) {
      const parsed = JSON.parse(line);
      expect(parsed.streamId).toBe("stream-1");
      expect(typeof parsed.version).toBe("number");
      expect(typeof parsed.globalPosition).toBe("number");
    }
  });
});

// =============================================================================
// Crash Safety
// =============================================================================

describe("crash safety", () => {
  it("skips corrupt lines at end of file", () => {
    const path = freshPath();

    // Write valid events then append garbage
    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", makeEvents(2));

    // Simulate crash: append partial JSON
    writeFileSync(path, '{"partial":true, "broken\n', { flag: "a" });

    // Reload — should skip the corrupt line
    const store2 = new JsonlEventStore({ filePath: path });

    expect(store2.streamVersion("stream-1")).toBe(2);
    expect(store2.globalPosition()).toBe(2);
  });

  it("skips empty lines", () => {
    const path = freshPath();

    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", [makeEvent("test")]);

    // Inject empty lines
    const content = readFileSync(path, "utf-8");
    writeFileSync(path, "\n\n" + content + "\n\n");

    const store2 = new JsonlEventStore({ filePath: path });
    expect(store2.streamVersion("stream-1")).toBe(1);
  });

  it("skips lines with missing required fields", () => {
    const path = freshPath();

    // Write a valid event first
    const store1 = new JsonlEventStore({ filePath: path });
    store1.append("stream-1", [makeEvent("valid")]);

    // Append a line missing streamId
    const content = readFileSync(path, "utf-8");
    writeFileSync(path, content + '{"event":{"type":"bad"},"version":1,"globalPosition":99}\n');

    const store2 = new JsonlEventStore({ filePath: path });
    expect(store2.streamVersion("stream-1")).toBe(1);
    expect(store2.globalPosition()).toBe(1);
  });
});

// =============================================================================
// Core Operations (Parity with InMemoryEventStore)
// =============================================================================

describe("core operations", () => {
  it("assigns monotonically increasing versions within a stream", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });

    store.append("stream-1", makeEvents(2));
    store.append("stream-1", makeEvents(3));

    const all = store.read("stream-1");
    expect(all).toHaveLength(5);
    expect(all.map((e) => e.version)).toEqual([1, 2, 3, 4, 5]);
  });

  it("maintains independent version sequences per stream", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });

    store.append("stream-a", makeEvents(3));
    store.append("stream-b", makeEvents(2));

    expect(store.streamVersion("stream-a")).toBe(3);
    expect(store.streamVersion("stream-b")).toBe(2);
  });

  it("reads forward from specific version", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(5));

    const events = store.read("stream-1", { fromVersion: 3 });
    expect(events).toHaveLength(3);
    expect(events[0]!.version).toBe(3);
  });

  it("reads backward", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(5));

    const events = store.read("stream-1", {
      fromVersion: 4,
      direction: "backward",
    });

    expect(events).toHaveLength(4);
    expect(events[0]!.version).toBe(4);
    expect(events[3]!.version).toBe(1);
  });

  it("reads with maxCount", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(10));

    const events = store.read("stream-1", { maxCount: 3 });
    expect(events).toHaveLength(3);
  });

  it("readAll returns events in global order", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-a", [makeEvent("a1")]);
    store.append("stream-b", [makeEvent("b1")]);
    store.append("stream-a", [makeEvent("a2")]);

    const all = store.readAll();
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.streamId)).toEqual(["stream-a", "stream-b", "stream-a"]);
  });

  it("returns empty array for non-existent stream", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    expect(store.read("nope")).toEqual([]);
  });
});

// =============================================================================
// Concurrency Control
// =============================================================================

describe("concurrency control", () => {
  it("succeeds with correct expectedVersion", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(3));

    const result = store.append("stream-1", [makeEvent("next")], {
      expectedVersion: 3,
    });

    expect(result.fromVersion).toBe(4);
  });

  it("fails with wrong expectedVersion", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(3));

    expect(() =>
      store.append("stream-1", [makeEvent("next")], { expectedVersion: 2 }),
    ).toThrow("at version 3, expected 2");
  });

  it("succeeds with no_stream on new stream", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });

    const result = store.append("new-stream", [makeEvent("first")], {
      expectedVersion: "no_stream",
    });

    expect(result.fromVersion).toBe(1);
  });

  it("fails with no_stream on existing stream", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("existing", [makeEvent("first")]);

    expect(() =>
      store.append("existing", [makeEvent("second")], { expectedVersion: "no_stream" }),
    ).toThrow("already exists");
  });

  it("succeeds with 'any'", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    store.append("stream-1", makeEvents(5));

    const result = store.append("stream-1", [makeEvent("any")], {
      expectedVersion: "any",
    });

    expect(result.fromVersion).toBe(6);
  });
});

// =============================================================================
// Subscriptions
// =============================================================================

describe("subscriptions", () => {
  it("stream subscription receives events", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    const received: string[] = [];

    store.subscribe("stream-1", (event) => received.push(event.event.type));

    store.append("stream-1", [makeEvent("first")]);
    store.append("stream-1", [makeEvent("second")]);

    expect(received).toEqual(["first", "second"]);
  });

  it("global subscription receives events from all streams", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    const received: string[] = [];

    store.subscribeAll((event) => received.push(`${event.streamId}:${event.event.type}`));

    store.append("a", [makeEvent("x")]);
    store.append("b", [makeEvent("y")]);

    expect(received).toEqual(["a:x", "b:y"]);
  });

  it("unsubscribe stops receiving events", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });
    const received: string[] = [];

    const sub = store.subscribe("stream-1", (event) => received.push(event.event.type));

    store.append("stream-1", [makeEvent("before")]);
    sub.unsubscribe();
    store.append("stream-1", [makeEvent("after")]);

    expect(received).toEqual(["before"]);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("errors", () => {
  it("rejects empty stream ID", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });

    expect(() => store.append("", [makeEvent("test")])).toThrow("non-empty string");
  });

  it("rejects empty events array", () => {
    const store = new JsonlEventStore({ filePath: freshPath() });

    expect(() => store.append("stream-1", [])).toThrow("Cannot append zero events");
  });

  it("exposes file path", () => {
    const path = freshPath();
    const store = new JsonlEventStore({ filePath: path });

    expect(store.filePath).toBe(path);
  });
});
