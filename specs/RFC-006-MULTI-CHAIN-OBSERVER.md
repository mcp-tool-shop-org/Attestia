# RFC-006: Multi-Chain Observer Protocol

**Status:** Draft
**Authors:** Attestia Team
**Created:** 2025-06-15
**Phase:** 11 — Multi-Chain Expansion

## 1. Abstract

This RFC defines the chain observation protocol for heterogeneous multi-chain environments. It specifies how Attestia observes, normalizes, and replays events across EVM chains (L1 + L2), Solana, and XRPL EVM sidechains while maintaining deterministic replay guarantees.

## 2. Chain Family Abstraction

### 2.1 CAIP-2 Chain Identifiers

All chains use CAIP-2 identifiers:

| Family | Format | Examples |
|--------|--------|----------|
| EVM | `eip155:{chainId}` | `eip155:1`, `eip155:42161`, `eip155:8453` |
| Solana | `solana:{network}` | `solana:mainnet-beta`, `solana:devnet` |
| XRPL | `xrpl:{network}` | `xrpl:mainnet`, `xrpl:testnet` |
| XRPL EVM | `eip155:{chainId}` | `eip155:1440002` |

### 2.2 ChainObserver Interface

All observers implement the `ChainObserver` interface:

- `connect()` / `disconnect()` — Lifecycle management
- `getStatus()` — Connection and block height
- `getBalance(query)` — Native balance with chain-specific decimals/symbol
- `getTokenBalance(query)` — Token balance
- `getTransfers(query)` — Transfer event enumeration

## 3. Finality Model

### 3.1 FinalityConfig

Each chain has a finality configuration:

- `confirmations` — Number of confirmations for finality
- `safeBlockTag` / `finalizedBlockTag` — EVM block tags
- `reorgDepth` — Maximum expected reorg depth
- `commitmentLevel` — Solana commitment (`processed`, `confirmed`, `finalized`)

### 3.2 Chain Profiles

Predefined profiles encode finality assumptions:

| Chain | Confirmations | Reorg Depth | Settlement |
|-------|---------------|-------------|------------|
| Ethereum | 12 | 64 | Self |
| Arbitrum | 1 | 0 | Ethereum |
| Optimism | 1 | 0 | Ethereum |
| Base | 1 | 0 | Ethereum |
| Solana | 1 (finalized) | 0 | Self |

## 4. Event Canonicalization

### 4.1 Canonical Form

All events are canonicalized for deterministic replay:

1. Addresses lowercased
2. Amounts as decimal strings (no leading zeros)
3. Timestamps in ISO 8601 UTC
4. Chain-specific fields normalized per family

### 4.2 Cross-Chain Keys

Event keys include chain ID to prevent collision:

```
{chainId}:{txHash}:{logIndex}
```

## 5. Cross-Chain Reconciliation

### 5.1 Settlement Pairs

L2 chains settle to L1 chains. Settlement pairs are declared in `SETTLEMENT_PAIRS`:

- Arbitrum → Ethereum
- Optimism → Ethereum
- Base → Ethereum

### 5.2 Double-Counting Prevention

Events appearing on both L2 and settlement L1 are deduplicated by retaining only the L2 event, preventing double-counting of settled transactions.

## 6. Replay Determinism

### 6.1 Guarantee

Given the same RPC responses, two independent observer instances produce byte-identical `TransferEvent[]` arrays. This is validated by:

- Replay determinism tests (per chain)
- Multi-chain replay audit (cross-chain)
- Fuzz testing for edge cases

### 6.2 Hash Chains

Per-chain hash chains provide tamper evidence:

```
H(n) = SHA-256(H(n-1) + canonical(event_n))
H(0) = SHA-256("genesis:" + chainId)
```

## 7. Bridge Events

### 7.1 XRPL EVM Sidechain Bridge

Bridge events between XRPL and its EVM sidechain are tracked with:

- Source chain ID and tx hash
- Destination chain ID and tx hash (when confirmed)
- Status: `pending`, `confirmed`, `failed`
- Bridge proof reference

### 7.2 Normalization

Bridge events are normalized to canonical form. Normalization is idempotent.

## 8. Security Considerations

- Chain IDs prevent cross-chain collision
- Reorg detection fails closed (no partial events)
- Bridge events are never silently merged
- Settlement pair links are structural only
