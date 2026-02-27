<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

私たちは、お金がどこに存在し、どのように移動しようと、それを生み出したシステムと同じレベルの厳格さを持つべきだと信じています。スマートコントラクトは実行され、ブロックチェーンは記録しますが、誰もがそれを「証明」するわけではありません。

Attestiaは、構造的なガバナンス、決定論的な会計、そして人間の承認による意図を、チェーン、組織、個人を越えて統合する、欠けていた要素です。

私たちは、お客様のお金を移動させるわけではありません。何が起こったのかを証明し、何が起こりうるかを制限し、金融記録を改ざんできないようにします。

### 私たちの信念

- **真実を重視し、スピードを優先しない。** すべての金融取引は、追跡可能で、再現可能で、照合可能です。証明できないものは、存在しません。
- **人間が承認し、機械が検証する。** AIはアドバイスを提供し、スマートコントラクトは実行されますが、明示的な人間の承認なしに何も動きません。常に。
- **構造的なガバナンスを重視し、政治的なガバナンスを避ける。** 私たちは、何が有効かを投票するのではなく、絶対的に守られるべき不変のルールを定義します。アイデンティティは明確であり、系統は途切れておらず、順序は決定論的です。
- **意図は実行ではない。** 望むことを宣言することと、それを実行することは、それぞれ別の行為であり、それぞれ別の段階が必要です。その間のギャップこそが、信頼が存在する場所です。
- **チェーンは証拠であり、権威ではない。** XRPLは証明し、Ethereumは決済します。しかし、権威は構造的なルールから生まれるものであり、特定のチェーンのコンセンサスから生まれるものではありません。
- **堅牢なインフラが勝利をもたらす。** 世界が必要としているのは、別のDeFiプロトコルではありません。必要なのは、基盤となる会計システムです。それは、他のすべてを信頼できるものにするための金融インフラです。

---

## アーキテクチャ

Attestiaは、3つのシステムで構成され、1つの真実を追求します。

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

| システム | 役割 | 起源 |
|--------|------|--------|
| **Personal Vault** | マルチチェーンポートフォリオ監視、予算管理、意図の宣言 | NextLedgerから派生 |
| **Org Treasury** | 決定論的な給与計算、DAOへの分配、二重認証による資金調達、複式簿記 | Payroll Engineから派生 |
| **Registrum** | 構造的な登録システム — 11の不変のルール、二重認証による検証、XRPLによる証明 | 変更なし — 憲法的なレイヤー |

---

## コアパターン

すべてのインタラクションは、以下の流れに従います。

```
Intent → Approve → Execute → Verify
```

1. **意図 (Intent)** — ユーザーまたはシステムが、望ましい結果を宣言します。
2. **承認 (Approve)** — 登録システムが構造的に検証し、人間が明示的に承認します。
3. **実行 (Execute)** — オンチェーンのトランザクションが送信されます。
4. **検証 (Verify)** — 照合によって確認され、XRPLによって記録が証明されます。

どのステップも省略できません。どのステップも自動化されません。

---

## 原則

| 原則 | 実装 |
|-----------|---------------|
| 追跡可能な記録 | UPDATEやDELETEは使用できません。新しいエントリのみが追加されます。 |
| Fail-closed | システムに問題が発生した場合、システムは停止しますが、静かに修復されることはありません。 |
| 決定論的な再現 | 同じイベントが発生すると、常に同じ状態になります。 |
| アドバイザリーAIのみ | AIは分析、警告、提案を行うことができますが、承認、署名、実行はできません。 |
| マルチチェーン監視 | Ethereum、XRPL、Solana、L2 — チェーンに依存しない読み取りレイヤー |
| 構造的なアイデンティティ | 明確で、不変で、一意 — 生体認証ではなく、憲法的なものです。 |

---

## ステータス

14のパッケージ、1,853のテスト、96.80%のテストカバレッジ、すべて正常です。透明性の高い開発を行っています。

