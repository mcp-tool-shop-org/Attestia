/**
 * Cursor-based pagination types.
 *
 * Cursors are base64url-encoded JSON objects: { field, value }.
 * List endpoints return { data, pagination: { cursor, hasMore } }.
 */

// =============================================================================
// Types
// =============================================================================

export interface PaginationQuery {
  readonly cursor?: string | undefined;
  readonly limit: number;
}

export interface PaginationMeta {
  readonly cursor: string | null;
  readonly hasMore: boolean;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly pagination: PaginationMeta;
}

// =============================================================================
// Cursor Encoding
// =============================================================================

interface CursorData {
  readonly f: string; // field name (compact key)
  readonly v: string; // last seen value
}

/**
 * Encode a cursor from field name and last seen value.
 */
export function encodeCursor(field: string, value: string): string {
  const data: CursorData = { f: field, v: value };
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

/**
 * Decode a cursor into field name and last seen value.
 *
 * @returns Decoded cursor, or undefined if the cursor is invalid.
 */
export function decodeCursor(
  cursor: string,
): { field: string; value: string } | undefined {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf-8");
    const data = JSON.parse(json) as Record<string, unknown>;
    if (
      typeof data === "object" &&
      data !== null &&
      typeof data["f"] === "string" &&
      typeof data["v"] === "string"
    ) {
      return { field: data["f"], value: data["v"] };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Apply cursor-based pagination to a sorted array.
 *
 * Items must be sorted by the cursor field in ascending order.
 * Returns the page items, next cursor, and hasMore flag.
 */
export function paginate<T>(
  items: readonly T[],
  query: PaginationQuery,
  getField: (item: T) => string,
  fieldName: string,
): PaginatedResponse<T> {
  let filtered = items;

  // Apply cursor filter
  if (query.cursor !== undefined) {
    const decoded = decodeCursor(query.cursor);
    if (decoded !== undefined) {
      const cursorValue = decoded.value;
      filtered = filtered.filter((item) => getField(item) > cursorValue);
    }
  }

  // Fetch one extra to detect hasMore
  const page = filtered.slice(0, query.limit + 1);
  const hasMore = page.length > query.limit;
  const data = hasMore ? page.slice(0, query.limit) : page;

  const cursor =
    hasMore && data.length > 0
      ? encodeCursor(fieldName, getField(data[data.length - 1]!))
      : null;

  return { data, pagination: { cursor, hasMore } };
}
