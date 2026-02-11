# Stablecoins & DeFi Protocols Reference

Protocols relevant to our web3 financial stack.

---

## Stablecoins — The Payment Medium

### Top Stablecoins by Market Cap (Feb 2026)

| Token | MCap | Backing | Peg | Chains |
|-------|------|---------|-----|--------|
| USDT (Tether) | $184.3B | Fiat | USD | Multi-chain |
| USDC (Circle) | $73.3B | Fiat | USD | Multi-chain |
| USDS (Sky/Maker) | $9.6B | Crypto | USD | Ethereum |
| USDe (Ethena) | $6.4B | Crypto | USD | Ethereum |
| DAI (MakerDAO) | $4.2B | Crypto | USD | Ethereum |
| PYUSD (PayPal) | $3.9B | Fiat | USD | Ethereum, Solana |
| XAUT (Tether Gold) | $2.6B | Precious metals | XAU | Ethereum |
| PAXG (Paxos Gold) | $2.3B | Precious metals | XAU | Ethereum |
| RLUSD (Ripple) | $1.5B | Fiat | USD | XRPL, Ethereum |
| USDD | $1.0B | Crypto | USD | Tron |

### Stablecoin Types

| Type | Mechanism | Tradeoff |
|------|-----------|----------|
| **Fiat-backed** | 1:1 reserve (bank deposits, T-bills) | Centralized issuer, requires auditing |
| **Crypto-backed** | Over-collateralized with crypto | Decentralized but capital-inefficient |
| **Precious-metal-backed** | Gold/commodity reserves | Stores of value, not payment-optimized |
| **Algorithmic** | Supply/demand algorithms | Capital-efficient but fragile (see: UST) |

### Our Stack Implications

- **Default payment currency:** USDC (broadest chain support) or RLUSD (native XRPL)
- **Envelope budgeting in stablecoins** eliminates volatility from budget planning
- **Multi-stablecoin support** needed — users may hold USDC, DAI, RLUSD simultaneously
- **Yield on idle allocations** — unspent envelope balances can earn via lending protocols

---

## DeFi Protocols — What to Observe

### Lending & Borrowing

| Protocol | TVL | What It Does | Our Relevance |
|----------|-----|-------------|---------------|
| Aave | ~$15B | Multi-asset lending pools | Yield on treasury reserves |
| Compound | ~$3B | Algorithmic interest rates | Alternative yield source |
| Spark | ~$5B | Sky (Maker) ecosystem lending | DAI/USDS yield |

**Observation model:** Track lending positions, interest accrual, health factors. Report in Personal Vault without executing.

### DEXes

| Protocol | Type | Chain | 24h Volume |
|----------|------|-------|-----------|
| Uniswap | AMM | Ethereum + L2s | ~$1B |
| XRPL DEX | CLOB | XRPL | Native |
| Jupiter | Aggregator | Solana | ~$500M |
| PancakeSwap | AMM | BSC | ~$300M |

**Observation model:** Track open orders, LP positions, swap history. Calculate portfolio impact.

### Yield Aggregators

| Protocol | What It Does | Our Relevance |
|----------|-------------|---------------|
| Yearn | Auto-compounds yield strategies | Observe aggregated positions |
| Convex | Boost Curve LP rewards | Track boosted yields |
| EigenLayer | Restaking ETH for additional yield | Observe restaking positions |

---

## DeFi Position Types to Track

For the Personal Vault observation layer:

| Position Type | Data Points | Update Frequency |
|--------------|-------------|-----------------|
| **Wallet balance** | Token, amount, USD value | Per-block or polling |
| **Lending supply** | Supplied amount, interest rate, earned | Per-block |
| **Lending borrow** | Borrowed amount, interest rate, health factor | Per-block |
| **LP position** | Token pair, liquidity, fees earned, IL | Per-block |
| **Staking** | Staked amount, rewards, lock period | Per-epoch |
| **Restaking** | Operator, AVS, slashing risk | Per-epoch |
| **NFT holdings** | Collection, token ID, floor price | On-demand |
| **Active orders** | Token pair, price, amount, fills | Per-ledger (XRPL) |

---

## DeFi Risk Factors

For the advisory layer:

| Risk | Description | How We Surface It |
|------|-------------|------------------|
| **Smart contract risk** | Protocol bugs, exploits | Flag unaudited protocols |
| **Impermanent loss** | LP value divergence from holding | Calculate and display IL |
| **Liquidation risk** | Collateral ratio drops | Health factor warnings |
| **Oracle risk** | Price feed manipulation | Multi-source price validation |
| **Rug pull risk** | Token issuer drains liquidity | Trust line / contract analysis |
| **Regulatory risk** | Jurisdictional restrictions | Informational only |

## Sources
- https://ethereum.org/en/stablecoins/
- https://ethereum.org/en/defi/
- https://defillama.com/chains
