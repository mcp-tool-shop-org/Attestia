# Ethereum Reference

Chain-specific details relevant to our stack.

---

## Current State (Feb 2026)

- **DeFi TVL:** $55.7B
- **Stablecoin MCap:** $159.2B
- **24h DEX Volume:** $1.8B
- **Active Addresses:** ~795K daily
- **Latest upgrade:** Fusaka (Dec 2025)
- **Next upgrade:** Glamsterdam (2026)

## Key Upgrades for Our Stack

### EIP-7702 (Live — Pectra, May 2025)
- EOAs can permanently delegate to smart contract code
- Enables: batching, sponsorship, privilege de-escalation
- Forward-compatible with endgame account abstraction
- **Our use:** Smart wallet flows for intent approval in Personal Vault and Org Treasury
- **Spec:** https://eips.ethereum.org/EIPS/eip-7702

### EIP-4337 (Live — March 2023)
- Account abstraction without protocol changes
- UserOperation objects bundled by validators
- 26M+ smart accounts deployed, 170M+ UserOperations
- **Our use:** Smart contract wallet infrastructure for multi-sig treasury
- **Spec:** https://eips.ethereum.org/EIPS/eip-4337

### Proto-Danksharding / EIP-4844 (Live — Dencun, March 2024)
- Blob transactions for cheaper L2 data
- Reduced rollup costs significantly
- **Our use:** Cheaper multi-chain observation on L2s

### PeerDAS (Live — Fusaka, Dec 2025)
- Peer-to-peer data availability sampling
- More efficient L2 data availability
- **Our use:** Further reduced observation costs

### Glamsterdam (2026)
- Enshrined Proposer-Builder Separation (ePBS)
- Block-level Access Lists (BALs)
- **Our use:** More predictable block construction, better MEV protection

### Future Roadmap
- **Full Danksharding:** Massive L2 scalability
- **Single-Slot Finality:** Blocks finalized in one slot (not 15 min)
- **Statelessness:** Light nodes verify without full state — cheaper observation
- **Verkle Trees:** Reduced proof sizes

## EVM DeFi Primitives

| Primitive | Examples | Relevance |
|-----------|----------|-----------|
| DEX (AMM) | Uniswap, Curve | Token swaps, liquidity |
| Lending | Aave, Compound | Yield on stablecoin holdings |
| Stablecoins | USDC, USDS, GHO | Payment medium |
| Yield aggregators | Yearn | Portfolio optimization |
| Insurance | Etherisc | Risk management |
| Governance | Governor, Snapshot | DAO voting |

## Key Standards

| Standard | Purpose |
|----------|---------|
| ERC-20 | Fungible tokens |
| ERC-721 | Non-fungible tokens |
| ERC-1155 | Multi-token standard |
| ERC-4626 | Tokenized vault standard |
| ERC-7201 | Namespaced storage (for EIP-7702) |

## Sources
- https://ethereum.org/en/roadmap/
- https://ethereum.org/en/defi/
- https://defillama.com/chain/ethereum
