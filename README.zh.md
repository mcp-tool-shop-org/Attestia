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

<p align="center"><strong>为去中心化世界提供可靠的金融基础设施。</strong></p>

---

## 使命

我们认为，无论资金存在于何处，如何流动，都应该受到与创造这些资金的系统同等严格的监管。智能合约能够执行，区块链能够记录，但没有人能够进行“确认”。

Attestia 填补了缺失的一环：它提供结构化的治理、确定的会计体系以及经过人工审核的意图，并将这些功能统一应用于不同的链、组织和个人。

我们不挪动您的资金。我们致力于还原事实，限制可能发生的风险，并确保财务记录的不可篡改。

### 我们的价值观

- **真理重于速度。** 每一个金融事件都是只追加、可重放和可调和的。如果无法证明，那么它就没有发生。
- **人类授权，机器验证。** 人工智能提供建议，智能合约执行，但没有任何操作可以在没有明确的人类授权的情况下进行。永远不会。
- **结构性治理，而非政治性治理。** 我们不通过投票来决定什么是有效的。我们定义的是无条件成立的不变量——身份是明确的，血缘关系是完整的，顺序是确定的。
- **意图与执行是不同的。** 声明你想要什么和实际执行是两个不同的行为，它们有不同的环节。信任存在于这两者之间的差距中。
- **区块链是见证者，而非权威。** XRPL 提供证明，以太坊进行结算。但权威来自于结构性规则，而不是任何区块链的共识。
- **可靠的基础设施才是关键。** 世界不需要另一个去中心化金融协议。它需要的是底层的基础设施——即能够保证一切可信的金融系统。

---

## 建筑学

Attestia 包含三个系统，但秉持一个核心理念：真实性。

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

| 系统。 | Role | 起源。 |
|--------|------|--------|
| **Personal Vault** | 多链资产组合监控、预算规划、意图声明。 | 源自 NextLedger。 |
| **Org Treasury** | 确定性的工资发放、DAO（去中心化自治组织）的分配、双渠道融资、复式记账。 | 该产品是基于“薪资管理引擎”的演进版本。 |
| **Registrum** | 结构化注册器：包含11个不变项，采用双重验证机制，并支持XRPL认证。 | 不变的——宪法层面。 |

---

## 核心模式

每一次互动都遵循相同的流程：

```
Intent → Approve → Execute → Verify
```

1. **意图 (Yìtú)** — 用户或系统声明期望的结果。
2. **批准 (Pīzhǔn)** — Registrum 系统进行结构验证；人工进行明确签名。
3. **执行 (Zhíxíng)** — 将链上交易提交。
4. **验证 (Yànzhèng)** — 对账确认；XRPL 平台对记录进行认证。

没有任何步骤是可省略的。没有任何步骤可以被自动化取代。

---

## 原则

| 原则。 | 实施。 |
|-----------|---------------|
| 只可追加记录。 | 没有更新，没有删除，只有新增的内容。 |
| 失效安全。 | 意见分歧会使系统停滞，永远不会悄无声息地解决。 |
| 确定性重放。 | 相同的事件总是会产生相同的结果。 |
| 仅提供咨询型人工智能服务。 | 人工智能可以进行分析、发出警告、提出建议，但绝不会批准、签署或执行任何操作。 |
| 多链监控。 | 以太坊、XRPL、Solana、二层网络——一种不依赖特定区块链的读取层。 |
| 结构身份。 | 明确、不可更改、独一无二——并非生物特征，而是宪法规定的。 |

---

## 状态

14个软件包，1853个测试用例，覆盖率96.80%，所有测试均通过。正在进行公开构建。

| 包装。 | Tests | 目的。 |
|---------|-------|---------|
| `@attestia/types` | 62 | 共享的域名类型（无需依赖）。 |
| `@attestia/registrum` | 297 | 宪法治理：11项基本原则，双重见证。 |
| `@attestia/ledger` | 144 | 仅支持追加写入的双重记账引擎。 |
| `@attestia/chain-observer` | 242 | 多链只读观察（支持以太坊虚拟机、XRP Ledger、Solana以及二层网络）。 |
| `@attestia/vault` | 67 | 个人保险箱：包含投资组合、预算和目标。 |
| `@attestia/treasury` | 63 | 组织财务部 — 负责工资发放、资金分配和资金审批流程。 |
| `@attestia/reconciler` | 56 | 三维跨系统匹配 + Registrum 认证。 |
| `@attestia/witness` | 245 | XRPL 链上验证、多重签名治理、重试机制。 |
| `@attestia/verify` | 200 | 回放验证、合规性证明、服务级别协议（SLA）执行。 |
| `@attestia/event-store` | 190 | 仅支持追加写入的事件持久化，JSONL格式，哈希链，34种事件类型。 |
| `@attestia/proof` | 53 | 默克尔树、包含证明、证明封装。 |
| `@attestia/sdk` | 50 | 为外部用户提供的、基于类型安全 HTTP 客户端的软件开发工具包。 |
| `@attestia/node` | 184 | Hono REST API：提供30多个接口，支持身份验证、多租户模式、公共API以及合规性。 |

### 发展

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### XRPL 集成测试

一个独立的 `rippled` 节点可以在 Docker 环境中运行，用于进行可预测的链上集成测试。它无需依赖测试网络，也不需要水龙头（用于提供测试币），并且账本的更新速度可以达到亚秒级别。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### 文档

| 文档。 | 目的。 |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | 管理层概要及完整产品参考。 |
| [ROADMAP.md](ROADMAP.md) | 分阶段的项目路线图。 |
| [DESIGN.md](DESIGN.md) | 软件架构决策。 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 软件包图、数据流、安全模型。 |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | 五层堆叠结构、部署模式、信任边界。 |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | API 集成示例（使用 curl）+ SDK 使用方法。 |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | 审计员的逐步操作指南。 |
| [THREAT_MODEL.md](THREAT_MODEL.md) | 对每个组件进行 STRIDE 分析。 |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | 威胁 -> 控制 -> 文件 -> 测试映射关系。 |
| [SECURITY.md](SECURITY.md) | 负责任的漏洞披露政策。 |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | 收养准备清单。 |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | 已记录的性能测试结果。 |

---

## 许可

[麻省理工学院] (LICENSE)
