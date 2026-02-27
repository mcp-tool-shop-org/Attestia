<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/Attestia/readme.png" alt="Attestia" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>Financial truth infrastructure for the decentralized world.</strong></p>

---

## Mission

Crediamo che il denaro, ovunque si trovi e come si muova, meriti la stessa accuratezza dei sistemi che lo hanno creato. Gli smart contract eseguono le operazioni. Le blockchain registrano le transazioni. Ma nessuno *certifica*.

Attestia è lo strato mancante: governance strutturale, contabilità deterministica e approvazione umana, tutto unificato tra blockchain, organizzazioni e individui.

Non spostiamo i vostri soldi. Dimostriamo cosa è successo, limitiamo ciò che può accadere e rendiamo la registrazione finanziaria inviolabile.

### Ciò in Cui Crediamo

- **Verità prima della velocità.** Ogni evento finanziario è registrato in modo permanente, riproducibile e riconciliabile. Se non può essere provato, non è successo.
- **Gli esseri umani approvano; le macchine verificano.** L'intelligenza artificiale fornisce suggerimenti, gli smart contract eseguono le operazioni, ma nulla si muove senza l'autorizzazione esplicita di un essere umano. Mai.
- **Governance strutturale, non politica.** Non votiamo su ciò che è valido. Definiamo principi fondamentali che sono sempre validi: l'identità è esplicita, la provenienza è tracciabile e l'ordine è deterministico.
- **L'intento non è l'esecuzione.** Dichiarare ciò che si desidera e metterlo in atto sono azioni separate, con meccanismi di controllo distinti. La distanza tra queste due azioni è dove risiede la fiducia.
- **Le blockchain sono testimoni, non autorità.** XRPL certifica. Ethereum registra le transazioni. Ma l'autorità deriva da regole strutturali, non dal consenso di una singola blockchain.
- **L'infrastruttura affidabile è fondamentale.** Il mondo non ha bisogno di un altro protocollo DeFi. Ha bisogno dello strato di contabilità sottostante, dell'infrastruttura finanziaria che rende tutto il resto affidabile.

---

## Architettura

Attestia è costituita da tre sistemi, con un'unica verità:

