# XRP Ledger Reference

Primary attestation chain and native DEX for our stack.

---

## Why XRPL

XRPL is chosen as Registrum's attestation target for specific architectural reasons:

1. **Deterministic ordering** — Transactions are ordered deterministically within ledgers
2. **Multi-validator consensus** — Byzantine fault tolerant without proof of work
3. **No Turing-complete execution** — The absence of smart contracts is a *feature* for attestation
4. **Low cost** — Attestation payloads are 1-drop (0.000001 XRP) self-send transactions
5. **Fast finality** — Ledgers close every 3-5 seconds
6. **Oldest DEX** — CLOB (Central Limit Order Book) operating since 2012

## XRPL DEX (Unique Architecture)

Unlike Ethereum/Solana DEXes, XRPL uses a **native on-ledger order book**, not AMMs:

- **Offers** = limit orders to buy/sell tokens
- **Order books** maintained per currency pair
- **Auto-bridging** through XRP for better rates between token pairs
- **AMMs also available** (added later) but not required
- **No smart contracts needed** — DEX is a protocol-level feature

**Implications for our stack:**
- Token observation is simpler — query order books directly via RPC
- No smart contract audit risk for trading
- Deterministic price discovery (not dependent on AMM curves)
- Trust lines (not token approvals) control which assets an account can hold

## Multi-Signing

XRPL has native multi-sig with weighted quorum:

- **Signer lists:** 1-32 addresses per account
- **Weighted signatures:** Each signer has a numeric weight
- **Quorum:** Minimum total weight to authorize a transaction
- **Wallet locator:** 256 bits of arbitrary data per signer (for external identification)

### Example Configurations

| Use Case | Setup |
|----------|-------|
| Shared account | Quorum 1, all weights 1 — any signer can approve |
| High-security | Quorum 3, three signers weight 1 — all must agree |
| Hierarchical | Quorum 3: CEO weight 3, VPs weight 2, Directors weight 1 |
| Backup recovery | Regular key for daily use, 3-of-3 multi-sig for key recovery |

**Implications for our stack:**
- "Org Treasury" can use native XRPL multi-sig for distribution approval
- Quorum weights map to organizational authority levels
- No smart contract overhead for multi-party authorization
- Registrum can validate that multi-sig transitions follow structural rules

## Key XRPL Features

| Feature | Description | Our Use |
|---------|-------------|---------|
| Trust Lines | Explicit opt-in to hold specific tokens | Asset observation, portfolio tracking |
| Escrow | Time-locked or condition-locked XRP | Scheduled distributions |
| Payment Channels | Off-ledger micropayments | Streaming payments |
| Checks | Deferred payments (recipient pulls) | Invoice-style contributor payments |
| NFTs (XLS-20) | Native NFT support | Proof tokens, credential NFTs |
| dNFTs | Dynamic NFTs with mutable data | Living financial records |
| Permissioned DEX | Controlled trading environments | Compliant token trading |
| Hooks (amendment) | Lightweight smart contracts | Future: on-ledger validation |

## RLUSD (Ripple USD)

- **Market cap:** ~$1.5B (Feb 2026)
- **Type:** Fiat-backed stablecoin
- **Issuance:** Native on XRPL + Ethereum
- **Our use:** Default stablecoin for XRPL-based operations

## Attestation Mechanics (from Registrum)

Registrum attestation uses XRPL Payment memos:
1. Generate `AttestationPayload` from registrar snapshot (SHA-256 content-addressed)
2. Encode as XRPL Payment transaction memos
3. Self-send 1 drop XRP with memo data
4. No smart contracts, no Turing-complete execution
5. Result: timestamped, immutable proof that Registrum decided *something* at *this time*

**What XRPL is NOT used for:**
- Invariant evaluation
- Parity resolution
- Self-healing
- Governance decisions
- Any form of authority (authority flows inward, witness flows outward)

## Sources
- https://xrpl.org/docs/concepts/tokens/decentralized-exchange
- https://xrpl.org/docs/concepts/accounts/multi-signing
- Registrum docs: docs/WHY_XRPL.md, docs/XRPL_ATTESTATION.md
