<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

我们相信，无论资金存在于何处，流动方式如何，它都应该像创造它的系统一样，具有同样的严谨性。智能合约执行，区块链记录，但没有人进行“确认”。

Attestia 提供了缺失的一层：结构化治理、确定性会计和经过人工批准的意图，这些都统一应用于链、组织和个人。

我们不移动您的资金。我们证明发生了什么，限制可能发生的事情，并确保财务记录不可篡改。

### 我们的价值观

- **真实性胜过速度。** 每一个财务事件都是只追加记录的，可以重放和对账。如果无法证明，那么它就没有发生。
- **人类批准；机器验证。** 人工智能提供建议，智能合约执行，但没有任何操作可以在没有明确的人工授权的情况下进行。永远。
- **结构化治理，而非政治治理。** 我们不投票决定什么是有效的。我们定义的是无条件成立的不变量——身份是明确的，血缘是完整的，顺序是确定的。
- **意图不是执行。** 声明您想要什么和执行它，是两个不同的行为，并且有不同的环节。信任存在于这两者之间的差距中。
- **链是见证者，而非权威。** XRPL 进行确认。以太坊进行结算。但权威来自于结构化的规则，而不是任何链的共识。
- **可靠的基础设施是关键。** 世界不需要另一个 DeFi 协议。它需要底层的基础设施——使所有其他事物都值得信赖的财务系统。

---

## 架构

Attestia 由三个系统组成，但只有一个真理：

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

| 系统 | 角色 | 起源 |
|--------|------|--------|
| **Personal Vault** | 多链投资组合观察、预算管理、意图声明 | 源自 NextLedger |
| **Org Treasury** | 确定性工资单、DAO 分配、双重授权资金、复式记账 | 源自 Payroll Engine |
| **Registrum** | 结构化注册器——11 个不变量、双重验证、XRPL 确认 | 未改变——宪法层 |

---

## 核心流程

每一次交互都遵循以下流程：

```
Intent → Approve → Execute → Verify
```

1. **意图**——用户或系统声明期望的结果。
2. **批准**——注册系统进行结构化验证；人类进行明确签名。
3. **执行**——提交链上交易。
4. **验证**——对账确认；XRPL 确认记录。

任何步骤都不是可选的。任何步骤都不会被自动化省略。

---

## 原则

| 原则 | 实现 |
|-----------|---------------|
| 只追加记录 | 没有更新，没有删除——只有新的条目。 |
| 失效保护 | 出现分歧时，系统会停止，而不是静默恢复。 |
| 确定性重放 | 相同的事件始终产生相同的状态。 |
| 仅提供咨询人工智能 | 人工智能可以分析、警告、建议，但不能批准、签名或执行。 |
| 多链观察 | 以太坊、XRPL、Solana、L2——链无关的只读层。 |
| 结构化身份 | 明确、不可变的、唯一的——不是生物识别，而是宪法层。 |

---

## 状态

14 个软件包，1853 个测试，96.80% 的覆盖率，全部通过。公开构建。

| 软件包 | 测试 | 目的 |
|---------|-------|---------|
| `@attestia/types` | 62 | 共享领域类型（无依赖） |
| `@attestia/registrum` | 297 | 宪法治理——11 个不变量、双重验证 |
| `@attestia/ledger` | 144 | 只追加的复式记账引擎 |
| `@attestia/chain-observer` | 242 | 多链只读观察（EVM + XRPL + Solana + L2s） |
| `@attestia/vault` | 67 | 个人钱包——投资组合、预算、意图 |
| `@attestia/treasury` | 63 | 组织资金——工资单、分配、资金闸门 |
| `@attestia/reconciler` | 56 | 3D跨系统匹配 + Registrum 认证 |
| `@attestia/witness` | 245 | XRPL链上认证，多重签名治理，重试机制 |
| `@attestia/verify` | 200 | 重放验证，合规性证据，SLA执行 |
| `@attestia/event-store` | 190 | 只追加事件持久化，JSONL格式，哈希链，34种事件类型 |
| `@attestia/proof` | 53 | 默克尔树，包含证明，认证证明打包 |
| `@attestia/sdk` | 50 | 用于外部消费者的类型化HTTP客户端SDK |
| `@attestia/node` | 184 | Hono REST API — 30多个端点，认证，多租户，公共API，合规性 |

### 开发

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### XRPL集成测试

一个独立的`rippled`节点在Docker中运行，用于确定性的链上集成测试——无需测试网，无需测试币，账本关闭时间小于一秒。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### 文档

| 文档 | 目的 |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | 执行概要和完整包参考 |
| [ROADMAP.md](ROADMAP.md) | 分阶段的项目路线图 |
| [DESIGN.md](DESIGN.md) | 架构决策 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 包图，数据流，安全模型 |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | 五层架构，部署模式，信任边界 |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | API集成示例（使用curl）+ SDK使用指南 |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | 审计员分步重放指南 |
| [THREAT_MODEL.md](THREAT_MODEL.md) | 每个组件的STRIDE分析 |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | 威胁 → 控制 → 文件 → 测试 映射 |
| [SECURITY.md](SECURITY.md) | 负责任的披露政策 |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | 采用准备清单 |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | 已记录的基准测试 |

---

## 安全与数据范围

- **访问的数据：** 读取和写入财务账本条目、认证记录和密码学证明。当观察者模块处于活动状态时，连接到区块链节点（XRPL）。
- **未访问的数据：** 无遥测数据。无用户凭证存储。无第三方分析。
- **所需权限：** 对本地数据目录的读/写访问权限。仅用于区块链认证的网络访问权限。请参阅[THREAT_MODEL.md](THREAT_MODEL.md)以获取完整的STRIDE分析。

## 评估标准

| 准则 | 状态 |
|------|--------|
| A. 安全基线 | 通过 |
| B. 错误处理 | 通过 |
| C. 运维文档 | 通过 |
| D. 发布质量 | 通过 |
| E. 身份验证 | 通过 |

## 许可证

[MIT](LICENSE)

---

由 <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> 构建
