<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <strong>Français</strong> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/Attestia/main/assets/logo.png" alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
</p>

<p align="center"><strong>Financial truth infrastructure for the decentralized world.</strong></p>

***

<a id="mission"></a>

## Mission

Nous croyons que l'argent — où qu'il se trouve, quelle que soit sa circulation — mérite la même rigueur que les systèmes qui l'ont créé. Les contrats intelligents s'exécutent. Les blockchains enregistrent. Mais personne n'*atteste*.

Attestia est la couche manquante : gouvernance structurelle, comptabilité déterministe, et intention approuvée par l'humain — unifiées entre chaînes, organisations et individus.

Nous ne déplaçons pas votre argent. Nous prouvons ce qui s'est passé, limitons ce qui peut se passer, et rendons le dossier financier incassable.

<a id="what-we-stand-for"></a>

### Nos Principes

- **La vérité plutôt que la vitesse.** Chaque événement financier est immuable, rejouable et réconciliable. S'il ne peut pas être prouvé, il ne s'est pas produit.
- **Les humains approuvent ; les machines vérifient.** L'IA conseille, les contrats intelligents s'exécutent, mais rien ne bouge sans autorisation humaine explicite. Jamais.
- **Gouvernance structurelle, pas gouvernance politique.** Nous ne votons pas sur ce qui est valide. Nous définissons des invariants qui tiennent inconditionnellement — l'identité est explicite, la lignée est ininterrompue, l'ordre est déterministe.
- **L'intention n'est pas l'exécution.** Déclarer ce que vous voulez et le faire sont des actes séparés avec des portes séparées. L'écart entre eux est où réside la confiance.
- **Les chaînes sont des témoins, pas des autorités.** XRPL atteste. Ethereum règle. Mais l'autorité découle de règles structurelles, pas du consensus d'une chaîne.
- **L'infrastructure ennuyeuse gagne.** Le monde n'a pas besoin d'un autre protocole DeFi. Il a besoin de la couche comptable en dessous — la plomberie financière qui rend tout le reste fiable.

***

<a id="architecture"></a>

## Architecture

Attestia est trois systèmes, une vérité :

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

| Système              | Rôle                                                                                                      | Origine                             |
| -------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Coffre Personnel** | Observation de portefeuille multi-chaîne, budgétisation par enveloppe, déclaration d'intention            | Issu de NextLedger                  |
| **Trésorerie Org**   | Masse salariale déterministe, distributions DAO, financement à double porte, grand livre en partie double | Issu du Moteur de Paie              |
| **Registrum**        | Registraire structurel — 11 invariants, validation à double témoin, attestation XRPL                      | Inchangé — couche constitutionnelle |

***

<a id="core-pattern"></a>

## Schéma Principal

Chaque interaction suit un flux :

```
Intent → Approve → Execute → Verify
```

1. **Intention** — Un utilisateur ou un système déclare un résultat souhaité
1. **Approuver** — Registrum valide structurellement ; un humain signe explicitement
1. **Exécuter** — La transaction en chaîne est soumise
1. **Vérifier** — La réconciliation confirme ; XRPL atteste le dossier

Aucune étape n'est facultative. Aucune étape n'est automatisée.

***

<a id="principles"></a>

## Principes

| Principe                  | Mise en œuvre                                                                |
| ------------------------- | ---------------------------------------------------------------------------- |
| Enregistrements immuables | Pas de UPDATE, pas de DELETE — uniquement de nouvelles entrées               |
| Défaillance fermée        | Le désaccord arrête le système, jamais il ne se cicatrise silencieusement    |
| Rejeu déterministe        | Les mêmes événements produisent le même état, toujours                       |
| IA consultatif uniquement | L'IA peut analyser, avertir, suggérer — jamais approuver, signer ou exécuter |
| Observation multi-chaîne  | Ethereum, XRPL, Solana, L2s — couche de lecture agnostique à la chaîne       |
| Identité structurelle     | Explicite, immuable, unique — non biométrique, mais constitutionnelle        |

