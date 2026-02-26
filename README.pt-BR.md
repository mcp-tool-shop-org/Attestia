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

<p align="center"><strong>Infraestrutura de confiança financeira para o mundo descentralizado.</strong></p>

---

## Missão

Acreditamos que o dinheiro – seja onde estiver, seja como se movimente – merece o mesmo rigor dos sistemas que o criaram. Os contratos inteligentes são executados. As blockchains registram. Mas ninguém *certifica*.

A Attestia é a camada que faltava: governança estrutural, contabilidade determinística e intenção aprovada por humanos, tudo unificado em diferentes blockchains, organizações e indivíduos.

Nós não movimentamos o seu dinheiro. Nós comprovamos o que aconteceu, limitamos o que pode acontecer e garantimos a integridade do registro financeiro.

### O que defendemos

- **Veracidade acima da velocidade.** Cada evento financeiro é registrado de forma imutável, pode ser reproduzido e conciliado. Se não pode ser comprovado, não aconteceu.
- **Humanos aprovam; máquinas verificam.** A inteligência artificial oferece recomendações, os contratos inteligentes executam, mas nada avança sem a autorização explícita de um humano. Nunca.
- **Governança estrutural, não política.** Não votamos sobre o que é válido. Definimos princípios que são válidos incondicionalmente – a identidade é explícita, a linhagem é ininterrupta, a ordem é determinística.
- **Intenção não é execução.** Declarar o que se deseja e realizar essa ação são atos distintos, com mecanismos de controle separados. A diferença entre eles é onde reside a confiança.
- **As cadeias são testemunhas, não autoridades.** O XRPL atesta. O Ethereum liquida. Mas a autoridade emana das regras estruturais, e não do consenso de qualquer cadeia.
- **A infraestrutura sólida é a que prevalece.** O mundo não precisa de mais um protocolo DeFi. O que é necessário é a camada de contabilidade subjacente – a infraestrutura financeira que torna tudo o mais confiável.

---

## Arquitetura

A Attestia é composta por três sistemas, mas compartilha uma única fonte de verdade.

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

| Sistema. | Role | Origem. |
|--------|------|--------|
| **Personal Vault** | Observação de portfólios com múltiplas cadeias, definição de orçamentos flexíveis, declaração de intenções. | Desenvolvido a partir do NextLedger. |
| **Org Treasury** | Folha de pagamento determinística, distribuição de recursos em organizações autônomas descentralizadas (DAOs), financiamento com múltiplas fontes, sistema de contabilidade de partida dupla. | Desenvolvido a partir da plataforma Payroll Engine. |
| **Registrum** | Registrador estrutural – 11 invariantes, validação com testemunha dupla, certificação XRPL. | Inalterado – camada constitucional. |

---

## Padrão fundamental

Cada interação segue um mesmo padrão:

```
Intent → Approve → Execute → Verify
```

1. **Intenção** — Um usuário ou sistema declara um resultado desejado.
2. **Aprovar** — O sistema Registrum valida a estrutura; um humano assina explicitamente.
3. **Executar** — A transação na blockchain é submetida.
4. **Verificar** — A reconciliação confirma; o XRPL atesta o registro.

Nenhuma etapa é opcional. Nenhuma etapa é automatizada.

---

## Princípios

| Princípio. | Implementação. |
|-----------|---------------|
| Registros de apenas adição. | Sem atualizações, sem exclusões – apenas novas entradas. |
| Falha segura. | O desacordo interrompe o sistema, nunca se resolve silenciosamente. |
| Reprodução determinística. | Os mesmos eventos sempre produzem o mesmo resultado. |
| Apenas inteligência artificial consultiva. | A inteligência artificial pode analisar, alertar e sugerir, mas nunca aprovar, assinar ou executar ações. |
| Observação de múltiplas cadeias. | Ethereum, XRPL, Solana, soluções de segunda camada (L2) — uma camada de leitura independente de blockchains. |
| Identidade estrutural. | Explícito, imutável, único – não biométrico, mas constitucional. |

---

## Status

14 pacotes, 1.853 testes, cobertura de 96,80%, tudo em ordem. Construção em ambiente público.

| Pacote. | Tests | Objetivo. |
|---------|-------|---------|
| `@attestia/types` | 62 | Tipos de domínio compartilhados (sem dependências). |
| `@attestia/registrum` | 297 | Governança constitucional: 11 princípios fundamentais, sistema de dupla validação. |
| `@attestia/ledger` | 144 | Motor de contabilidade de dupla entrada com registro apenas de adições. |
| `@attestia/chain-observer` | 242 | Observação somente para leitura em múltiplas blockchains (EVM + XRPL + Solana + L2s). |
| `@attestia/vault` | 67 | Cofre pessoal – portfólios, orçamentos, objetivos. |
| `@attestia/treasury` | 63 | Tesouraria da organização: folha de pagamento, distribuições, critérios de financiamento. |
| `@attestia/reconciler` | 56 | Correspondência tridimensional entre diferentes sistemas + Certificação Registrum. |
| `@attestia/witness` | 245 | Atestação na blockchain do XRPL, governança multi-assinatura, e mecanismo de repetição. |
| `@attestia/verify` | 200 | Verificação de repetições, comprovação de conformidade, cumprimento de acordos de nível de serviço (SLA). |
| `@attestia/event-store` | 190 | Persistência de eventos com adição apenas, formato JSONL, cadeia de hash, 34 tipos de eventos. |
| `@attestia/proof` | 53 | Árvores de Merkle, provas de inclusão, empacotamento de provas de autenticação. |
| `@attestia/sdk` | 50 | SDK para clientes HTTP, com tipagem estática, destinado a consumidores externos. |
| `@attestia/node` | 184 | Hono REST API: mais de 30 pontos de acesso, autenticação, suporte a multi-inquilino, API pública e conformidade. |

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

Um nó "rippled" independente é executado em um contêiner Docker para testes de integração determinísticos na blockchain, eliminando a dependência de redes de teste e a necessidade de "faucet" (serviços de distribuição de criptomoedas), com um tempo de fechamento do livro-razão inferior a um segundo.

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### Documentação

| Documento. | Objetivo. |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | Visão geral executiva e referência completa do pacote. |
| [ROADMAP.md](ROADMAP.md) | Cronograma do projeto, detalhado por fases. |
| [DESIGN.md](DESIGN.md) | Decisões de arquitetura. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Gráfico de pacotes, fluxos de dados, modelo de segurança. |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | Empilhamento de 5 camadas, padrões de implantação, limites de confiança. |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Integração da API com exemplos usando `curl` + utilização do SDK. |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | Guia passo a passo para a reprodução de auditorias. |
| [THREAT_MODEL.md](THREAT_MODEL.md) | Análise STRIDE para cada componente. |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | Ameaça → controle → arquivo → mapeamentos de teste. |
| [SECURITY.md](SECURITY.md) | Política de divulgação responsável. |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | Lista de verificação de preparação para a adoção. |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | Resultados de testes de desempenho. |

---

## Licença

[Licença do MIT](LICENSE)
