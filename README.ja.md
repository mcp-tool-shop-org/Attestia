<p align="center">
  <strong>English</strong> | <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/Attestia/main/assets/logo.png" alt="Attestia" width="400">
</p>

<h1 align="center">Attestia</h1>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/Attestia/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/Attestia"><img src="https://codecov.io/gh/mcp-tool-shop-org/Attestia/graph/badge.svg" alt="codecov"></a>
  <a href="https://mcp-tool-shop-org.github.io/Attestia/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
  <a href="https://opensource.org/license/mit/"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License"></a>
</p>

<p align="center"><strong>分散型世界のための、信頼性の高い金融基盤。</strong></p>

---

## ミッション

私たちは、お金が、それが存在する場所や移動する経路に関わらず、それを生み出したシステムと同等の厳格さを持つべきだと考えています。スマートコントラクトは実行され、ブロックチェーンは記録しますが、しかし、それを「証明する」ものは誰もいません。

Attestiaは、これまで欠けていた要素を補完するものです。それは、構造的な統治、確実な会計処理、そして人間による承認を得た意図を、ブロックチェーン、組織、そして個人レベルで統合することです。

私たちは、お客様のお金を移動させることはありません。私たちがすることは、実際に起こったことを明確にし、起こりうる事態を制限し、金融記録が改ざんされることのないようにすることです。

### 私たちの理念・価値観

- **真実を最優先。** すべての金融取引は、追跡可能で、再現可能、そして照合可能です。証明できないことは、存在しなかったこととします。
- **人間が承認し、機械が検証する。** AIは助言し、スマートコントラクトが実行しますが、いかなる操作も、明示的な人間の承認なしには行われません。常に。
- **構造的なガバナンス、政治的なガバナンスではない。** 何が有効かを投票で決めるのではなく、常に有効であるべきとされる基本的な原則を定義します。身元は明確であり、履歴は途切れておらず、順序は決定論的です。
- **意図と実行は異なる。** 望むことを宣言することと、それを実行することは、それぞれ別のプロセスであり、それぞれ別の承認が必要です。その間のギャップこそが、信頼が存在する場所です。
- **ブロックチェーンは証拠であり、権威ではない。** XRPLは証拠を提供し、Ethereumは決済を行います。しかし、権威はブロックチェーンのコンセンサスからではなく、構造的なルールから生まれます。
- **堅牢な基盤が重要。** 世界は、また別のDeFiプロトコルを必要としていません。必要なのは、その基盤となる会計システムです。それは、他のすべての要素を信頼できるものにするための、金融インフラストラクチャです。

---

## 建築学

Attestiaは、3つのシステムでありながら、一つの真実に基づいています。

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

| システム | Role | 起源 |
|--------|------|--------|
| **Personal Vault** | マルチチェーンポートフォリオの監視、予算管理、意図の明示。 | NextLedgerから派生した技術。 |
| **Org Treasury** | 決定的な給与計算、DAOによる分配、二重ゲート型資金調達、二重記帳法。 | 「給与計算エンジン」から派生した製品。 |
| **Registrum** | 構造レジストラー：11の不変量、デュアルウィットネスによる検証、XRPLによる認証。 | 変更なし - 憲法関連部分。 |

---

## 基本パターン

すべての操作は、以下の手順に従って行われます。

```
Intent → Approve → Execute → Verify
```

1. **意図 (Intent)**：ユーザーまたはシステムが、望ましい結果を宣言します。
2. **承認 (Approve)**：Registrumが構造的な検証を行い、担当者が明示的に承認します。
3. **実行 (Execute)**：ブロックチェーン上のトランザクションが送信されます。
4. **検証 (Verify)**：照合によって確認され、XRPLがその記録を証明します。

どの手順も省略できません。また、どの手順も自動化によって置き換えられることはありません。

---

## 原則

