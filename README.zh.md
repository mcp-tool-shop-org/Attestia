<p align="center">
  <a href="README.md">English</a> | <a href="README.ja.md">日本語</a> | <strong>中文</strong> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
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

## 使命

我们相信，无论金钱存在于何处，如何流动，都应该像创建它的系统一样经过严格审查。智能合约执行。区块链记录。但没有人进行 *证明*。

Attestia 是缺失的一层：结构化治理、确定性会计和人工批准的意图——跨链、组织和个人统一。

我们不转移你的资金。我们证明发生了什么，限制可能发生的事情，并使财务记录不可破坏。

<a id="what-we-stand-for"></a>

### 我们的立场

- **真实性优于速度。** 每个财务事件都是只追加的、可重放的和可协调的。如果无法证明，就没有发生。
- **人工审批；机器验证。** AI 提供建议，智能合约执行，但没有明确的人工授权，任何事都不会发生。永不。
- **结构化治理，而不是政治治理。** 我们不投票决定什么有效。我们定义无条件成立的不变量——身份是明确的、血统是不间断的、排序是确定性的。
- **意图不是执行。** 声明你想要的东西和做这件事是两个独立的行为，各有各的门槛。它们之间的差距就是信任所在的地方。
- **区块链是见证者，而不是权威。** XRPL 证明。Ethereum 结算。但权威来自结构规则，而不是任何区块链的共识。
- **无趣的基础设施胜出。** 世界不需要另一个 DeFi 协议。它需要下面的会计层——使其他一切都值得信赖的财务管道。

***

<a id="architecture"></a>

## 架构

Attestia 是三个系统，一个真实：

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

| 系统            | 角色                            | 来源                |
| ------------- | ----------------------------- | ----------------- |
| **个人金库**      | 多链投资组合观察、信封预算、意图声明            | 从 NextLedger 演变而来 |
| **组织财务**      | 确定性薪资、DAO 分配、双门融资、复式记账        | 从薪资引擎演变而来         |
| **Registrum** | 结构化登记处——11 项不变量、双证人验证、XRPL 证明 | 未变——宪法层           |

***

<a id="core-pattern"></a>

## 核心模式

每个交互都遵循一个流程：

```
Intent → Approve → Execute → Verify
```

1. **意图** — 用户或系统声明所需的结果
1. **审批** — Registrum 在结构上验证；人工明确签署
1. **执行** — 链上交易已提交
1. **验证** — 协调确认；XRPL 证明记录

没有步骤是可选的。没有步骤是自动化的。

***

<a id="principles"></a>

## 原则

| 原则      | 实现                               |
| ------- | -------------------------------- |
| 只追加记录   | 没有 UPDATE，没有 DELETE——只有新条目       |
| 故障关闭    | 分歧停止系统，永远不会无声地修复                 |
| 确定性重放   | 相同的事件始终产生相同的状态                   |
| 仅限顾问 AI | AI 可以分析、警告、建议——永远不能批准、签署或执行      |
| 多链观察    | Ethereum、XRPL、Solana、L2——链无关的读取层 |
| 结构化身份   | 明确的、不可变的、唯一的——不是生物识别，而是宪法        |

***

<a id="status"></a>

## 状态

14 个包，1,853 个测试，96.80% 的覆盖率，全部通过。公开构建。

| 包                          | 测试  | 目的                                      |
| -------------------------- | --- | --------------------------------------- |
| `@attestia/types`          | 62  | 共享域类型（零依赖）                              |
| `@attestia/registrum`      | 297 | 宪法治理——11 项不变量、双证人                       |
| `@attestia/ledger`         | 144 | 仅追加双记账引擎                                |
| `@attestia/chain-observer` | 242 | 多链只读观察（EVM + XRPL + Solana + L2s）       |
| `@attestia/vault`          | 67  | 个人金库 — 投资组合、预算、意图                       |
| `@attestia/treasury`       | 63  | 组织金库 — 薪资、分配、融资关口                       |
| `@attestia/reconciler`     | 56  | 3D 跨系统匹配 + Registrum 证明                 |
| `@attestia/witness`        | 245 | XRPL 链上证明、多签治理、重试                       |
| `@attestia/verify`         | 200 | 重放验证、合规证据、SLA 执行                        |
| `@attestia/event-store`    | 190 | 仅追加事件持久化、JSONL、哈希链、34 种事件类型             |
| `@attestia/proof`          | 53  | 默克尔树、包含证明、证明打包                          |
| `@attestia/sdk`            | 50  | 为外部使用者提供的类型化 HTTP 客户端 SDK               |
| `@attestia/node`           | 184 | Hono REST API — 30+ 端点、认证、多租户、公共 API、合规 |

<a id="development"></a>

### 开发

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

<a id="xrpl-integration-testing"></a>

### XRPL 集成测试

独立的 `rippled` 节点在 Docker 中运行以进行确定性链上集成测试 — 无测试网依赖、无水龙头、亚秒级账本关闭。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

<a id="documentation"></a>

### 文档

| 文档                                                        | 用途                       |
| --------------------------------------------------------- | ------------------------ |
| [HANDBOOK.md](HANDBOOK.md)                                | 执行概述和完整包参考               |
| [ROADMAP.md](ROADMAP.md)                                  | 分阶段项目路线图                 |
| [DESIGN.md](DESIGN.md)                                    | 架构决策                     |
| [ARCHITECTURE.md](ARCHITECTURE.md)                        | 包图、数据流、安全模型              |
| [REFERENCE\_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md)   | 5 层栈、部署模式、信任边界           |
| [INTEGRATION\_GUIDE.md](INTEGRATION_GUIDE.md)             | API 集成及 curl 示例 + SDK 使用 |
| [VERIFICATION\_GUIDE.md](VERIFICATION_GUIDE.md)           | 审计员逐步重放指南                |
| [THREAT\_MODEL.md](THREAT_MODEL.md)                       | 按组件进行 STRIDE 分析          |
| [CONTROL\_MATRIX.md](CONTROL_MATRIX.md)                   | 威胁 → 控制 → 文件 → 测试映射      |
| [SECURITY.md](SECURITY.md)                                | 负责任披露政策                  |
| [INSTITUTIONAL\_READINESS.md](INSTITUTIONAL_READINESS.md) | 采纳准备就绪核清单                |
| [PERFORMANCE\_BASELINE.md](PERFORMANCE_BASELINE.md)       | 记录的基准测试                  |

***

<a id="license"></a>

## 许可证

[MIT](LICENSE)
