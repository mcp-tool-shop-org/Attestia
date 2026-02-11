/**
 * EVM Observer — Read-only Ethereum/EVM chain observer.
 *
 * Uses viem for all chain interactions.
 * Supports any EVM-compatible chain (Ethereum, Base, Arbitrum, Optimism, Polygon, etc.)
 *
 * Capabilities:
 * - Native token balance (ETH, etc.)
 * - ERC-20 token balance
 * - ERC-20 Transfer event scanning
 *
 * Non-capabilities (by design):
 * - No signing
 * - No transaction submission
 * - No contract deployment
 * - No state modification
 */

import {
  createPublicClient,
  http,
  parseAbiItem,
  type PublicClient,
  type HttpTransport,
  type Chain,
} from "viem";
import {
  mainnet,
  sepolia,
  base,
  arbitrum,
  optimism,
  polygon,
} from "viem/chains";
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

// =============================================================================
// Chain ID to viem Chain mapping
// =============================================================================

const VIEM_CHAINS: Record<string, Chain> = {
  "eip155:1": mainnet,
  "eip155:11155111": sepolia,
  "eip155:8453": base,
  "eip155:42161": arbitrum,
  "eip155:10": optimism,
  "eip155:137": polygon,
};

// ERC-20 ABI fragments (read-only)
const ERC20_BALANCE_OF = parseAbiItem(
  "function balanceOf(address owner) view returns (uint256)"
);
const ERC20_SYMBOL = parseAbiItem(
  "function symbol() view returns (string)"
);
const ERC20_DECIMALS = parseAbiItem(
  "function decimals() view returns (uint8)"
);
const ERC20_TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)"
);

// =============================================================================
// EVM Observer
// =============================================================================

export class EvmObserver implements ChainObserver {
  readonly chainId: string;
  private client: PublicClient<HttpTransport, Chain> | null = null;
  private readonly config: ObserverConfig;

  constructor(config: ObserverConfig) {
    if (!config.chain.chainId.startsWith("eip155:")) {
      throw new Error(
        `EvmObserver: expected EVM chain ID (eip155:*), got '${config.chain.chainId}'`
      );
    }
    this.chainId = config.chain.chainId;
    this.config = config;
  }

  async connect(): Promise<void> {
    const viemChain = VIEM_CHAINS[this.chainId];
    if (!viemChain) {
      throw new Error(
        `EvmObserver: unsupported chain '${this.chainId}'. ` +
          `Supported: ${Object.keys(VIEM_CHAINS).join(", ")}`
      );
    }

    this.client = createPublicClient({
      chain: viemChain,
      transport: http(this.config.rpcUrl, {
        timeout: this.config.timeoutMs ?? 30_000,
      }),
    });
  }

  async disconnect(): Promise<void> {
    this.client = null;
  }

  async getStatus(): Promise<ConnectionStatus> {
    const now = new Date().toISOString();
    if (!this.client) {
      return {
        chainId: this.chainId,
        connected: false,
        checkedAt: now,
      };
    }

    try {
      const blockNumber = await this.client.getBlockNumber();
      return {
        chainId: this.chainId,
        connected: true,
        latestBlock: Number(blockNumber),
        checkedAt: now,
      };
    } catch {
      return {
        chainId: this.chainId,
        connected: false,
        checkedAt: now,
      };
    }
  }

  async getBalance(query: BalanceQuery): Promise<BalanceResult> {
    const client = this.requireClient();
    const address = query.address as `0x${string}`;

    const [balance, blockNumber] = await Promise.all([
      query.atBlock !== undefined
        ? client.getBalance({ address, blockNumber: BigInt(query.atBlock) })
        : client.getBalance({ address }),
      query.atBlock !== undefined
        ? Promise.resolve(BigInt(query.atBlock))
        : client.getBlockNumber(),
    ]);

    return {
      chainId: this.chainId,
      address: query.address,
      balance: balance.toString(),
      decimals: 18,
      symbol: "ETH",
      atBlock: Number(blockNumber),
      observedAt: new Date().toISOString(),
    };
  }

