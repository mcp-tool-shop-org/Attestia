/**
 * Multi-Chain Replay Auditor
 *
 * Replays events across multiple chains and computes per-chain hash chains
 * plus a combined cross-chain hash. Used to verify that multi-chain state
 * is consistent and tamper-evident.
 *
 * Design:
 * - Per-chain hash chains for isolation
 * - Combined cross-chain hash for holistic integrity
 * - Deterministic: same events → same result (always)
 * - Fail-closed: any divergence → audit failure
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";

// =============================================================================
// Types
// =============================================================================

/**
 * A single chain's event for replay.
 */
export interface ChainEvent {
  /** Chain identifier (e.g., "eip155:1", "solana:mainnet-beta") */
  readonly chainId: string;

  /** Event hash or unique identifier */
  readonly eventHash: string;

  /** Event sequence index within the chain */
  readonly sequenceIndex: number;

  /** ISO 8601 timestamp */
  readonly timestamp: string;

  /** Event data (canonical JSON-serializable) */
  readonly data: Record<string, unknown>;
}

/**
 * Result of replaying a single chain.
 */
export interface ChainReplayResult {
  /** Chain identifier */
  readonly chainId: string;

  /** Final hash-chain digest for this chain */
  readonly hashChain: string;

  /** Number of events replayed */
  readonly eventCount: number;

  /** Hash of the first event (for anchoring) */
  readonly firstEventHash: string;

  /** Hash of the last event */
  readonly lastEventHash: string;
}

/**
 * Result of a full multi-chain replay audit.
 */
export interface MultiChainAuditResult {
  /** Overall audit verdict */
  readonly verdict: "PASS" | "FAIL";

  /** Combined cross-chain hash */
  readonly combinedHash: string;

  /** Per-chain replay results */
  readonly chains: readonly ChainReplayResult[];

  /** ISO 8601 timestamp of the audit */
  readonly auditedAt: string;

  /** Discrepancies found (empty if PASS) */
  readonly discrepancies: readonly string[];
}

// =============================================================================
// Multi-Chain Replay Auditor
// =============================================================================

/**
 * Compute the hash chain for a single chain's events.
 *
 * Each event's hash is chained: H(n) = SHA-256(H(n-1) + canonical(event))
 * The initial hash H(0) = SHA-256("genesis:" + chainId).
 */
export function computeChainHashChain(
  chainId: string,
  events: readonly ChainEvent[],
): ChainReplayResult {
  let currentHash = sha256(`genesis:${chainId}`);
  let firstHash = "";
  let lastHash = "";

  for (const event of events) {
    const eventCanonical = canonicalize({
      chainId: event.chainId,
      eventHash: event.eventHash,
      sequenceIndex: event.sequenceIndex,
      data: event.data,
    });

    currentHash = sha256(currentHash + eventCanonical);

    if (firstHash === "") {
      firstHash = currentHash;
    }
    lastHash = currentHash;
  }

  return {
    chainId,
    hashChain: currentHash,
    eventCount: events.length,
    firstEventHash: firstHash || currentHash,
    lastEventHash: lastHash || currentHash,
  };
}

/**
 * Compute the combined cross-chain hash from per-chain results.
 *
 * Sorts chain results by chainId for determinism, then combines
 * all hash chains into a single digest.
 */
export function computeCombinedHash(
  chainResults: readonly ChainReplayResult[],
): string {
  const sorted = [...chainResults].sort((a, b) =>
    a.chainId.localeCompare(b.chainId),
  );

  const combined = canonicalize({
    chains: sorted.map((r) => ({
      chainId: r.chainId,
      hashChain: r.hashChain,
      eventCount: r.eventCount,
    })),
  });

  return sha256(combined);
}

/**
 * Run a full multi-chain replay audit.
 *
 * Groups events by chain, computes per-chain hash chains,
 * then produces a combined cross-chain hash.
 *
 * @param events All events across all chains
 * @param expectedCombinedHash Optional expected hash (for comparison)
 * @returns MultiChainAuditResult
 */
export function auditMultiChainReplay(
  events: readonly ChainEvent[],
  expectedCombinedHash?: string,
): MultiChainAuditResult {
  // Group events by chain
  const byChain = new Map<string, ChainEvent[]>();
  for (const event of events) {
    const existing = byChain.get(event.chainId) ?? [];
    existing.push(event);
    byChain.set(event.chainId, existing);
  }

  // Sort events within each chain by sequence index
  for (const [, chainEvents] of byChain) {
    chainEvents.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  }

  // Compute per-chain hash chains
  const chainResults: ChainReplayResult[] = [];
  for (const [chainId, chainEvents] of byChain) {
    chainResults.push(computeChainHashChain(chainId, chainEvents));
  }

  // Compute combined hash
  const combinedHash = computeCombinedHash(chainResults);

  // Check for discrepancies
  const discrepancies: string[] = [];
  if (expectedCombinedHash && combinedHash !== expectedCombinedHash) {
    discrepancies.push(
      `Combined hash mismatch: expected ${expectedCombinedHash}, got ${combinedHash}`,
    );
  }

  return {
    verdict: discrepancies.length === 0 ? "PASS" : "FAIL",
    combinedHash,
    chains: chainResults,
    auditedAt: new Date().toISOString(),
    discrepancies,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