***

<a id="status"></a>

## Statut

14 paquets, 1 853 tests, 96,80 % de couverture, tout au vert. Construction en public.

| Paquet                     | Tests | Objectif                                                                                              |
| -------------------------- | ----- | ----------------------------------------------------------------------------------------------------- |
| `@attestia/types`          | 62    | Types de domaine partagés (zéro dépendances)                                                          |
| `@attestia/registrum`      | 297   | Gouvernance constitutionnelle — 11 invariants, double témoin                                          |
| `@attestia/ledger`         | 144   | Moteur à double entrée en ajout uniquement                                                            |
| `@attestia/chain-observer` | 242   | Observation multi-chaîne en lecture seule (EVM + XRPL + Solana + L2s)                                 |
| `@attestia/vault`          | 67    | Coffre-fort personnel — portefeuilles, budgets, intentions                                            |
| `@attestia/treasury`       | 63    | Trésorerie organisationnelle — masse salariale, distributions, portes de financement                  |
| `@attestia/reconciler`     | 56    | Appariement 3D entre systèmes + attestation Registrum                                                 |
| `@attestia/witness`        | 245   | Attestation on-chain XRPL, gouvernance multi-sig, nouvelle tentative                                  |
| `@attestia/verify`         | 200   | Vérification de la relecture, preuves de conformité, application des contrats de niveau de service    |
| `@attestia/event-store`    | 190   | Persistance d'événements en ajout uniquement, JSONL, chaîne de hachage, 34 types d'événements         |
| `@attestia/proof`          | 53    | Arbres de Merkle, preuves d'inclusion, empaquetage de preuves d'attestation                           |
| `@attestia/sdk`            | 50    | SDK client HTTP typé pour les consommateurs externes                                                  |
| `@attestia/node`           | 184   | API REST Hono — 30+ points de terminaison, authentification, multi-location, API publique, conformité |

<a id="development"></a>

### Développement

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

<a id="xrpl-integration-testing"></a>

### Tests d'intégration XRPL

Un nœud `rippled` autonome s'exécute dans Docker pour des tests d'intégration on-chain déterministes — aucune dépendance de testnet, aucun robinet, fermeture de registre inférieure à la seconde.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

<a id="documentation"></a>

### Documentation

| Document                                                  | Objectif                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------- |
| [HANDBOOK.md](HANDBOOK.md)                                | Aperçu exécutif et référence de paquet complète                |
| [ROADMAP.md](ROADMAP.md)                                  | Feuille de route du projet phase par phase                     |
| [DESIGN.md](DESIGN.md)                                    | Décisions architecturales                                      |
| [ARCHITECTURE.md](ARCHITECTURE.md)                        | Graphe de paquets, flux de données, modèle de sécurité         |
| [REFERENCE\_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md)   | Pile à 5 couches, modèles de déploiement, limites de confiance |
| [INTEGRATION\_GUIDE.md](INTEGRATION_GUIDE.md)             | Intégration API avec exemples curl + utilisation SDK           |
| [VERIFICATION\_GUIDE.md](VERIFICATION_GUIDE.md)           | Guide de relecture étape par étape pour les auditeurs          |
| [THREAT\_MODEL.md](THREAT_MODEL.md)                       | Analyse STRIDE par composant                                   |
| [CONTROL\_MATRIX.md](CONTROL_MATRIX.md)                   | Mappages menace → contrôle → fichier → test                    |
| [SECURITY.md](SECURITY.md)                                | Politique de divulgation responsable                           |
| [INSTITUTIONAL\_READINESS.md](INSTITUTIONAL_READINESS.md) | Liste de contrôle de préparation à l'adoption                  |
| [PERFORMANCE\_BASELINE.md](PERFORMANCE_BASELINE.md)       | Points de référence enregistrés                                |

***

<a id="license"></a>

## Licence

[MIT](LICENSE)
