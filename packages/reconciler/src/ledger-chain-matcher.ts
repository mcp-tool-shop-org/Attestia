/**
 * Ledger ↔ Chain Matcher
 *
 * Matches ledger entries to on-chain transfer events using txHash.
 *
 * Detects:
 * - Ledger entries with txHash but no matching on-chain event
 * - On-chain events with no matching ledger entry
 * - Amount mismatches between ledger and chain
 */

import { parseAmount, formatAmount } from "@attestia/ledger";
import type {
  LedgerChainMatch,
  ReconcilableLedgerEntry,
  ReconcilableChainEvent,
} from "./types.js";

export class LedgerChainMatcher {
  /**
   * Match ledger entries against on-chain events.
   *
   * Strategy:
   * 1. Index chain events by txHash
   * 2. For each ledger entry with a txHash, find the matching chain event
   * 3. Compare amounts (converting chain amounts from raw to same decimal basis)
   * 4. Report mismatches and orphans
   */
  match(
    ledgerEntries: readonly ReconcilableLedgerEntry[],
    chainEvents: readonly ReconcilableChainEvent[],
  ): readonly LedgerChainMatch[] {
    const results: LedgerChainMatch[] = [];

    // Index chain events by txHash
    const byTxHash = new Map<string, ReconcilableChainEvent[]>();
    const matchedTxHashes = new Set<string>();

    for (const event of chainEvents) {
      const list = byTxHash.get(event.txHash) ?? [];
      list.push(event);
      byTxHash.set(event.txHash, list);
    }

    // Match ledger entries to chain events
    for (const entry of ledgerEntries) {
      if (!entry.txHash) continue; // Only match entries that reference a chain tx

      const events = byTxHash.get(entry.txHash);

      if (!events || events.length === 0) {
        results.push({
          correlationId: entry.correlationId,
          txHash: entry.txHash,
          status: "missing-chain",
          ledgerAmount: entry.money,
          discrepancies: [
            `Ledger entry ${entry.id} references txHash ${entry.txHash} but no on-chain event found`,
          ],
        });
        continue;
      }

      matchedTxHashes.add(entry.txHash);

      // Find the event that matches the same currency/symbol
      const matchingEvent = events.find(
        (e) => e.symbol === entry.money.currency,
      );

      if (!matchingEvent) {
        results.push({
          correlationId: entry.correlationId,
          txHash: entry.txHash,
          chainId: events[0]!.chainId,
          status: "amount-mismatch",
          ledgerAmount: entry.money,
          chainAmount: events[0]!.amount,
          chainDecimals: events[0]!.decimals,
          discrepancies: [
            `Currency mismatch: ledger=${entry.money.currency} chain=${events[0]!.symbol}`,
          ],
        });
        continue;
      }

      // Compare amounts
      const ledgerRaw = parseAmount(entry.money.amount, entry.money.decimals);
      // Chain amount is already in smallest unit (wei/drops)
      const chainRaw = BigInt(matchingEvent.amount);

      const discrepancies: string[] = [];
      const sameDecimals = entry.money.decimals === matchingEvent.decimals;

      let amountMatches: boolean;
      if (sameDecimals) {
        amountMatches = ledgerRaw === chainRaw;
        if (!amountMatches) {
          discrepancies.push(
            `Amount mismatch: ledger=${formatAmount(ledgerRaw, entry.money.decimals)} ` +
            `chain=${formatAmount(chainRaw, matchingEvent.decimals)}`,
          );
        }
      } else {
        // Different decimal bases — normalize to the higher precision
        const maxDec = Math.max(entry.money.decimals, matchingEvent.decimals);
        const lNorm = ledgerRaw * 10n ** BigInt(maxDec - entry.money.decimals);
        const cNorm = chainRaw * 10n ** BigInt(maxDec - matchingEvent.decimals);
        amountMatches = lNorm === cNorm;
        if (!amountMatches) {
          discrepancies.push(
            `Amount mismatch (cross-decimal): ledger=${formatAmount(ledgerRaw, entry.money.decimals)} ` +
            `(${entry.money.decimals} dec) chain=${formatAmount(chainRaw, matchingEvent.decimals)} ` +
            `(${matchingEvent.decimals} dec)`,
          );
        }
      }

      results.push({
        correlationId: entry.correlationId,
        txHash: entry.txHash,
        chainId: matchingEvent.chainId,
        status: amountMatches ? "matched" : "amount-mismatch",
        ledgerAmount: entry.money,
        chainAmount: matchingEvent.amount,
        chainDecimals: matchingEvent.decimals,
        discrepancies,
      });
    }

    // Find unmatched chain events (no ledger entry references them)
    for (const event of chainEvents) {
      if (!matchedTxHashes.has(event.txHash)) {
        results.push({
          correlationId: `unmatched:${event.txHash}`,
          txHash: event.txHash,
          chainId: event.chainId,
          status: "missing-ledger",
          chainAmount: event.amount,
          chainDecimals: event.decimals,
          discrepancies: [
            `On-chain event ${event.txHash} has no matching ledger entry`,
          ],
        });
      }
    }

    return results;
  }
}
