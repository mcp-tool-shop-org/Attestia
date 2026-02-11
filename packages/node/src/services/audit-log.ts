/**
 * Append-only audit log for recording who-did-what-when.
 *
 * Used by route handlers to record mutations for compliance
 * and debugging. In-memory only — survives as long as the process.
 */

// =============================================================================
// Types
// =============================================================================

export interface AuditLogEntry {
  readonly timestamp: string;
  readonly tenantId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly actor: string;
  readonly detail?: string | undefined;
}

export interface AuditLogQuery {
  readonly tenantId?: string | undefined;
  readonly action?: string | undefined;
  readonly resourceType?: string | undefined;
  readonly resourceId?: string | undefined;
  readonly limit?: number | undefined;
}

// =============================================================================
// AuditLog
// =============================================================================

export class AuditLog {
  private readonly _entries: AuditLogEntry[] = [];

  /**
   * Append an entry to the audit log.
   */
  append(entry: Omit<AuditLogEntry, "timestamp">): void {
    this._entries.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Query audit log entries with optional filters.
   *
   * Returns newest-first by default.
   */
  query(filter?: AuditLogQuery): readonly AuditLogEntry[] {
    let results: AuditLogEntry[] = this._entries;

    if (filter?.tenantId !== undefined) {
      results = results.filter((e) => e.tenantId === filter.tenantId);
    }
    if (filter?.action !== undefined) {
      results = results.filter((e) => e.action === filter.action);
    }
    if (filter?.resourceType !== undefined) {
      results = results.filter((e) => e.resourceType === filter.resourceType);
    }
    if (filter?.resourceId !== undefined) {
      results = results.filter((e) => e.resourceId === filter.resourceId);
    }

    // Newest first
    results = [...results].reverse();

    if (filter?.limit !== undefined && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Total number of entries.
   */
  get size(): number {
    return this._entries.length;
  }
}