```
┌─────────────────────────────────────────────────────────┐
│                      ATTESTIA                           │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Personal   │  │     Org      │  │              │  │
│  │    Vault     │  │   Treasury   │  │   Registrum  │  │
│  │              │  │              │  │              │  │
│  │  Observe.    │  │  Distribute. │  │  Govern.     │  │
│  │  Budget.     │  │  Account.    │  │  Attest.     │  │
│  │  Allocate.   │  │  Reconcile.  │  │  Constrain.  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │           │
│         └────────────┬────┘                 │           │
│                      │                      │           │
│              ┌───────┴───────┐              │           │
│              │  Cross-System │◀─────────────┘           │
│              │ Reconciliation│                           │
│              └───────┬───────┘                           │
│                      │                                   │
│              ┌───────┴───────┐                           │
│              │ XRPL Witness  │                           │
│              │  (attestation)│                           │
│              └───────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

| Sistema | Ruolo | Origine |
|--------|------|--------|
| **Personal Vault** | Osservazione multi-catena dei portafogli, budgeting, dichiarazione di intenti | Evoluto da NextLedger |
| **Org Treasury** | Elaborazione paghe deterministica, distribuzioni DAO, finanziamenti con doppia autorizzazione, libro mastro a doppio ingresso | Evoluto da Payroll Engine |
| **Registrum** | Registro strutturale: 11 principi fondamentali, convalida con doppia testimonianza, certificazione XRPL | Inalterato: strato costituzionale |

---

## Modello di base

Ogni interazione segue un flusso:

```
Intent → Approve → Execute → Verify
```

1. **Intento** — Un utente o un sistema dichiara un risultato desiderato.
2. **Approvazione** — Il registro convalida strutturalmente; un essere umano firma esplicitamente.
3. **Esecuzione** — La transazione on-chain viene inviata.
4. **Verifica** — La riconciliazione conferma; XRPL certifica la registrazione.

Nessun passaggio è facoltativo. Nessun passaggio è automatizzato.

---

## Principi

| Principio | Implementazione |
|-----------|---------------|
| Registrazioni permanenti | Nessun UPDATE, nessuna DELETE: solo nuove voci. |
| Fail-closed | Un disaccordo interrompe il sistema, ma non lo risolve silenziosamente. |
| Riproducibilità deterministica | Gli stessi eventi producono sempre lo stesso stato. |
| Intelligenza artificiale solo consultiva | L'intelligenza artificiale può analizzare, avvertire e suggerire, ma non approvare, firmare o eseguire operazioni. |
| Osservazione multi-catena | Ethereum, XRPL, Solana, L2: livello di lettura indipendente dalla blockchain. |
| Identità strutturale | Esplicita, immutabile e univoca: non biometrica, ma costituzionale. |

---

## Stato

14 pacchetti, 1.853 test, copertura del 96,80%, tutto verde. Sviluppo trasparente.

| Pacchetto | Test | Scopo |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipi di dati condivisi (nessuna dipendenza) |
| `@attestia/registrum` | 297 | Governance costituzionale: 11 principi fondamentali, doppia testimonianza |
| `@attestia/ledger` | 144 | Motore a doppio ingresso per registrazioni permanenti |
| `@attestia/chain-observer` | 242 | Osservazione multi-catena in sola lettura (EVM + XRPL + Solana + L2) |
| `@attestia/vault` | 67 | Portafoglio personale: portafogli, budget, intenti |
| `@attestia/treasury` | 63 | Tesoreria aziendale: paghe, distribuzioni, meccanismi di finanziamento |
| `@attestia/reconciler` | 56 | Corrispondenza cross-system in 3D + attestazione Registrum |
| `@attestia/witness` | 245 | Attestazione on-chain di XRPL, governance multi-firma, retry (tentativo). |
| `@attestia/verify` | 200 | Verifica di replay, evidenza di conformità, applicazione degli SLA. |
| `@attestia/event-store` | 190 | Persistenza degli eventi solo in append, formato JSONL, catena di hash, 34 tipi di eventi. |
| `@attestia/proof` | 53 | Alberi di Merkle, prove di inclusione, impacchettamento delle prove di attestazione. |
| `@attestia/sdk` | 50 | SDK client HTTP tipizzato per consumatori esterni. |
| `@attestia/node` | 184 | API REST Hono: oltre 30 endpoint, autenticazione, multi-tenancy, API pubblica, conformità. |

### Sviluppo

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### Test di integrazione di XRPL

Un nodo `rippled` autonomo viene eseguito in Docker per test di integrazione on-chain deterministici: nessuna dipendenza dalla testnet, nessuna "faucet" (distributore di fondi di test), chiusura del ledger in meno di un secondo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentazione

| Documento | Scopo |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Panoramica generale e riferimento completo del pacchetto. |
| [ROADMAP.md](ROADMAP.md) | Roadmap del progetto, fase per fase. |
| [DESIGN.md](DESIGN.md) | Decisioni architetturali. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Grafico dei pacchetti, flussi di dati, modello di sicurezza. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Stack a 5 livelli, modelli di deployment, confini di fiducia. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integrazione API con esempi curl + utilizzo dell'SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guida passo-passo per l'audit e la verifica. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Analisi STRIDE per componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Mappatura minaccia → controllo → file → test. |
| [SECURITY.md](SECURITY.md) | Politica di divulgazione responsabile. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Checklist di preparazione all'adozione. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Benchmark registrati. |

---

## Ambito di sicurezza e dei dati

- **Dati accessibili:** Lettura e scrittura di voci del registro finanziario, record di attestazione e prove crittografiche. Si connette ai nodi blockchain (XRPL) quando il modulo di attestazione è attivo.
- **Dati NON accessibili:** Nessuna telemetria. Nessun archivio di credenziali utente. Nessuna analisi di terze parti.
- **Permessi richiesti:** Accesso in lettura/scrittura alle directory di dati locali. Accesso alla rete solo per l'attestazione blockchain. Consultare [THREAT_MODEL.md](THREAT_MODEL.md) per l'analisi STRIDE completa.

## Scheda di valutazione

| Gate (Valutazione) | Stato |
|------|--------|
| A. Baseline di sicurezza | PASS (Superato) |
| B. Gestione degli errori | PASS (Superato) |
| C. Documentazione per gli operatori | PASS (Superato) |
| D. Igiene del rilascio | PASS (Superato) |
| E. Identità | PASS (Superato) |

## Licenza

[MIT](LICENSE)

---

Creato da <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
