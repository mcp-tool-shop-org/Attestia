# Competitive Landscape

Projects and products operating in adjacent or overlapping spaces.

---

## Personal Finance / Budgeting (Web3-Adjacent)

| Project | What | Chain | Gap We Fill |
|---------|------|-------|------------|
| **Zerion** | Portfolio tracker + wallet | Multi-chain | No budgeting, no intent system, no structural governance |
| **Zapper** | DeFi dashboard + portfolio | Multi-chain | Observation only, no allocation planning |
| **DeBank** | Social DeFi portfolio | Multi-chain | Social-first, no financial discipline tools |
| **Rotki** | Open-source portfolio tracker | Multi-chain | Privacy-focused but no budgeting or intent model |
| **CoinStats** | Aggregated portfolio + DeFi | Multi-chain | Tracking only, no allocation or governance |

**Our differentiator:** None of these apply *financial discipline* (envelope budgeting, intent declaration, constraint enforcement) to web3 portfolios. They show you what you have. We help you decide what to do with it — and prove you did it.

---

## DAO Treasury Management

| Project | What | Gap We Fill |
|---------|------|------------|
| **Gnosis Safe (Safe)** | Multi-sig wallet | Infrastructure only — no budgeting, no audit trail, no intent system |
| **Utopia Labs** | DAO treasury operations | Centralized, limited to EVM |
| **Parcel** | DAO payroll + treasury | Basic, no deterministic engine, no reconciliation |
| **Coinshift** | Treasury management | Limited scope, no structural governance |
| **Tally** | DAO governance + treasury | Governance-focused, weak treasury tooling |
| **Llama** | Treasury management framework | Smart-contract-based, no cross-chain |

**Our differentiator:** No existing DAO treasury tool has:
1. Deterministic, append-only double-entry ledger
2. Dual funding gates with human approval
3. Structural governance (Registrum)
4. XRPL attestation for external proof
5. Cross-system reconciliation (org ↔ individual)

---

## Payroll / Contributor Payments (Web3)

| Project | What | Gap We Fill |
|---------|------|------------|
| **Superfluid** | Token streaming (continuous payments) | Streaming only — no batch payroll, no funding gates |
| **Sablier** | Token streaming | Similar to Superfluid |
| **Request Network** | Invoicing + payments | Invoice-focused, no payroll engine |
| **Coordinape** | Contributor compensation via peer allocation | Allocation only, no payment execution |
| **Opolis** | Employment as a service for DAOs | Traditional payroll with crypto — heavy compliance overhead |

**Our differentiator:** No web3 payroll solution has the PSP-grade engineering our payroll-engine has — append-only ledger with DB-trigger enforcement, idempotent operations, liability attribution, settlement reconciliation. They're payment tools. We're a financial truth engine.

---

## Registrars / Governance Infrastructure

| Project | What | Gap We Fill |
|---------|------|------------|
| **Aragon** | DAO framework + governance | Template-based, not structural governance |
| **Snapshot** | Off-chain voting | Voting only, no state transition governance |
| **OpenZeppelin Governor** | On-chain governance contracts | Smart contract pattern, not a registrar |
| **ENS** | Name registrar | Domain names, not structural state |
| **Ceramic** | Decentralized data network | Data streams, not constitutional governance |

**Our differentiator:** Registrum is fundamentally different — it's a *structural registrar* that validates transitions against constitutional invariants. It doesn't do governance (voting, proposals). It guarantees that *whatever governance decides*, the resulting state changes are structurally valid, ordered, and replayable. Nothing else in the ecosystem does this.

---

## Identity / Proof

| Project | What | Gap We Fill |
|---------|------|------------|
| **Worldcoin** | Proof of personhood (biometric) | Biometric identity — we do structural identity |
| **Spruce / SpruceID** | Decentralized identity toolkit | General DID — we focus on financial identity |
| **Gitcoin Passport** | Sybil resistance scoring | Score-based, not structural invariant-based |
| **Polygon ID** | ZK identity | ZK proofs for identity claims |

**Our differentiator:** We don't compete on identity per se. Registrum provides *structural identity guarantees* (explicit, immutable, unique) that other identity systems can anchor to. We're the layer below identity — the constitutional substrate that ensures identity transitions remain legible.

---

## Combined Value Proposition

No existing project combines:

```
Structural governance (Registrum)
  + Deterministic financial engine (Payroll Engine → Org Treasury)  
  + Personal financial sovereignty (NextLedger → Personal Vault)
  + Cross-system reconciliation (org ↔ individual)
  + XRPL attestation (external, neutral witness)
  + Intent-based architecture (with mandatory human approval)
```

The closest analogy isn't any single competitor — it's *building the financial infrastructure that web3 has been missing*: the boring, rigorous, trust-worthy accounting that makes everything else possible.
