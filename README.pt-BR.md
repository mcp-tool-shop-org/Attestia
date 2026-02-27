<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

## Missão

Acreditamos que o dinheiro — seja onde estiver, seja como for movimentado — merece o mesmo rigor dos sistemas que o criaram. Contratos inteligentes executam. Blockchains registram. Mas ninguém *atesta*.

A Attestia é a camada que está faltando: governança estrutural, contabilidade determinística e intenção aprovada por humanos — unificada em diferentes blockchains, organizações e indivíduos.

Nós não movimentamos seu dinheiro. Nós provamos o que aconteceu, restringimos o que pode acontecer e tornamos o registro financeiro inviolável.

### O Que Defendemos

- **Verdade acima da velocidade.** Cada evento financeiro é registrado de forma imutável, pode ser reproduzido e conciliado. Se não pode ser provado, não aconteceu.
- **Humanos aprovam; máquinas verificam.** A inteligência artificial oferece conselhos, os contratos inteligentes executam, mas nada se move sem autorização humana explícita. Nunca.
- **Governança estrutural, não política.** Nós não votamos no que é válido. Nós definimos invariantes que se aplicam incondicionalmente — a identidade é explícita, a linhagem é ininterrupta, a ordem é determinística.
- **Intenção não é execução.** Declarar o que você quer e fazer isso são atos separados, com mecanismos separados. A lacuna entre eles é onde a confiança reside.
- **Blockchains são testemunhas, não autoridades.** A XRPL atesta. O Ethereum liquida. Mas a autoridade emana de regras estruturais, não do consenso de nenhuma blockchain.
- **Infraestrutura confiável é o que importa.** O mundo não precisa de mais um protocolo DeFi. Ele precisa da camada de contabilidade por baixo — a infraestrutura financeira que torna tudo o mais confiável.

---

## Arquitetura

A Attestia é composta por três sistemas, com uma única verdade:

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

| Sistema | Função | Origem |
|--------|------|--------|
| **Personal Vault** | Observação de portfólio em múltiplas blockchains, orçamento, declaração de intenção | Evoluído do NextLedger |
| **Org Treasury** | Folha de pagamento determinística, distribuição de DAOs, financiamento com dupla autorização, livro razão de contabilidade de duplo lançamento | Evoluído do Payroll Engine |
| **Registrum** | Registro estrutural — 11 invariantes, validação com dupla testemunha, atestado da XRPL | Inalterado — camada constitucional |

---

## Padrão Central

Cada interação segue um fluxo:

```
Intent → Approve → Execute → Verify
```

1. **Intenção** — Um usuário ou sistema declara um resultado desejado.
2. **Aprovação** — O Registrum valida estruturalmente; um humano assina explicitamente.
3. **Execução** — A transação na blockchain é submetida.
4. **Verificação** — A conciliação confirma; a XRPL atesta o registro.

Nenhuma etapa é opcional. Nenhuma etapa é automatizada.

---

## Princípios

| Princípio | Implementação |
|-----------|---------------|
| Registros somente de acréscimo | Sem UPDATE, sem DELETE — apenas novas entradas. |
| Falha segura | O desacordo interrompe o sistema, nunca se corrige silenciosamente. |
| Reprodução determinística | Os mesmos eventos produzem o mesmo estado, sempre. |
| Inteligência Artificial apenas consultiva | A IA pode analisar, alertar, sugerir — nunca aprovar, assinar ou executar. |
| Observação em múltiplas blockchains | Ethereum, XRPL, Solana, L2s — camada de leitura independente de blockchain. |
| Identidade estrutural | Explícita, imutável, única — não biométrica, mas constitucional. |

---

## Status

14 pacotes, 1.853 testes, cobertura de 96,80%, tudo em verde. Desenvolvendo abertamente.

| Pacote | Testes | Propósito |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipos de domínio compartilhados (sem dependências) |
| `@attestia/registrum` | 297 | Governança constitucional — 11 invariantes, dupla testemunha |
| `@attestia/ledger` | 144 | Motor de contabilidade de duplo lançamento somente de acréscimo |
| `@attestia/chain-observer` | 242 | Observação somente de leitura em múltiplas blockchains (EVM + XRPL + Solana + L2s) |
| `@attestia/vault` | 67 | Cofre pessoal — portfólios, orçamentos, intenções |
| `@attestia/treasury` | 63 | Tesouraria da organização — folha de pagamento, distribuições, portais de financiamento |
| `@attestia/reconciler` | 56 | Correspondência entre sistemas em 3D + Atestado do Registrum |
| `@attestia/witness` | 245 | Atestado on-chain do XRPL, governança multi-assinatura, tentativas de repetição. |
| `@attestia/verify` | 200 | Verificação de repetição, evidência de conformidade, aplicação de SLA. |
| `@attestia/event-store` | 190 | Persistência de eventos somente para anexação, JSONL, cadeia de hash, 34 tipos de eventos. |
| `@attestia/proof` | 53 | Árvores de Merkle, provas de inclusão, empacotamento de provas de atestado. |
| `@attestia/sdk` | 50 | SDK de cliente HTTP tipado para consumidores externos. |
| `@attestia/node` | 184 | API REST Hono — mais de 30 endpoints, autenticação, multi-tenência, API pública, conformidade. |

### Desenvolvimento

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### Testes de integração do XRPL

Um nó `rippled` independente é executado no Docker para testes de integração on-chain determinísticos — sem dependência de testnet, sem faucet, fechamento do livro razão em menos de um segundo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentação

| Documento | Propósito |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Visão geral executiva e referência completa do pacote. |
| [ROADMAP.md](ROADMAP.md) | Roteiro do projeto fase a fase. |
| [DESIGN.md](DESIGN.md) | Decisões de arquitetura. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Gráfico de pacotes, fluxos de dados, modelo de segurança. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Pilha de 5 camadas, padrões de implantação, limites de confiança. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integração da API com exemplos de curl + uso do SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guia passo a passo para auditoria. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Análise STRIDE por componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Mapeamento de ameaça → controle → arquivo → teste. |
| [SECURITY.md](SECURITY.md) | Política de divulgação responsável. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista de verificação de preparação para adoção. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Benchmarks registrados. |

---

## Escopo de Segurança e Dados

- **Dados acessados:** Leitura e escrita de entradas do livro razão financeiro, registros de atestado e provas criptográficas. Conecta-se a nós de blockchain (XRPL) quando o módulo de testemunha está ativo.
- **Dados NÃO acessados:** Sem telemetria. Sem armazenamento de credenciais de usuário. Sem análises de terceiros.
- **Permissões necessárias:** Acesso de leitura/escrita a diretórios de dados locais. Acesso à rede apenas para atestado de blockchain. Consulte [THREAT_MODEL.md](THREAT_MODEL.md) para a análise STRIDE completa.

## Painel de avaliação

| Portão | Status |
|------|--------|
| A. Base de Segurança | APROVADO |
| B. Tratamento de Erros | APROVADO |
| C. Documentação para Operadores | APROVADO |
| D. Higiene na Entrega | APROVADO |
| E. Identidade | APROVADO |

## Licença

[MIT](LICENSE)

---

Criado por <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a>
