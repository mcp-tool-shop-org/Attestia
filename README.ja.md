<p align="center">
  <a href="README.md">English</a> | <strong>日本語</strong> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
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

## ミッション

金銭は、どこに存在し、どのように流動するかに関わらず、それを生み出したシステムと同じ厳密さに値すると私たちは考えています。スマートコントラクトは実行されます。ブロックチェーンは記録します。しかし誰も *証明* しません。

Attestia は欠けていたレイヤーです。構造的ガバナンス、決定論的な会計、人間が承認した意図を、チェーン、組織、個人を横断して統一します。

私たちはあなたの金銭を動かしません。何が起きたかを証明し、何が起きうるかを制約し、金融記録を破棄不可能にします。

<a id="what-we-stand-for"></a>

### 私たちが支持すること

- **速度より真実。** すべての金融イベントは追記専用、リプレイ可能、照合可能です。証明できなければ、それは起きていません。
- **人間が承認し、機械が検証する。** AI はアドバイスし、スマートコントラクトは実行しますが、明示的な人間の認可なしに何も動きません。決してありません。
- **政治的ガバナンスではなく、構造的ガバナンス。** 私たちは何が有効かを投票で決めません。無条件に成立する不変量を定義します。アイデンティティは明示的、系統は途切れず、順序は決定論的です。
- **意図は実行ではない。** あなたが望むことを宣言することと、実際に行うことは異なる行為であり、異なるゲートを持ちます。その間隙こそが信頼が存在する場所です。
- **チェーンは権威ではなく証人である。** XRPL が証明します。Ethereum が決済します。しかし権威はどのチェーンのコンセンサスからではなく、構造的ルールから流れ出ます。
- **退屈なインフラが勝つ。** 世界は別の DeFi プロトコルを必要としていません。それの下にある会計レイヤーを必要としています。他のすべてを信頼できるものにする金融インフラストラクチャです。

***

<a id="architecture"></a>

## アーキテクチャ

Attestia は3つのシステム、1つの真実です。

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

| システム               | 役割                                | 出所                  |
| ------------------ | --------------------------------- | ------------------- |
| **Personal Vault** | マルチチェーン ポートフォリオ観察、エンベロープ予算編成、意図宣言 | NextLedger から進化     |
| **Org Treasury**   | 決定論的給与, DAO 分配、二重ゲート資金調達、複式簿記     | Payroll Engine から進化 |
| **Registrum**      | 構造的レジストラ。11 の不変量、二重証人検証、XRPL 証明   | 変更なし。構憲的レイヤー        |

***

<a id="core-pattern"></a>

## 中核パターン

すべてのやり取りは1つのフローに従います。

```
Intent → Approve → Execute → Verify
```

1. **意図** — ユーザーまたはシステムが目的の結果を宣言する
1. **承認** — Registrum が構造的に検証し、人間が明示的に署名する
1. **実行** — オンチェーンのトランザクションが送信される
1. **検証** — 照合が確認され、XRPL が記録を証明する

ステップは省略できません。ステップは自動化されていません。

***

<a id="principles"></a>

## 原則

| 原則            | 実装                                       |
| ------------- | ---------------------------------------- |
| 追記専用記録        | UPDATE も DELETE もありません。新しいエントリのみです       |
| フェイルクローズド     | 不同意がシステムを停止させ、決して静かに修復されません              |
| 決定論的リプレイ      | 同じイベントは常に同じ状態を生成します                      |
| アドバイザリー AI のみ | AI は分析、警告、提案できます。承認、署名、実行はできません          |
| マルチチェーン観察     | Ethereum、XRPL、Solana、L2s。チェーン非依存読み取りレイヤー |
| 構造的アイデンティティ   | 明示的、不変、一意。生体認証ではなく、構憲的です                 |

***

<a id="status"></a>

## ステータス

14 パッケージ、1,853 テスト、96.80% カバレッジ、すべて成功。パブリックで構築中。

| パッケージ                      | テスト | 目的                                                           |
| -------------------------- | --- | ------------------------------------------------------------ |
| `@attestia/types`          | 62  | 共有ドメインタイプ (依存関係なし)                                           |
| `@attestia/registrum`      | 297 | 構憲的ガバナンス。11 の不変量、二重証人                                        |
| `@attestia/ledger`         | 144 | 追記のみのダブルエントリエンジン                                             |
| `@attestia/chain-observer` | 242 | マルチチェーン読み取り専用観測（EVM + XRPL + Solana + L2s）                   |
| `@attestia/vault`          | 67  | 個人向けボルト — ポートフォリオ、予算、インテント                                   |
| `@attestia/treasury`       | 63  | 組織向けトレジャリー — 給与計算、分配、ファンディングゲート                              |
| `@attestia/reconciler`     | 56  | 3D クロスシステムマッチング + Registrum アテステーション                         |
| `@attestia/witness`        | 245 | XRPL オンチェーンアテステーション、マルチシグガバナンス、リトライ                          |
| `@attestia/verify`         | 200 | リプレイ検証、コンプライアンスエビデンス、SLA 実装                                  |
| `@attestia/event-store`    | 190 | 追記のみのイベント永続化、JSONL、ハッシュチェーン、34 イベント型                         |
| `@attestia/proof`          | 53  | マークルツリー、インクルージョンプルーフ、アテステーションプルーフパッケージング                     |
| `@attestia/sdk`            | 50  | 外部コンシューマー向けの型付き HTTP クライアント SDK                              |
| `@attestia/node`           | 184 | Hono REST API — 30 以上のエンドポイント、認証、マルチテナンシー、パブリック API、コンプライアンス |

<a id="development"></a>

### 開発

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

<a id="xrpl-integration-testing"></a>

### XRPL 統合テスト

スタンドアロンの `rippled` ノードが Docker で実行され、決定的なオンチェーン統合テストを可能にします — テストネット依存性なし、ファウセットなし、1 秒未満のレジャークローズ。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

<a id="documentation"></a>

### ドキュメンテーション

| ドキュメント                                                    | 目的                            |
| --------------------------------------------------------- | ----------------------------- |
| [HANDBOOK.md](HANDBOOK.md)                                | エグゼクティブ概要と完全なパッケージリファレンス      |
| [ROADMAP.md](ROADMAP.md)                                  | フェーズごとのプロジェクトロードマップ           |
| [DESIGN.md](DESIGN.md)                                    | アーキテクチャ決定                     |
| [ARCHITECTURE.md](ARCHITECTURE.md)                        | パッケージグラフ、データフロー、セキュリティモデル     |
| [REFERENCE\_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md)   | 5 層スタック、デプロイメントパターン、信頼境界      |
| [INTEGRATION\_GUIDE.md](INTEGRATION_GUIDE.md)             | curl の例と SDK の使用法を含むAPI 統合    |
| [VERIFICATION\_GUIDE.md](VERIFICATION_GUIDE.md)           | 監査人向けステップバイステップリプレイガイド        |
| [THREAT\_MODEL.md](THREAT_MODEL.md)                       | コンポーネントごとの STRIDE 分析          |
| [CONTROL\_MATRIX.md](CONTROL_MATRIX.md)                   | 脅威 → コントロール → ファイル → テストマッピング |
| [SECURITY.md](SECURITY.md)                                | 責任ある開示ポリシー                    |
| [INSTITUTIONAL\_READINESS.md](INSTITUTIONAL_READINESS.md) | 導入準備チェックリスト                   |
| [PERFORMANCE\_BASELINE.md](PERFORMANCE_BASELINE.md)       | 記録されたベンチマーク                   |

***

<a id="license"></a>

## ライセンス

[MIT](LICENSE)