  async getTokenBalance(query: TokenBalanceQuery): Promise<TokenBalance> {
    const client = this.requireClient();
    const tokenAddress = query.token as `0x${string}`;
    const ownerAddress = query.address as `0x${string}`;

    const [balance, symbol, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: [ERC20_BALANCE_OF],
        functionName: "balanceOf",
        args: [ownerAddress],
      }),
      client.readContract({
        address: tokenAddress,
        abi: [ERC20_SYMBOL],
        functionName: "symbol",
      }),
      client.readContract({
        address: tokenAddress,
        abi: [ERC20_DECIMALS],
        functionName: "decimals",
      }),
    ]);

    return {
      chainId: this.chainId,
      address: query.address,
      token: query.token,
      symbol: symbol as string,
      balance: (balance as bigint).toString(),
      decimals: Number(decimals),
      observedAt: new Date().toISOString(),
    };
  }

  async getTransfers(query: TransferQuery): Promise<readonly TransferEvent[]> {
    const client = this.requireClient();
    const address = query.address as `0x${string}`;
    const currentBlock = await client.getBlockNumber();

    const fromBlock = query.fromBlock !== undefined
      ? BigInt(query.fromBlock)
      : currentBlock - 1000n; // Default: last ~1000 blocks
    const toBlock = query.toBlock !== undefined
      ? BigInt(query.toBlock)
      : currentBlock;

    const events: TransferEvent[] = [];
    const now = new Date().toISOString();

    if (query.token) {
      // ERC-20 Transfer events for a specific token
      const tokenAddress = query.token as `0x${string}`;

      // Get incoming transfers
      if (query.direction !== "outgoing") {
        const incomingLogs = await client.getLogs({
          address: tokenAddress,
          event: ERC20_TRANSFER_EVENT,
          args: { to: address },
          fromBlock,
          toBlock,
        });

        for (const log of incomingLogs) {
          events.push(this.logToTransferEvent(log, now));
        }
      }

      // Get outgoing transfers
      if (query.direction !== "incoming") {
        const outgoingLogs = await client.getLogs({
          address: tokenAddress,
          event: ERC20_TRANSFER_EVENT,
          args: { from: address },
          fromBlock,
          toBlock,
        });

        for (const log of outgoingLogs) {
          // Avoid duplicates (self-transfers)
          if (!events.some((e) => e.txHash === log.transactionHash)) {
            events.push(this.logToTransferEvent(log, now));
          }
        }
      }
    } else {
      // ERC-20 Transfer events across all tokens (no specific token filter)
      if (query.direction !== "outgoing") {
        const incomingLogs = await client.getLogs({
          event: ERC20_TRANSFER_EVENT,
          args: { to: address },
          fromBlock,
          toBlock,
        });

        for (const log of incomingLogs) {
          events.push(this.logToTransferEvent(log, now));
        }
      }

      if (query.direction !== "incoming") {
        const outgoingLogs = await client.getLogs({
          event: ERC20_TRANSFER_EVENT,
          args: { from: address },
          fromBlock,
          toBlock,
        });

        for (const log of outgoingLogs) {
          if (!events.some((e) => e.txHash === log.transactionHash)) {
            events.push(this.logToTransferEvent(log, now));
          }
        }
      }
    }

    // Sort by block number (ascending)
    events.sort((a, b) => a.blockNumber - b.blockNumber);

    // Apply limit
    if (query.limit !== undefined && events.length > query.limit) {
      return events.slice(0, query.limit);
    }

    return events;
  }

  // ===========================================================================
  // Private helpers
  // ===========================================================================

  private requireClient(): PublicClient<HttpTransport, Chain> {
    if (!this.client) {
      throw new Error(
        "EvmObserver: not connected. Call connect() before querying."
      );
    }
    return this.client;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private logToTransferEvent(log: any, observedAt: string): TransferEvent {
    return {
      chainId: this.chainId,
      txHash: log.transactionHash ?? "",
      blockNumber: Number(log.blockNumber ?? 0n),
      from: log.args?.from ?? "",
      to: log.args?.to ?? "",
      amount: (log.args?.value ?? 0n).toString(),
      decimals: 18, // ERC-20 default; ideally query per-token
      symbol: "ERC20",
      token: log.address,
      timestamp: new Date().toISOString(), // Block timestamp requires extra query
      observedAt,
    };
  }
}
