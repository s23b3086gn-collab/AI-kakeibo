# AI家計簿アプリ — 引き継ぎメモ

このドキュメントを新しい Claude Code セッションの最初に貼り付けてください。
そのままフェーズ1の実装から再開できます。

---

## 📍 プロジェクト概要

**アプリ名**: AI家計簿 v6
**目的**: 一人暮らしの大学生向け、AI伴走型・物価高サポート家計簿（PWA）
**プロジェクトパス**: `/Users/akihiro/Desktop/デスクトップのコピー/ポートフォリオ/プロトタイプV1`
**GitHub**: https://github.com/s23b3086gn-collab/AI-kakeibo
**デプロイ**: Vercel（`main` push で自動デプロイ、HTTPS）

---

## 🛠️ 技術スタック

- Next.js 14（App Router、TypeScript strict）
- Tailwind CSS（緑基調、角丸カード、モバイルファースト）
- recharts（棒グラフ・円グラフ・カレンダーヒートマップ）
- Web Speech API（音声入力 / Chrome・Android のみ）
- Notification API + Service Worker（毎日のリマインド）
- **データ保存は localStorage のみ**（DB なし、クラウド同期なし）
- `@anthropic-ai/sdk` は package.json にあるが **runtime では未使用**（モックで動作）
- **API キー未登録**（`ANTHROPIC_API_KEY` は空、全 AI 呼び出しはモック）

---

## ✅ 実装済み機能（v1〜v6）

### タブ構成（ボトムナビ 5タブ）
| タブ | 機能 |
|---|---|
| 🏠 ホーム | Streak / WeeklyBudget（メイン=今週使った金額）/ AIコメント / お買い得予測チップ / クイック入力 / Empty State A/B / 電子マネー取り込みバナー |
| 📝 記録 | ReceiptScanner（モック）/ VoiceInput（Web Speech API）/ カスタム可能クイック入力 / 支出フォーム / 支出一覧 |
| 📊 レポート | CalendarHeatmap（一番上）/ WeeklyReport（モック）/ WeeklyComparison（先週vs今週 棒）/ MonthlySummary（月別棒+円） |
| 📈 物価 | PriceNews（Google News RSS + 理由推定）/ PricePrediction（品目単位）/ SavingsAdvice（ルールベース） |
| 💳 連携 | NotificationSettings（PWA通知リマインド）/ 電子マネー連携（モック：Suica/PayPay/楽天Pay） |

### 別ページ
- `/connect` — 電子マネー連携 + 通知リマインダー設定

### API ルート
| ルート | 実装 |
|---|---|
| `/api/receipt` | **モック**（8パターンからランダム。過去 Claude Vision API 実装あり、git history に残る） |
| `/api/weekly-report` | **モック**（実データに応じたテンプレ文） |
| `/api/price-news` | **実データ**（Google News RSS を fetch + キーワードで理由推定、30分キャッシュ） |

### PWA
- `app/manifest.ts` + `app/icon.svg` + `app/apple-icon.svg` でホーム画面追加対応
- `public/sw.js` で通知タップ時のアプリ起動を実装

---

## 📊 データ構造（重要）

### `Expense`（支出記録）— **金額 + カテゴリ + メモ**方式
```ts
interface Expense {
  id: string;
  amount: number;
  category: "食費" | "外食" | "コンビニ" | "趣味" | "交通" | "その他";
  memo: string;   // 自由テキスト（"自炊", "カフェ" 等）
  date: string;   // YYYY-MM-DD
}
```
**⚠️ 品目単位（キャベツ、鶏むね肉等）の記録はない**。「あなた向け」判定はカテゴリ一致 + memo キーワードで実装する。

### `PricePrediction`（価格予測）— **品目単位**
```ts
interface PricePrediction {
  id: string;
  item: string;   // "卵" "キャベツ" "トマト" 等
  emoji?: string;
  level: "surge" | "warn" | "stable" | "drop";
  note: string;
  confidence: number;  // 0〜1
}
```

### localStorage キー一覧（`lib/storage.ts`）
```
assets, expenses, weeklyBudget, recordDates, lastWeekTotal,
linkedServices, linkageProcessed, quickPresets, reminderSettings
```

---

## 🎨 デザイン規約（新規追加時は必ず踏襲）

- **カード**：`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm`
- **アクセント色**：緑（`bg-accent`、`text-accent`）
- **モバイル最大幅**：`max-w-md`（448px）
- **ボタン押下**：`active:scale-[0.97]` or `[0.98]`
- **ヘッダー**：`border-b border-gray-200`、`text-base font-bold text-gray-900`
- **バッジ**：`rounded-full px-2 py-0.5 text-xs font-semibold`
- **カテゴリ色**：食費=緑 / 外食=オレンジ / コンビニ=黄 / 交通=青 / 趣味=紫 / その他=グレー

---

## 🚧 次にやること：「チラシ特売分析」機能（V7 予定）

### 目的
イオン・ベイシアなど有名スーパーの特売情報を集めて、ユーザーの購買記録と結びつけて「今どの食材が買い時か」を教える機能。**独自価値**は「記録 × 価格予測 × 特売」の3点を接続してユーザー専用の買い時ナビにすること。

### 【最重要】禁止事項
- **トクバイ・シュフー・イオン公式・ベイシア公式のスクレイピングは一切禁止**（利用規約違反）
- **存在しない「チラシAPI」を呼ぶコード禁止**
- **Web検索由来のデータは「要確認」ラベル必須**（AI要約は誤読リスクあり）
- **フェーズ3の「毎日自動お知らせ」は作らない**（別途スケジューラが必要で重い）
- **既存機能は非破壊**（記録・物価予測・レポート・レシート読み取りを壊さない）
- **既存デザイン踏襲**（新規UIは既存のトーンに合わせる）

