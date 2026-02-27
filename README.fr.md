<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Nous croyons que l'argent, quel que soit son origine ou sa manière de circuler, mérite le même niveau de rigueur que les systèmes qui l'ont créé. Les contrats intelligents s'exécutent. Les blockchains enregistrent. Mais personne ne *certifie*.

Attestia est la couche manquante : gouvernance structurelle, comptabilité déterministe et intention approuvée par des humains, le tout unifié à travers les chaînes, les organisations et les individus.

Nous ne déplaçons pas votre argent. Nous prouvons ce qui s'est passé, nous limitons ce qui peut se passer et nous rendons l'enregistrement financier inviolable.

### Nos valeurs

- **La vérité avant la rapidité.** Chaque événement financier est enregistré de manière immuable, peut être rejoué et est réconciliable. Si quelque chose ne peut pas être prouvé, cela ne s'est pas produit.
- **Les humains approuvent ; les machines vérifient.** L'IA conseille, les contrats intelligents s'exécutent, mais rien ne se passe sans une autorisation humaine explicite. Jamais.
- **Gouvernance structurelle, pas politique.** Nous ne votons pas sur ce qui est valide. Nous définissons des invariants qui sont toujours valables : l'identité est explicite, la traçabilité est intacte, l'ordre est déterministe.
- **L'intention n'est pas l'exécution.** Déclarer ce que vous voulez et le faire sont des actions distinctes, avec des mécanismes de contrôle séparés. L'écart entre les deux est là où réside la confiance.
- **Les chaînes sont des témoins, pas des autorités.** XRPL certifie. Ethereum règle. Mais l'autorité émane des règles structurelles, et non du consensus de n'importe quelle chaîne.
- **L'infrastructure fiable est la clé du succès.** Le monde n'a pas besoin d'un autre protocole DeFi. Il a besoin de la couche de comptabilité sous-jacente, de la plomberie financière qui rend tout le reste digne de confiance.

---

## Architecture

Attestia est composé de trois systèmes, une seule vérité :

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

| Système | Rôle | Origine |
|--------|------|--------|
| **Personal Vault** | Observation multi-chaînes de portefeuilles, budgétisation, déclaration d'intention | Évolué à partir de NextLedger |
| **Org Treasury** | Paie déterministe, distributions DAO, financement à double autorisation, grand livre comptable à double entrée | Évolué à partir de Payroll Engine |
| **Registrum** | Registre structurel — 11 invariants, validation à double témoin, certification XRPL | Inchangé — couche constitutionnelle |

---

## Fonctionnement

Chaque interaction suit un même processus :

```
Intent → Approve → Execute → Verify
```

1. **Intention** — Un utilisateur ou un système déclare un résultat souhaité.
2. **Approbation** — Le Registrum valide structurellement ; un humain signe explicitement.
3. **Exécution** — La transaction sur la chaîne est soumise.
4. **Vérification** — La réconciliation confirme ; XRPL certifie l'enregistrement.

Aucune étape n'est facultative. Aucune étape n'est automatisée.

---

## Principes

| Principe | Implémentation |
|-----------|---------------|
| Enregistrements immuables | Pas de MODIFICATION, pas de SUPPRESSION — uniquement de nouvelles entrées. |
| Arrêt en cas d'erreur | Tout désaccord interrompt le système, sans jamais être résolu silencieusement. |
| Rejouabilité déterministe | Les mêmes événements produisent toujours le même état. |
| IA uniquement consultative | L'IA peut analyser, avertir, suggérer — mais ne peut jamais approuver, signer ou exécuter. |
| Observation multi-chaînes | Ethereum, XRPL, Solana, L2 — couche de lecture indépendante de la chaîne. |
| Identité structurelle | Explicite, immuable, unique — pas biométrique, mais constitutionnelle. |

---

## Statut

14 paquets, 1 853 tests, couverture de 96,80 %, tout est vert. Développement en public.

| Paquet | Tests | Objectif |
|---------|-------|---------|
| `@attestia/types` | 62 | Types de domaine partagés (sans dépendances) |
| `@attestia/registrum` | 297 | Gouvernance constitutionnelle — 11 invariants, double témoin |
| `@attestia/ledger` | 144 | Moteur de grand livre comptable à double entrée immuable |
| `@attestia/chain-observer` | 242 | Observation multi-chaînes en lecture seule (EVM + XRPL + Solana + L2) |
| `@attestia/vault` | 67 | Coffre personnel — portefeuilles, budgets, intentions |
| `@attestia/treasury` | 63 | Trésorerie de l'organisation — paie, distributions, mécanismes de financement |
| `@attestia/reconciler` | 56 | Correspondance multi-systèmes en 3D + attestation Registrum |
| `@attestia/witness` | 245 | Attestation sur la chaîne XRPL, gouvernance multi-signatures, mécanisme de nouvelle tentative. |
| `@attestia/verify` | 200 | Vérification de relecture, preuves de conformité, application des accords de niveau de service (SLA). |
| `@attestia/event-store` | 190 | Persistance des événements en écriture seule, JSONL, chaîne de hachage, 34 types d'événements. |
| `@attestia/proof` | 53 | Arbres de Merkle, preuves d'inclusion, emballage des preuves d'attestation. |
| `@attestia/sdk` | 50 | SDK client HTTP typé pour les consommateurs externes. |
| `@attestia/node` | 184 | API REST Hono — plus de 30 points d'accès, authentification, multi-tenancy, API publique, conformité. |

### Développement

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### Tests d'intégration XRPL

Un nœud `rippled` autonome s'exécute dans Docker pour des tests d'intégration sur la chaîne déterministes — aucune dépendance de testnet, pas de "faucet", clôture du grand livre en moins d'une seconde.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentation

| Document | Objectif |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Aperçu général et référence complète du package. |
| [ROADMAP.md](ROADMAP.md) | Feuille de route du projet, phase par phase. |
| [DESIGN.md](DESIGN.md) | Décisions architecturales. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Graphe des packages, flux de données, modèle de sécurité. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Pile en 5 couches, modèles de déploiement, limites de confiance. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Intégration de l'API avec des exemples curl + utilisation du SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guide étape par étape pour les auditeurs. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Analyse STRIDE par composant. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Correspondances menace → contrôle → fichier → test. |
| [SECURITY.md](SECURITY.md) | Politique de divulgation responsable. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Liste de contrôle de préparation à l'adoption (du produit). |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Benchmarks enregistrés. |

---

## Sécurité et portée des données

- **Données accessibles :** Lecture et écriture des entrées du grand livre financier, des enregistrements d'attestation et des preuves cryptographiques. Connexion aux nœuds de la blockchain (XRPL) lorsque le module de témoin est actif.
- **Données non accessibles :** Aucune télémétrie. Aucun stockage d'identifiants utilisateur. Aucune analyse tierce.
- **Autorisations requises :** Accès en lecture/écriture aux répertoires de données locaux. Accès réseau uniquement pour l'attestation blockchain. Consultez [THREAT_MODEL.md](THREAT_MODEL.md) pour une analyse STRIDE complète.

## Tableau de bord

| Portail | Statut |
|------|--------|
| A. Base de sécurité | PASSÉ |
| B. Gestion des erreurs | PASSÉ |
| C. Documentation pour les opérateurs | PASSÉ |
| D. Qualité du code | PASSÉ |
| E. Identité | PASSÉ |

## Licence

[MIT](LICENSE)

---

Créé par <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
