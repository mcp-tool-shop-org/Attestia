/**
 * Tests for JSONL corruption recovery.
 *
 * Verifies that the JsonlEventStore handles malformed files gracefully:
 * - Truncated last line
 * - Corrupt middle line
 * - Empty lines
 * - Empty file
 * - All lines corrupt
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { JsonlEventStore } from "../src/jsonl-store.js";
import type { DomainEvent } from "@attestia/types";

const testDir = join(process.cwd(), ".test-corruption-recovery");

const event1: DomainEvent = {
  type: "test.created",
  metadata: {},
  payload: { name: "first" },
};

const event2: DomainEvent = {
  type: "test.updated",
  metadata: {},
  payload: { name: "second" },
};

function createStoreWithEvents(filePath: string): void {
  const store = new JsonlEventStore({ filePath });
  store.append("s1", [event1, event2]);
}

beforeEach(() => {
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe("corruption recovery", () => {
  it("loads events from a valid file", () => {
    const fp = join(testDir, "valid.jsonl");
    createStoreWithEvents(fp);

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    expect(events).toHaveLength(2);
  });

  it("handles truncated last line", () => {
    const fp = join(testDir, "truncated.jsonl");
    createStoreWithEvents(fp);

    // Append a truncated line
    writeFileSync(fp, '{"event":{"type":"test","metadata":{},"payload":{}},', {
      flag: "a",
    });

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    // Should load the 2 valid events and skip the truncated one
    expect(events).toHaveLength(2);
  });

  it("handles corrupt middle line", () => {
    const fp = join(testDir, "corrupt-middle.jsonl");

    // Write valid first event, corrupt line, valid third event manually
    const store1 = new JsonlEventStore({ filePath: fp });
    store1.append("s1", [event1]);

    // Append corrupt line
    writeFileSync(fp, "NOT VALID JSON\n", { flag: "a" });

    // Append another valid event in a new store
    const store2 = new JsonlEventStore({ filePath: fp });
    store2.append("s1", [event2]);

    // Reload — should have the events before and after the corrupt line
    const store3 = new JsonlEventStore({ filePath: fp });
    const events = store3.readAll();
    // At least the first event should be recovered
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty lines between events", () => {
    const fp = join(testDir, "empty-lines.jsonl");
    createStoreWithEvents(fp);

    // Append some empty lines
    writeFileSync(fp, "\n\n\n", { flag: "a" });

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    expect(events).toHaveLength(2);
  });

  it("handles completely empty file", () => {
    const fp = join(testDir, "empty.jsonl");
    writeFileSync(fp, "");

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    expect(events).toHaveLength(0);
    expect(store.globalPosition()).toBe(0);
  });

  it("handles file with only whitespace", () => {
    const fp = join(testDir, "whitespace.jsonl");
    writeFileSync(fp, "  \n  \n  \n");

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    expect(events).toHaveLength(0);
  });

  it("handles file where all lines are corrupt", () => {
    const fp = join(testDir, "all-corrupt.jsonl");
    writeFileSync(fp, "bad1\nbad2\nbad3\n");

    const store = new JsonlEventStore({ filePath: fp });
    const events = store.readAll();
    expect(events).toHaveLength(0);
  });

  it("can append after recovering from corruption", () => {
    const fp = join(testDir, "recover-append.jsonl");
    writeFileSync(fp, "corrupt line\n");

    const store = new JsonlEventStore({ filePath: fp });
    expect(store.readAll()).toHaveLength(0);

    // Should be able to append new events
    store.append("s1", [event1]);
    expect(store.readAll()).toHaveLength(1);

    // Verify hash chain is valid for the new event
    const result = store.verifyIntegrity();
    expect(result.valid).toBe(true);
  });
});