### フェーズ1：ダミーデータで機能完成（最優先・デモ可能な状態にする）

#### 1-1. 型定義（`lib/chirashiData.ts` 新規）
```ts
type ChirashiItem = {
  id: string;
  store: string;             // "イオン" | "ベイシア" | "業務スーパー" ...
  storeArea?: string;
  itemName: string;          // "キャベツ" "鶏むね肉" 等
  category: string;          // "野菜" | "肉" | "魚" | "調味料" | "惣菜" | "その他"
  price: number;             // 特売価格（税込・円）
  normalPrice?: number;      // 通常価格（割引率計算に使う）
  unit?: string;             // "1玉" "100gあたり" "1パック" 等
  validFrom: string;         // ISO
  validTo: string;           // ISO
  source: "dummy" | "flyer_image" | "web_search";
};
```

#### 1-2. リアルなダミーデータ 30〜40件
- 3店舗（イオン / ベイシア / 業務スーパー）
- 現実的な相場感（キャベツ1玉178円、鶏むね肉100g 58円 等）
- 特売期間は「今週」
- `source` は全部 `"dummy"`

#### 1-3. 新規タブ「🛒 チラシ」
- BottomNav に追加（既存デザイン踏襲）
- 店舗フィルタ（チップ/タブ）：イオン / ベイシア / 業務スーパー / すべて
- カテゴリ絞り込み：野菜 / 肉 / 魚 / 調味料 / 惣菜
- 特売リスト：商品名 / 特売価格 / 割引率 / 店舗 / 期限 → 割引率降順

#### 1-4. 【最重要】購買記録・価格予測との接続 ＝ 独自価値
- **マイ・ウォッチリスト**：
  - Expense は品目単位じゃないので、**カテゴリ一致** + **memo キーワード** で判定
  - よく使う食費カテゴリなら食品系特売を上部に「あなた向け」として優先表示
- **買い時ハイライト**：
  - PricePrediction の item と ChirashiItem の itemName を照合
  - `level: "drop" | "stable"` + 特売中 → 「今が買い時」バッジ
- **ホーム画面**：
  - AIComment 欄に「あなたがよく買う〇〇、今週◯◯（店舗）で特売中。買い時です」を 1 行追加

#### 1-5. AI分析コメント（既存パターン踏襲）
- 特売リスト全体を分析して「今週のおすすめ買い物」を 2〜3 行生成
- **既存のルールベース路線**（`lib/aiComment.ts` や `lib/savingsAdvice.ts` と同様）
- Anthropic API を実装するオプションもあり（現状は全て mock）

### フェーズ2：チラシ画像の AI 解析
- 既存 ReceiptScanner のパターン踏襲（`components/ReceiptScanner.tsx`）
- クライアント：1600px / JPEG 85% 圧縮 → `/api/chirashi-scan` に POST
- サーバー：`app/api/chirashi-scan/route.ts`（新規）
- 現状 receipt はモックなので、chirashi-scan も同様にモック優先で。実装するなら Claude Vision API を使う想定（`claude-sonnet-4-20250514`）
- 抽出フィールド：`itemName, category, price, unit, store`
- `source: "flyer_image"` で ChirashiItem に統合

### フェーズ3：AI Web 検索でチラシを探す
- 検索バー：「キャベツが安いスーパー」等の自然文
- Web 検索対応 AI（Claude API の web search or GPT）で結果取得
- `source: "web_search"` で ChirashiItem に統合
- **「AI検索結果・要確認」ラベル必須**（誤読リスク明示）
- **買い時判定の確実な根拠には使わない**（画像解析を優先）
- 「毎日自動お知らせ」は今回は作らない（ロードマップ項目）

### 進め方
1. **フェーズ1 実装**（ダミーで完成）→ 動作確認 → 一度止まって報告
2. フェーズ2 実装 → 動作確認 → 一度止まって報告
3. フェーズ3 実装 → 動作確認 → 完了

**各フェーズが終わるごとに動作説明して、次に進む前に一度止まって報告する。フェーズ1 だけでもデモ成立を最優先。**

---

## 🔑 認証・キー関連の状況

- **`.env.local`**：存在しない（作成必要になる場合あり）
- **Anthropic API キー**：未取得・未登録
- **OpenAI API キー**：未取得・未登録
- **Vercel 環境変数**：どちらも未設定
- **ユーザーの方針**：**基本モックで進める**、フェーズ2 も画像解析はモック優先の可能性大

---

## 💡 セッション再開時の指示例

新しい Claude Code セッションを開いて、以下のように指示すると即座に文脈を引き継げます：

```
STATUS.md を読んで、内容を把握してください。
その後、チラシ特売機能のフェーズ1 の実装を始めてください。
実装が終わったら動作確認手順を教えてください。
```

または、より具体的に：

```
STATUS.md の内容を確認して、以下の順で進めてください：
1. フェーズ1 のダミーデータ + タブ + 接続ロジックを実装
2. 実装が終わったら型チェック（tsc）を通してから報告
3. push はまだしない
```

---

## 📝 直近の会話の要点

- V1〜V6 まで漸進的に機能追加した経緯あり
- 音声入力は Chrome/Android のみ対応（iOS Safari は断念、Whisper API 案も撤回）
- レシート読み取り・週次レポートはコスト回避のためモック化
- ユーザーはターミナル操作に不慣れ、UI での確認を好む
- git push は `main` ブランチに直接（PR 運用なし）
- ユーザー確認を随時挟みながら進める方針

---

**このメモは V6 リリース後・チラシ機能の事前確認完了時点で作成されました。**
**フェーズ1 未着手の状態からスタートできます。**