| パッケージ | テスト | 目的 |
|---------|-------|---------|
| `@attestia/types` | 62 | 共有ドメインタイプ（依存関係なし） |
| `@attestia/registrum` | 297 | 憲法的なガバナンス — 11の不変のルール、二重認証 |
| `@attestia/ledger` | 144 | 追跡可能な複式簿記エンジン |
| `@attestia/chain-observer` | 242 | マルチチェーン読み取り専用監視（EVM + XRPL + Solana + L2s） |
| `@attestia/vault` | 67 | 個人用ウォレット — ポートフォリオ、予算、意図 |
| `@attestia/treasury` | 63 | 組織の財務 — 給与計算、分配、資金調達の認証 |
| `@attestia/reconciler` | 56 | 3Dクロスシステム照合 + Registrum認証 |
| `@attestia/witness` | 245 | XRPLオンチェーン認証、マルチシグ統治、リトライ機能 |
| `@attestia/verify` | 200 | リプレイ検証、コンプライアンス証明、SLA遵守 |
| `@attestia/event-store` | 190 | 追記専用イベント永続化、JSONL形式、ハッシュチェーン、34種類のイベント |
| `@attestia/proof` | 53 | マークルトライ、包含証明、認証証明パッケージ |
| `@attestia/sdk` | 50 | 外部利用者を対象とした型付きHTTPクライアントSDK |
| `@attestia/node` | 184 | Hono REST API — 30以上のエンドポイント、認証、マルチテナント、パブリックAPI、コンプライアンス |

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

スタンドアロンの`rippled`ノードがDocker上で動作し、決定論的なオンチェーン統合テストを実行します。テストネットへの依存がなく、テスト用の仮想通貨供給機能も不要で、サブ秒レベルのレジャークローズが可能です。

```bash
docker compose up -d              # Start standalone rippled
pnpm --filter @attestia/witness run test:integration  # Run on-chain round-trip tests
docker compose down               # Stop rippled
```

### ドキュメント

| ドキュメント | 目的 |
|----------|---------|
| [HANDBOOK.md](HANDBOOK.md) | 概要と詳細なパッケージ参照 |
| [ROADMAP.md](ROADMAP.md) | 段階ごとのプロジェクトロードマップ |
| [DESIGN.md](DESIGN.md) | アーキテクチャに関する決定事項 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | パッケージグラフ、データフロー、セキュリティモデル |
| [REFERENCE_ARCHITECTURE.md](REFERENCE_ARCHITECTURE.md) | 5層スタック、デプロイメントパターン、信頼境界 |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | curlを使用したAPI連携の例とSDKの使用方法 |
| [VERIFICATION_GUIDE.md](VERIFICATION_GUIDE.md) | 監査担当者向けのリプレイ手順ガイド |
| [THREAT_MODEL.md](THREAT_MODEL.md) | 各コンポーネントごとのSTRIDE分析 |
| [CONTROL_MATRIX.md](CONTROL_MATRIX.md) | 脅威 → 制御 → ファイル → テストのマッピング |
| [SECURITY.md](SECURITY.md) | 情報開示ポリシー |
| [INSTITUTIONAL_READINESS.md](INSTITUTIONAL_READINESS.md) | 導入準備チェックリスト |
| [PERFORMANCE_BASELINE.md](PERFORMANCE_BASELINE.md) | ベンチマーク結果 |

---

## セキュリティとデータ範囲

- **アクセスされるデータ:** 金融トランザクションデータ、認証レコード、暗号化証明書への読み込みと書き込み。ウィットネスモジュールが有効な場合、ブロックチェーンノード（XRPL）に接続します。
- **アクセスされないデータ:** テレメトリーデータは収集しません。ユーザー認証情報は保存しません。サードパーティ製の分析ツールは使用しません。
- **必要な権限:** ローカルデータディレクトリへの読み書き権限。ブロックチェーン認証に必要なネットワークアクセス。詳細なSTRIDE分析については、[THREAT_MODEL.md](THREAT_MODEL.md) を参照してください。

## 評価項目

| ゲート | ステータス |
|------|--------|
| A. セキュリティ基準 | 合格 |
| B. エラー処理 | 合格 |
| C. 運用担当者向けドキュメント | 合格 |
| D. リリース時の品質 | 合格 |
| E. 認証 | 合格 |

## ライセンス

[MIT](LICENSE)

---

<a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a> が作成
