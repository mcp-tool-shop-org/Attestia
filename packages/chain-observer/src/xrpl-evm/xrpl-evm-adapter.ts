/**
 * XRPL EVM Sidechain Adapter
 *
 * Wraps EvmObserver for the XRPL EVM sidechain, which is a standard
 * EVM-compatible chain connected to XRPL via a bridge.
 *
 * Architecture decision (AD-3): The XRPL EVM sidechain speaks standard
 * EVM JSON-RPC, so we delegate all chain interaction to EvmObserver
 * and layer bridge-specific detection on top.
 *
 * Capabilities:
 * - All standard EvmObserver operations (balance, token balance, transfers)
 * - Bridge transaction detection via known bridge contract addresses
 * - Cross-chain reference mapping (XRPL txHash + sidechain txHash)
 *
 * Non-capabilities:
 * - No XRPL-native operations (use XrplObserver for that)
 * - No bridge execution (read-only)
 */

import { EvmObserver } from "../evm/evm-observer.js";
import { isBridgeContract, normalizeBridgeEvent } from "./bridge-event.js";
import type {
  ChainObserver,
  ObserverConfig,
  BalanceQuery,
  BalanceResult,
  TokenBalanceQuery,
  TokenBalance,
  TransferQuery,
  TransferEvent,
  ConnectionStatus,
} from "../observer.js";
import type { BridgeEvent } from "./bridge-event.js";

// =============================================================================
// XRPL EVM Adapter
// =============================================================================

export class XrplEvmAdapter implements ChainObserver {
  readonly chainId: string;
  private readonly inner: EvmObserver;
  private readonly xrplChainId: string;

  /**
   * @param config Observer config — chain must be an XRPL EVM sidechain (eip155:*)
   * @param xrplChainId The XRPL mainnet/testnet chain ID for bridge reference mapping
   */
  constructor(config: ObserverConfig, xrplChainId = "xrpl:main") {
    this.inner = new EvmObserver(config);
    this.chainId = this.inner.chainId;
    this.xrplChainId = xrplChainId;
  }

  // ===========================================================================
  // ChainObserver delegation
  // ===========================================================================

  async connect(): Promise<void> {
    return this.inner.connect();
  }

  async disconnect(): Promise<void> {
    return this.inner.disconnect();
  }

  async getStatus(): Promise<ConnectionStatus> {
    return this.inner.getStatus();
  }

  async getBalance(query: BalanceQuery): Promise<BalanceResult> {
    return this.inner.getBalance(query);
  }

  async getTokenBalance(query: TokenBalanceQuery): Promise<TokenBalance> {
    return this.inner.getTokenBalance(query);
  }

  async getTransfers(query: TransferQuery): Promise<readonly TransferEvent[]> {
    return this.inner.getTransfers(query);
  }

  // ===========================================================================
  // Bridge-specific operations
  // ===========================================================================

  /**
   * Detect bridge transactions from transfer events.
   *
   * Scans transfer events and identifies those that interact with
   * known bridge contracts. These are likely bridge operations
   * between XRPL and the EVM sidechain.
   *
   * @param query Transfer query parameters
   * @returns Bridge events detected from transfers
   */
  async detectBridgeTransfers(
    query: TransferQuery,
  ): Promise<readonly BridgeEvent[]> {
    const transfers = await this.inner.getTransfers(query);
    const bridgeEvents: BridgeEvent[] = [];

    for (const transfer of transfers) {
      // Check if the transfer involves a known bridge contract
      if (
        (transfer.token && isBridgeContract(transfer.token)) ||
        isBridgeContract(transfer.from) ||
        isBridgeContract(transfer.to)
      ) {
        bridgeEvents.push(
          normalizeBridgeEvent({
            sourceChainId: this.chainId,
            destChainId: this.xrplChainId,
            sourceTxHash: transfer.txHash,
            amount: transfer.amount,
            symbol: transfer.symbol,
            sender: transfer.from,
            recipient: transfer.to,
            sourceTimestamp: transfer.timestamp,
            // destTxHash is unknown here — requires cross-chain correlation
          }),
        );
      }
    }

    return bridgeEvents;
  }

  /**
   * Create a cross-chain reference mapping between an XRPL transaction
   * and an EVM sidechain transaction.
   *
   * This is a structural mapping — it does NOT verify that the
   * transactions are actually related. Verification requires
   * bridge proof validation.
   *
   * @param xrplTxHash Transaction hash on XRPL
   * @param evmTxHash Transaction hash on EVM sidechain
   * @param params Additional bridge event parameters
   * @returns Normalized bridge event with both hashes
   */
  createCrossChainRef(
    xrplTxHash: string,
    evmTxHash: string,
    params: {
      amount: string;
      symbol: string;
      sender: string;
      recipient: string;
      sourceTimestamp: string;
      destTimestamp?: string;
      bridgeProofRef?: string;
    },
  ): BridgeEvent {
    return normalizeBridgeEvent({
      sourceChainId: this.xrplChainId,
      destChainId: this.chainId,
      sourceTxHash: xrplTxHash,
      destTxHash: evmTxHash,
      status: "confirmed",
      ...params,
    });
  }
}
