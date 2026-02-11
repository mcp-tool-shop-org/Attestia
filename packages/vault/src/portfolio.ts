/**
 * Portfolio Observer — Multi-chain portfolio aggregation.
 *
 * Takes an ObserverRegistry from @attestia/chain-observer and
 * builds a unified portfolio view across all watched addresses.
 *
 * Rules:
 * - Read-only: no signing, no execution
 * - Aggregates by currency across chains
 * - Fails gracefully on individual chain errors
 * - Always records observation timestamp
 */

import type { ObserverRegistry, TransferQuery } from "@attestia/chain-observer";

import type {
  Portfolio,
  TokenPosition,
  CurrencyTotal,
  WatchedAddress,
} from "./types.js";
import { formatAmount } from "@attestia/ledger";

// =============================================================================
// Portfolio Observer
// =============================================================================

export class PortfolioObserver {
  private readonly registry: ObserverRegistry;

  constructor(registry: ObserverRegistry) {
    this.registry = registry;
  }

  /**
   * Observe the full portfolio for an owner across all watched addresses.
   * Individual chain/address failures don't block the overall observation.
   */
  async observe(
    ownerId: string,
    addresses: readonly WatchedAddress[],
  ): Promise<Portfolio> {
    const now = new Date().toISOString();
    const nativePositions: TokenPosition[] = [];
    const tokenPositions: TokenPosition[] = [];
    const errors: string[] = [];

    // Query native balances for each watched address
    for (const addr of addresses) {
      if (!this.registry.has(addr.chainId)) {
        errors.push(`No observer for chain '${addr.chainId}'`);
        continue;
      }

      try {
        const observer = this.registry.get(addr.chainId);
        const result = await observer.getBalance({ address: addr.address });

        nativePositions.push({
          chainId: result.chainId,
          address: addr.address,
          symbol: result.symbol,
          balance: result.balance,
          decimals: result.decimals,
          observedAt: result.observedAt,
        });
      } catch (err) {
        errors.push(
          `Failed to get balance for ${addr.address} on ${addr.chainId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Aggregate totals
    const totals = this.aggregateTotals([...nativePositions, ...tokenPositions]);

    return {
      ownerId,
      nativePositions,
      tokenPositions,
      observedAt: now,
      totals,
    };
  }

  /**
   * Observe a specific token position for an address.
   */
  async observeToken(
    address: WatchedAddress,
    token: string,
    issuer?: string,
  ): Promise<TokenPosition | null> {
    if (!this.registry.has(address.chainId)) {
      return null;
    }

    try {
      const observer = this.registry.get(address.chainId);
      const query = issuer !== undefined
        ? { address: address.address, token, issuer }
        : { address: address.address, token };
      const result = await observer.getTokenBalance(query);

      return {
        chainId: result.chainId,
        address: address.address,
        symbol: result.symbol,
        balance: result.balance,
        decimals: result.decimals,
        token: result.token,
        observedAt: result.observedAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get transfer history for an address.
   */
  async getTransfers(
    address: WatchedAddress,
    options?: {
      direction?: "incoming" | "outgoing" | "both";
      token?: string;
      fromBlock?: number;
      toBlock?: number;
      limit?: number;
    },
  ) {
    if (!this.registry.has(address.chainId)) {
      return [];
    }

    const observer = this.registry.get(address.chainId);
    const transferQuery: TransferQuery = Object.assign(
      { address: address.address },
      options?.direction !== undefined ? { direction: options.direction } : {},
      options?.token !== undefined ? { token: options.token } : {},
      options?.fromBlock !== undefined ? { fromBlock: options.fromBlock } : {},
      options?.toBlock !== undefined ? { toBlock: options.toBlock } : {},
      options?.limit !== undefined ? { limit: options.limit } : {},
    );
    return observer.getTransfers(transferQuery);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────────

  private aggregateTotals(
    positions: readonly TokenPosition[],
  ): readonly CurrencyTotal[] {
    const totals = new Map<
      string,
      { balance: bigint; decimals: number; chainIds: Set<string> }
    >();

    for (const pos of positions) {
      const key = pos.symbol;
      const existing = totals.get(key);

      const amount = BigInt(pos.balance);

      if (existing) {
        existing.balance += amount;
        existing.chainIds.add(pos.chainId);
      } else {
        totals.set(key, {
          balance: amount,
          decimals: pos.decimals,
          chainIds: new Set([pos.chainId]),
        });
      }
    }

    return [...totals.entries()].map(([currency, data]) => ({
      currency,
      totalBalance: formatAmount(data.balance, data.decimals),
      decimals: data.decimals,
      chainCount: data.chainIds.size,
    }));
  }
}
