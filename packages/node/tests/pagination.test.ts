/**
 * Tests for pagination utilities — encodeCursor, decodeCursor, paginate.
 */

import { describe, it, expect } from "vitest";
import {
  encodeCursor,
  decodeCursor,
  paginate,
} from "../src/types/pagination.js";

// =============================================================================
// decodeCursor
// =============================================================================

describe("decodeCursor", () => {
  it("round-trips with encodeCursor", () => {
    const cursor = encodeCursor("createdAt", "2024-01-01T00:00:00Z");
    const decoded = decodeCursor(cursor);

    expect(decoded).toEqual({
      field: "createdAt",
      value: "2024-01-01T00:00:00Z",
    });
  });

  it("returns undefined for invalid base64", () => {
    expect(decodeCursor("!!!not-base64!!!")).toBeUndefined();
  });

  it("returns undefined for valid base64 but invalid JSON", () => {
    const notJson = Buffer.from("not json at all").toString("base64url");
    expect(decodeCursor(notJson)).toBeUndefined();
  });

  it("returns undefined when decoded JSON lacks required fields", () => {
    const missingV = Buffer.from(JSON.stringify({ f: "ok" })).toString(
      "base64url",
    );
    expect(decodeCursor(missingV)).toBeUndefined();

    const missingF = Buffer.from(JSON.stringify({ v: "ok" })).toString(
      "base64url",
    );
    expect(decodeCursor(missingF)).toBeUndefined();
  });

  it("returns undefined for non-object JSON", () => {
    const arr = Buffer.from(JSON.stringify([1, 2])).toString("base64url");
    expect(decodeCursor(arr)).toBeUndefined();

    const num = Buffer.from(JSON.stringify(42)).toString("base64url");
    expect(decodeCursor(num)).toBeUndefined();
  });
});

// =============================================================================
// paginate
// =============================================================================

interface Item {
  id: string;
}

const items: Item[] = [
  { id: "a" },
  { id: "b" },
  { id: "c" },
  { id: "d" },
  { id: "e" },
];

const getId = (item: Item) => item.id;

describe("paginate", () => {
  it("returns first page with hasMore when items exceed limit", () => {
    const result = paginate(items, { limit: 2 }, getId, "id");

    expect(result.data).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.cursor).not.toBeNull();
  });

  it("returns all items when limit exceeds array length", () => {
    const result = paginate(items, { limit: 10 }, getId, "id");

    expect(result.data).toEqual(items);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.cursor).toBeNull();
  });

  it("applies cursor to skip past items", () => {
    // Get cursor pointing to "b"
    const cursor = encodeCursor("id", "b");
    const result = paginate(items, { cursor, limit: 2 }, getId, "id");

    expect(result.data).toEqual([{ id: "c" }, { id: "d" }]);
    expect(result.pagination.hasMore).toBe(true);
  });

  it("returns remaining items after cursor at end", () => {
    const cursor = encodeCursor("id", "d");
    const result = paginate(items, { cursor, limit: 10 }, getId, "id");

    expect(result.data).toEqual([{ id: "e" }]);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.cursor).toBeNull();
  });

  it("ignores invalid cursor and returns from start", () => {
    const result = paginate(
      items,
      { cursor: "garbage", limit: 3 },
      getId,
      "id",
    );

    expect(result.data).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("returns empty result for empty items", () => {
    const result = paginate([], { limit: 5 }, getId, "id");

    expect(result.data).toEqual([]);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.cursor).toBeNull();
  });
});