| 原則 | 実装 |
|-----------|---------------|
| 追記のみ可能な記録。 | 更新も削除も行いません。新規登録のみ可能です。 |
| フェイルセーフ。
または、安全側に倒れる。 | 意見の相違はシステムを停止させますが、静かに解決されることはありません。 |
| 決定的なリプレイ機能。 | 同じ出来事は、常に同じ状態をもたらします。 |
| AIによるアドバイスのみ提供。 | AIは分析したり、警告を発したり、提案をしたりすることができますが、決して承認したり、署名したり、実行したりすることはありません。 |
| マルチチェーン監視機能。 | Ethereum、XRPL、Solana、L2ソリューションなど、様々なブロックチェーンに対応したデータ読み取りレイヤー。 |
| 構造的な同一性。 | 明示的で、不変で、唯一無二である。生体認証ではなく、むしろ憲法に基づくものである。 |

---

## 状態

14個のパッケージ、1,853件のテスト、96.80%のテストカバレッジ、すべて問題なし。開発プロセスを公開しています。

| パッケージ | Tests | 目的。 |
|---------|-------|---------|
| `@attestia/types` | 62 | 共有されるドメインタイプ（依存関係なし）。 |
| `@attestia/registrum` | 297 | 憲法に基づく統治：11の原則、二重の証拠。 |
| `@attestia/ledger` | 144 | 追記のみ可能な二重帳簿システム。 |
| `@attestia/chain-observer` | 242 | マルチチェーン対応の読み取り専用監視機能（EVM、XRPL、Solana、およびレイヤー2ソリューションに対応）。 |
| `@attestia/vault` | 67 | 個人用セーフティボックス - ポートフォリオ、予算、目標設定など。 |
| `@attestia/treasury` | 63 | 組織の財務部門：給与、分配、資金調達の審査プロセス。 |
| `@attestia/reconciler` | 56 | 3Dクロスシステム照合機能 + Registrumによる認証。 |
| `@attestia/witness` | 245 | XRPLブロックチェーン上の認証、マルチシグによるガバナンス、リトライ機能。 |
| `@attestia/verify` | 200 | リプレイ検証、コンプライアンス証明、SLA（サービスレベル合意）遵守状況の確認。 |
| `@attestia/event-store` | 190 | 追記のみ可能なイベント永続化、JSONL形式、ハッシュチェーン、34種類のイベントタイプ。 |
| `@attestia/proof` | 53 | マークルトリー、包含証明、証明パッケージング。 |
| `@attestia/sdk` | 50 | 型安全なHTTPクライアントSDK（外部利用者向け）。 |
| `@attestia/node` | 184 | Hono REST API：30種類以上のエンドポイント、認証機能、マルチテナント対応、パブリックAPI、コンプライアンス対応。 |

### 開発

```bash
pnpm install          # Install all dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests (1,853)
pnpm test:coverage    # Run with coverage reporting
pnpm typecheck        # Type-check all packages
pnpm bench            # Run benchmarks
```

### XRPL統合テスト

スタンドアロンの`rippled`ノードは、Docker上で動作し、オンチェーンの統合テストを確実に行うことができます。テストネットへの依存がなく、テスト用の仮想通貨供給サービス（ファセット）も不要で、トランザクションの処理速度は1秒未満です。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### ドキュメント

| 文書。 | 目的。 |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | 概要と詳細仕様書. |
| [ROADMAP.md](ROADMAP.md) | 段階ごとのプロジェクト計画ロードマップ。 |
| [DESIGN.md](DESIGN.md) | システム設計の決定事項。 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | パッケージ構成、データフロー、セキュリティモデル。 |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | 5層構造、デプロイメントパターン、信頼境界。 |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | curlを使ったAPI連携のサンプルと、SDKの利用方法。 |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | 監査機能の操作手順解説ガイド。 |
| [THREAT_MODEL.md](THREAT_MODEL.md) | 各コンポーネントに対するSTRIDE分析。 |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | 脅威 → 制御 → ファイル → マッピングのテスト |
| [SECURITY.md](SECURITY.md) | 責任ある情報開示に関するポリシー。 |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | 里親になるための準備チェックリスト。 |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | 記録されたベンチマーク結果。 |

---

## ライセンス

[MITライセンス](LICENSE)
