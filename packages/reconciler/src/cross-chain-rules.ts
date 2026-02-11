/**
 * Cross-Chain Reconciliation Rules
 *
 * Rules for reconciling events across multiple chains.
 * Prevents double-counting of L2 settlement transactions,
 * links cross-chain events structurally (not semantically),
 * and detects settlement pairs.
 *
 * Design rules:
 * - Pure functions — no side effects
 * - Structural linking only — no semantic merging
 * - Fail-closed: ambiguous matches are flagged, not silently merged
 * - All return types are readonly
 */

// =============================================================================
// Types
// =============================================================================

/**
 * A chain event with enough context for cross-chain reconciliation.
 */
export interface CrossChainEvent {
  readonly chainId: string;
  readonly txHash: string;
  readonly blockNumber: number;
  readonly amount: string;
  readonly symbol: string;
  readonly from: string;
  readonly to: string;
  readonly timestamp: string;
}

/**
 * A linked pair of cross-chain events.
 * The link is structural (same amount, same token, overlapping addresses)
 * and does NOT imply semantic equivalence.
 */
export interface CrossChainLink {
  readonly sourceEvent: CrossChainEvent;
  readonly destEvent: CrossChainEvent;
  readonly linkType: "settlement" | "bridge" | "structural";
  readonly confidence: "high" | "medium" | "low";
  readonly discrepancies: readonly string[];
}

// =============================================================================
// Settlement Pair Detection
// =============================================================================

/** Known L2 → L1 settlement chain ID mapping */
const SETTLEMENT_PAIRS: ReadonlyMap<string, string> = new Map([
  ["eip155:42161", "eip155:1"], // Arbitrum → Ethereum
  ["eip155:10", "eip155:1"],    // Optimism → Ethereum
  ["eip155:8453", "eip155:1"],  // Base → Ethereum
]);

/**
 * Check if two chains form a settlement pair (L2 settles on L1).
 *
 * @returns true if chainA settles on chainB or vice versa
 */
export function isSettlementPair(chainA: string, chainB: string): boolean {
  return (
    SETTLEMENT_PAIRS.get(chainA) === chainB ||
    SETTLEMENT_PAIRS.get(chainB) === chainA
  );
}

/**
 * Get the settlement chain for an L2, if known.
 */
export function getSettlementChain(l2ChainId: string): string | undefined {
  return SETTLEMENT_PAIRS.get(l2ChainId);
}

// =============================================================================
// Double-Counting Prevention
// =============================================================================

/**
 * Remove duplicate events that appear on both an L2 and its settlement chain.
 *
 * Strategy: When the same amount/token/address combination appears on both
 * an L2 and its L1 settlement chain, keep only the L2 event (which is the
 * originating event) and flag the L1 event as a settlement artifact.
 *
 * @param events All events across multiple chains
 * @returns Deduplicated events with settlement artifacts removed
 */
export function preventDoubleCounting(
  events: readonly CrossChainEvent[],
): {
  readonly kept: readonly CrossChainEvent[];
  readonly removed: readonly CrossChainEvent[];
} {
  // Group events by canonical key: amount + symbol + address set
  const eventsByKey = new Map<string, CrossChainEvent[]>();

  for (const event of events) {
    // Create a normalized key from amount + symbol + sorted addresses
    const addresses = [event.from, event.to].sort().join("|");
    const key = `${event.amount}:${event.symbol}:${addresses}`;

    const list = eventsByKey.get(key) ?? [];
    list.push(event);
    eventsByKey.set(key, list);
  }

  const kept: CrossChainEvent[] = [];
  const removed: CrossChainEvent[] = [];

  for (const [, group] of eventsByKey) {
    if (group.length <= 1) {
      kept.push(...group);
      continue;
    }

    // Check if any pair in the group forms a settlement pair
    let hasSettlement = false;
    const settlementL1Events = new Set<CrossChainEvent>();

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]!;
        const b = group[j]!;

        if (isSettlementPair(a.chainId, b.chainId)) {
          hasSettlement = true;
          // Keep the L2 event, remove the L1 settlement artifact
          const l1Chain = getSettlementChain(a.chainId) === b.chainId ? b : a;
          settlementL1Events.add(l1Chain);
        }
      }
    }

    if (hasSettlement) {
      for (const event of group) {
        if (settlementL1Events.has(event)) {
          removed.push(event);
        } else {
          kept.push(event);
        }
      }
    } else {
      // No settlement pair found — keep all
      kept.push(...group);
    }
  }

  return { kept, removed };
}

// =============================================================================
// Structural Linking
// =============================================================================

/**
 * Link cross-chain events that appear structurally related.
 *
 * Structural linking uses heuristics (same amount, same token, overlapping
 * addresses) to identify potentially related events across chains.
 * This does NOT merge events — it only creates references for human review.
 *
 * @param events All events across multiple chains
 * @returns Array of structural links between events
 */
export function linkCrossChainEvents(
  events: readonly CrossChainEvent[],
): readonly CrossChainLink[] {
  const links: CrossChainLink[] = [];

  // Compare all pairs of events from different chains
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;

      // Skip same-chain events
      if (a.chainId === b.chainId) continue;

      // Check for structural similarity
      const discrepancies: string[] = [];
      let matchScore = 0;

      if (a.amount === b.amount) matchScore++;
      else discrepancies.push(`amount: ${a.amount} vs ${b.amount}`);

      if (a.symbol === b.symbol) matchScore++;
      else discrepancies.push(`symbol: ${a.symbol} vs ${b.symbol}`);

      // Check address overlap (from or to matches)
      const addressOverlap =
        a.from === b.from || a.from === b.to ||
        a.to === b.from || a.to === b.to;
      if (addressOverlap) matchScore++;
      else discrepancies.push("no address overlap");

      // Only link if at least 2 of 3 criteria match
      if (matchScore < 2) continue;

      const linkType = isSettlementPair(a.chainId, b.chainId)
        ? "settlement" as const
        : "structural" as const;

      const confidence =
        matchScore === 3 ? "high" as const :
        matchScore === 2 ? "medium" as const :
        "low" as const;

      links.push({
        sourceEvent: a,
        destEvent: b,
        linkType,
        confidence,
        discrepancies,
      });
    }
  }

  return links;
}
