<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/Attestia/readme.png" alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>Infrastructure financière pour un monde décentralisé.</strong></p>

---

## Mission

Nous pensons que l'argent, quel que soit son origine ou sa circulation, mérite le même niveau de rigueur que les systèmes qui l'ont créé. Les contrats intelligents s'exécutent. Les blockchains enregistrent. Mais personne ne *certifie*.

Attestia comble une lacune : elle offre une gouvernance structurée, une comptabilité déterministe et une validation des intentions par des humains, le tout unifié à travers les chaînes de blocs, les organisations et les individus.

Nous ne déplaçons pas votre argent. Nous prouvons ce qui s'est passé, nous limitons ce qui peut se produire, et nous rendons les données financières inviolables.

### Nos valeurs

- **La vérité prime sur la rapidité.** Chaque événement financier est enregistré de manière immuable, peut être rejoué et est vérifiable. Si quelque chose ne peut être prouvé, cela ne s'est pas produit.
- **Les humains approuvent ; les machines vérifient.** L'IA fournit des conseils, les contrats intelligents exécutent les actions, mais rien ne se fait sans une autorisation humaine explicite. Jamais.
- **Gouvernance structurelle, pas politique.** Nous ne votons pas sur ce qui est valide. Nous définissons des invariants qui sont toujours valables : l'identité est explicite, la traçabilité est continue, et l'ordre est déterministe.
- **L'intention n'est pas l'exécution.** Déclarer ce que vous voulez et le faire sont deux actions distinctes, avec des mécanismes de contrôle séparés. L'écart entre les deux est là où réside la confiance.
- **Les chaînes sont des témoins, pas des autorités.** XRPL atteste. Ethereum règle les transactions. Mais l'autorité émane des règles structurelles, et non du consensus de n'importe quelle chaîne.
- **Une infrastructure fiable est la clé du succès.** Le monde n'a pas besoin d'un autre protocole DeFi. Il a besoin de la couche de base qui le sous-tend : l'infrastructure financière qui rend tout le reste digne de confiance.

---

## Architecture

Attestia : trois systèmes, une seule vérité.

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

| Système. | Role | Origine. |
|--------|------|--------|
| **Personal Vault** | Observation de portefeuilles multi-actifs, budgétisation par enveloppes, déclaration d'intention. | Dérivé de NextLedger. |
| **Org Treasury** | Paie déterministe, distributions via DAO, financement à double volet, grand livre comptable à double entrée. | Dérivé de Payroll Engine. |
| **Registrum** | Enregistreur structuré — 11 invariants, validation par double attestation, certification XRPL. | Sans modification — niveau constitutionnel. |

---

## Motif principal.
Modèle fondamental.
Structure de base.
Schéma central.
(Selon le contexte, d'autres traductions pourraient être plus appropriées.)

Chaque interaction suit un même schéma :

```
Intent → Approve → Execute → Verify
```

1. **Intention** — Un utilisateur ou un système exprime un résultat souhaité.
2. **Approbation** — Registrum valide la structure ; un humain signe explicitement.
3. **Exécution** — La transaction sur la blockchain est soumise.
4. **Vérification** — La réconciliation confirme ; XRPL atteste de l'enregistrement.

Aucune étape n'est facultative. Aucune étape ne peut être automatisée et supprimée.

---

## Principes

| Principe. | Mise en œuvre. |
|-----------|---------------|
| Enregistrements en écriture seule. | Pas de mise à jour, pas de suppression, uniquement de nouvelles entrées. |
| Arrêt en cas de défaillance.
Ou :
Mode de sécurité en cas de panne.
Ou :
Arrêt automatique en cas de défaut.
(The best option depends on the specific context.) | Le désaccord interrompt le système, et ne se résout jamais silencieusement. |
| Relecture déterministe. | Les mêmes événements produisent toujours le même état de choses. |
| Intelligence artificielle à des fins de conseil uniquement. | L'IA peut analyser, alerter et faire des suggestions, mais elle ne peut jamais approuver, signer ou exécuter quoi que ce soit. |
| Observation multi-chaînes. | Ethereum, XRPL, Solana, solutions de couche 2 : une couche de lecture indépendante de la blockchain. |
| Identité structurelle. | Explicite, immuable, unique : pas biométrique, mais constitutionnel. |

---

## Statut

14 paquets, 1 853 tests, taux de couverture de 96,80 %, tout est en ordre. Développement en accès public.

| Paquet. | Tests | Objectif. |
|---------|-------|---------|
| `@attestia/types` | 62 | Types de domaines partagés (sans dépendances). |
| `@attestia/registrum` | 297 | Gouvernance constitutionnelle : 11 principes fondamentaux, système de double contrôle. |
| `@attestia/ledger` | 144 | Moteur de comptabilité à double entrée, avec enregistrement uniquement en ajout. |
| `@attestia/chain-observer` | 242 | Observation en lecture seule sur plusieurs chaînes (EVM, XRPL, Solana et solutions de couche 2). |
| `@attestia/vault` | 67 | Coffre-fort personnel : portefeuilles, budgets, objectifs. |
| `@attestia/treasury` | 63 | Trésorerie de l'organisation : gestion de la paie, des distributions et des flux de financement. |
| `@attestia/reconciler` | 56 | Correspondance intersystèmes en 3D + Attestation Registrum. |
| `@attestia/witness` | 245 | Attestation sur la blockchain XRPL, gouvernance multi-signatures, mécanisme de nouvelle tentative. |
| `@attestia/verify` | 200 | Vérification des enregistrements, preuves de conformité, application des accords de niveau de service (SLA). |
| `@attestia/event-store` | 190 | Persistance des événements en mode ajout uniquement, format JSONL, chaîne de hachage, 34 types d'événements. |
| `@attestia/proof` | 53 | Arbres de Merkle, preuves d'inclusion, empaquetage des preuves d'attestation. |
| `@attestia/sdk` | 50 | SDK client HTTP typé pour les utilisateurs externes. |
| `@attestia/node` | 184 | API REST Hono : plus de 30 points d'accès, authentification, multi-tenancy, API publique, conformité. |

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

Un nœud "rippled" autonome, exécuté dans Docker, permet de réaliser des tests d'intégration déterministes directement sur la chaîne de blocs, sans dépendance à un réseau de test, sans avoir besoin d'un "robinet" (faucet) pour les fonds, et avec une finalisation du grand livre en moins d'une seconde.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentation

| Document. | Objectif. |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Aperçu général et référence complète du dossier. |
| [ROADMAP.md](ROADMAP.md) | Plan de projet détaillé, par phases. |
| [DESIGN.md](DESIGN.md) | Décisions concernant l'architecture. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Représentation graphique des paquets, flux de données, modèle de sécurité. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Pile à 5 couches, modèles de déploiement, limites de confiance. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Intégration de l'API avec des exemples utilisant curl, ainsi que des instructions sur l'utilisation du SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guide de révision pas à pas pour les auditeurs. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Analyse STRIDE par composant. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Menace → contrôle → fichier → tests de correspondance. |
| [SECURITY.md](SECURITY.md) | Politique de divulgation responsable. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Liste de contrôle pour vérifier la préparation à l'adoption. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Résultats de tests comparatifs enregistrés. |

---

## Licence

[Licence MIT](LICENSE)
