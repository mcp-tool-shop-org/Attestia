# Standards & EIPs Reference

Ethereum standards and specifications relevant to our stack.

---

## Account Abstraction

### EIP-4337 — Account Abstraction Using Alt Mempool (Live)
- **Status:** Deployed March 2023, widely adopted
- **What:** Smart contract wallets without protocol changes
- **Key concept:** `UserOperation` objects bundled by validators
- **Adoption:** 26M+ smart accounts, 170M+ UserOperations
- **Our use:** Foundation for smart wallet-based intent approval
- **Spec:** https://eips.ethereum.org/EIPS/eip-4337
- **Dashboard:** https://www.bundlebear.com/erc4337-overview/all

### EIP-7702 — Set Code for EOAs (Live — Pectra)
- **Status:** Live since May 2025 (Pectra upgrade)
- **What:** EOAs permanently delegate execution to smart contract code
- **Key features:**
  - Transaction batching (approve + swap in one tx)
  - Gas sponsorship (someone else pays your fees)
  - Privilege de-escalation (sub-keys with limited permissions)
  - Social recovery (friends can help recover access)
- **Forward compatible** with endgame account abstraction
- **Our use:** Personal Vault and Org Treasury can use smart wallet features directly on EOAs
- **Spec:** https://eips.ethereum.org/EIPS/eip-7702

---

## Token Standards

### ERC-20 — Fungible Token Standard
- The base standard for all fungible tokens (USDC, DAI, UNI, etc.)
- **Our use:** Track any ERC-20 balance, observe approvals, monitor transfers

### ERC-721 — Non-Fungible Token Standard
- Unique tokens (art, credentials, deeds)
- **Our use:** Observe NFT holdings, potential for credential/proof NFTs

### ERC-1155 — Multi-Token Standard
- Batch operations for both fungible and non-fungible
- **Our use:** Efficient multi-asset tracking

### ERC-4626 — Tokenized Vault Standard
- Standardized interface for yield-bearing vaults
- **Our use:** Unified observation of DeFi vault positions (Yearn, Aave aTokens, etc.)

### ERC-7201 — Namespaced Storage Layout
- For smart contract wallet storage management
- **Our use:** Safe delegate contract upgrades under EIP-7702

---

## Intent & Execution Standards

### Intent-Centric Architecture (Emerging Pattern)
- **Not a single EIP** — a design philosophy spreading across the ecosystem
- **Core idea:** Users declare desired outcomes, solvers find optimal execution paths
- **Components:**
  - Intent declaration (what the user wants)
  - Solver network (who finds how to do it)
  - Execution (atomic on-chain settlement)
  - Verification (did the intent get fulfilled correctly?)

- **Our mapping:**
  | Intent Concept | Our Implementation |
  |---------------|-------------------|
  | Intent declaration | `XrplIntent` (NextLedger), `FundingGateEvaluation` (payroll-engine) |
  | Validation | Registrum structural invariants |
  | Approval | Human approval gate (non-negotiable) |
  | Execution | On-chain transaction (wallet signs) |
  | Verification | Reconciliation + Registrum attestation |

### ERC-7683 — Cross-Chain Intents (Draft)
- Standard for expressing cross-chain swap/bridge intents
- **Our use:** Future cross-chain distribution and reconciliation

---

## Data Availability & Scaling

### EIP-4844 — Proto-Danksharding (Live)
- Blob transactions for cheap L2 data
- **Our use:** Cheaper observation of L2 activity

### PeerDAS — Peer Data Availability Sampling (Live — Fusaka)
- Distributed data availability without full download
- **Our use:** More decentralized, cheaper L2 observation

---

## Identity & Governance

### DID (Decentralized Identifiers) — W3C Standard
- Self-sovereign identity anchored on-chain
- **Our use:** Future identity layer for Personal Vault ↔ Org Treasury linkage

### EIP-712 — Typed Structured Data Hashing and Signing
- Standard for human-readable signing prompts
- **Our use:** Intent approval messages that users can actually read before signing

### DUNA (Wyoming Law, 2024)
- Decentralized Unincorporated Nonprofit Association
- Legal structure for DAOs in the US
- **Our use:** Legal entity structure for Org Treasury users (DAO compliance)

---

## XRPL-Specific Standards

### XLS-20 — NFTs on XRPL
- Native NFT support (not smart-contract-based)
- **Our use:** Credential NFTs, proof tokens

### XLS-30 — Automated Market Makers on XRPL
- AMMs alongside the native CLOB DEX
- **Our use:** Additional liquidity observation

### Multi-Sign (Protocol Feature)
- 1-32 signers, weighted quorum
- **Our use:** Org Treasury multi-party approval

### Escrow (Protocol Feature)
- Time-locked or condition-locked XRP holds
- **Our use:** Scheduled distributions, vesting

### Hooks (Amendment — In Progress)
- Lightweight smart contracts on XRPL
- **Our use:** Future on-ledger validation rules

## Sources
- https://eips.ethereum.org/
- https://xrpl.org/docs/
- https://ethereum.org/en/roadmap/account-abstraction/
