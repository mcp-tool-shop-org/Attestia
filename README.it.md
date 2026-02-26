<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  
            <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/Attestia/readme.png"
           alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>Infrastruttura per la trasparenza finanziaria nel mondo decentralizzato.</strong></p>

---

## Missione

Crediamo che il denaro, indipendentemente da dove si trovi o come si muova, meriti la stessa accuratezza dei sistemi che lo hanno creato. Gli smart contract vengono eseguiti, le blockchain registrano le transazioni, ma nessuno *certifica* la loro validità.

Attestia è lo strato mancante: offre una governance strutturata, una contabilità deterministica e un'approvazione umana degli obiettivi, il tutto integrato tra diverse blockchain, organizzazioni e individui.

Non spostiamo i vostri soldi. Verifichiamo ciò che è accaduto, limitiamo ciò che può accadere e rendiamo la registrazione finanziaria inviolabile.

### I nostri valori

- **Veridicità al di sopra della velocità.** Ogni evento finanziario è registrato in modo immutabile, riproducibile e riconciliabile. Se non può essere provato, non è accaduto.
- **Gli esseri umani approvano; le macchine verificano.** L'intelligenza artificiale fornisce suggerimenti, gli smart contract eseguono le operazioni, ma nulla si muove senza l'autorizzazione esplicita degli esseri umani. Mai.
- **Governance strutturale, non politica.** Non votiamo su ciò che è valido. Definiamo principi fondamentali che sono sempre validi: l'identità è esplicita, la tracciabilità è ininterrotta, l'ordine è deterministico.
- **L'intenzione non è l'esecuzione.** Dichiarare ciò che si vuole e metterlo in pratica sono due azioni distinte, con controlli separati. Lo spazio tra queste due azioni è dove risiede la fiducia.
- **Le blockchain sono testimoni, non autorità.** XRPL attesta. Ethereum salda. Ma l'autorità deriva dalle regole strutturali, non dal consenso di nessuna blockchain.
- **Un'infrastruttura solida è ciò che conta.** Il mondo non ha bisogno di un altro protocollo DeFi. Ha bisogno dello strato sottostante, dell'infrastruttura finanziaria che rende tutto il resto affidabile.

---

## Architettura

Attestia: tre sistemi, un'unica verità.

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

| Sistema. | Role | Origine. |
|--------|------|--------|
| **Personal Vault** | Monitoraggio di portafogli diversificati, definizione di budget flessibili, dichiarazione di intenti. | Derivato da NextLedger. |
| **Org Treasury** | Elaborazione delle buste paga deterministica, distribuzioni tramite DAO (Organizzazioni Autonome Decentralizzate), finanziamenti a doppio canale, sistema di contabilità a partita doppia. | Derivato da Payroll Engine. |
| **Registrum** | Registro strutturale: 11 invarianti, validazione con doppia conferma, attestazione tramite XRPL. | Inalterato: livello costituzionale. |

---

## Modello fondamentale

Ogni interazione segue un flusso specifico:

```
Intent → Approve → Execute → Verify
```

1. **Intento** – Un utente o un sistema dichiara un risultato desiderato.
2. **Approvazione** – Registrum verifica la struttura; un operatore autorizza esplicitamente.
3. **Esecuzione** – La transazione viene inviata alla blockchain.
4. **Verifica** – La riconciliazione conferma; la rete XRPL attesta la validità della registrazione.

Nessuna fase è facoltativa. Nessuna fase viene automatizzata.

---

## Principi

| Principio. | Implementazione. |
|-----------|---------------|
| Registrazioni che possono essere solo aggiunte. | Nessun aggiornamento, nessuna cancellazione: solo nuove inserzioni. |
| Fail-safe. | Il disaccordo interrompe il sistema, e non si risolve mai silenziosamente. |
| Riproduzione deterministica. | Gli stessi eventi producono sempre lo stesso risultato. |
| Solo intelligenza artificiale per consulenza. | L'intelligenza artificiale può analizzare, avvertire e suggerire, ma non può mai approvare, firmare o eseguire azioni. |
| Osservazione multi-catena. | Ethereum, XRPL, Solana, soluzioni di livello 2: un livello di lettura indipendente dalla blockchain. |
| Identità strutturale. | Esplicito, immutabile, unico: non biometrico, ma costituzionale. |

---

## Stato

14 pacchetti, 1.853 test, copertura del 96,80%, tutto corretto. Sviluppo in trasparenza.

| Pacchetto. | Tests | Scopo. |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipi di dominio condivisi (senza dipendenze). |
| `@attestia/registrum` | 297 | Governance costituzionale: 11 principi fondamentali, sistema di doppia verifica. |
| `@attestia/ledger` | 144 | Motore a doppia scrittura con funzionalità di aggiunta esclusiva. |
| `@attestia/chain-observer` | 242 | Osservazione in sola lettura su più blockchain (EVM, XRPL, Solana e soluzioni di livello 2). |
| `@attestia/vault` | 67 | Archivio personale: portafogli, budget, obiettivi. |
| `@attestia/treasury` | 63 | Tesoreria aziendale: gestione delle buste paga, dei pagamenti e delle autorizzazioni di finanziamento. |
| `@attestia/reconciler` | 56 | Corrispondenza inter-sistemi in 3D + Certificazione Registrum. |
| `@attestia/witness` | 245 | Certificazione on-chain di XRPL, governance con firme multiple, funzionalità di ripetizione. |
| `@attestia/verify` | 200 | Verifica delle registrazioni, documentazione di conformità, applicazione degli accordi di servizio (SLA). |
| `@attestia/event-store` | 190 | Persistenza degli eventi con aggiunta di dati solo in append, formato JSONL, catena di hash, 34 tipi di eventi. |
| `@attestia/proof` | 53 | Alberi di Merkle, prove di inclusione, impacchettamento delle prove di attestazione. |
| `@attestia/sdk` | 50 | SDK per client HTTP, progettato per essere utilizzato da applicazioni esterne. |
| `@attestia/node` | 184 | Hono REST API: oltre 30 endpoint, autenticazione, supporto per architetture multi-tenant, API pubblica, conformità normativa. |

### Sviluppo

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### Test di integrazione per XRPL

Un nodo "rippled" autonomo viene eseguito in un container Docker per eseguire test di integrazione deterministici sulla blockchain, senza dipendenze da testnet, senza la necessità di un "faucet" e con un tempo di chiusura del registro inferiore al secondo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentazione

| Documento. | Scopo. |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Panoramica generale e riferimento completo del pacchetto. |
| [ROADMAP.md](ROADMAP.md) | Roadmap del progetto, suddiviso per fasi. |
| [DESIGN.md](DESIGN.md) | Decisioni relative all'architettura. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Grafico dei pacchetti, flussi di dati, modello di sicurezza. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Struttura a 5 livelli, modelli di implementazione, confini di sicurezza. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integrazione delle API con esempi di utilizzo di curl + utilizzo del kit di sviluppo software (SDK). |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guida dettagliata, passo dopo passo, per la riproduzione delle registrazioni degli audit. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Analisi STRIDE per componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Minaccia → controllo → file → mappature (o corrispondenze) → test. |
| [SECURITY.md](SECURITY.md) | Politica di divulgazione responsabile. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista di controllo per la preparazione all'adozione. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Risultati dei test di riferimento. |

---

## Licenza

[Licenza MIT](LICENSE)
