# AI家計簿 v1（プロトタイプ）

一人暮らしで自炊している大学生向け、**AI伴走型 × 物価高サポート**家計簿のプロトタイプです。

「家計簿が続かない」「何にお金を使ってるかわからない」「月末にお金が残らない」
という課題に対し、**「今週あといくら使えるか」** を中心に据え、
**物価高ニュース・値上がり予測・節約アドバイス** までAIっぽい体験で支えるアプリです。

---

## 主な機能

### 既存機能
1. **所持金・収入入力**：通帳 / 現金 / 今月の収入 → 合計所持金を表示
2. **支出記録**：金額・カテゴリ・メモ・日付 を入力 → 一覧表示・削除
3. **今週あといくら使える**：週予算 → 残額を大きく表示（色変化＋プログレスバー）
4. **AIコメント機能**：ルールベースで状況別コメント

### 物価高サポート機能（v1.1で追加）
5. **物価高ニュース**：横スクロールカードで最近の値上がり情報を表示。上昇率バッジ付き
6. **値上がり予測（AI分析風）**：品目ごとに「高騰／注意／安定」を色分け、AI信頼度バーで提示
7. **節約アドバイスAI**：支出傾向 × 物価予測 を組み合わせてルールベースで提案
   - 例：「米・卵が高騰中。自炊中心がおすすめ」「電気代に注意。28℃設定＋扇風機併用が定番」

### アプリ形式（PWA）
- ホーム画面に追加すると **フルスクリーンでアプリのように起動** します
- iPhone のノッチ／ホームバーに合わせた safe-area 対応
- 仕組み：`app/manifest.ts`・`app/icon.svg`・`app/apple-icon.svg` ＋ `appleWebApp` メタ

データは **localStorage** に保存されます（DB不要）。

---

## 技術構成

- Next.js 14（App Router）
- TypeScript
- Tailwind CSS
- React 18

---

## ディレクトリ構成

```
プロトタイプV1/
├── app/
│   ├── layout.tsx         # ルートレイアウト（メタ情報・PWA設定）
│   ├── page.tsx           # メインページ（1ページ構成）
│   ├── globals.css        # Tailwind + 全体スタイル（safe-area対応）
│   ├── manifest.ts        # PWA manifest（ホーム画面追加用）
│   ├── icon.svg           # 汎用アイコン
│   └── apple-icon.svg     # iOS用アイコン
├── components/
│   ├── Card.tsx                  # 共通カード見た目
│   ├── WeeklyBudget.tsx          # 「今週あといくら」（最重要）
│   ├── AICommentCard.tsx         # AIコメント
│   ├── PriceNewsCard.tsx         # 物価高ニュース（新）
│   ├── PricePredictionCard.tsx   # 値上がり予測（新）
│   ├── SavingsAdviceCard.tsx     # AI節約アドバイス（新）
│   ├── AssetsCard.tsx            # 所持金・収入
│   ├── ExpenseForm.tsx           # 支出入力
│   └── ExpenseList.tsx           # 支出一覧
├── lib/
│   ├── types.ts            # 型定義（Expense / Assets / Category）
│   ├── storage.ts          # localStorage の薄いラッパー
│   ├── date.ts             # 日付ユーティリティ
│   ├── aiComment.ts        # AIコメント生成（ルールベース）
│   ├── priceNews.ts        # 物価高ニュースのダミーデータ（新）
│   ├── pricePrediction.ts  # 値上がり予測のダミーデータ（新）
│   └── savingsAdvice.ts    # 節約アドバイスAI（新・ルールベース）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── README.md
```

---

## 実行方法（ローカル）

Node.js 18 以上が必要です。

```bash
# 1. 依存パッケージのインストール
npm install

# 2. 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000

その他：
```bash
npm run build  # 本番ビルド
npm run start  # 本番サーバー起動
npm run lint   # Lint
```

---

## 「アプリ形式」で使う方法（PWAインストール）

### iPhone / iPad（Safari）

1. デプロイ後の URL（または `localhost:3000`）を Safari で開く
2. 共有ボタン（□に↑）をタップ
3. **「ホーム画面に追加」** を選択
4. ホーム画面のアイコンから起動すると、**Safari のアドレスバーが消えてアプリ風に**なります

### Android（Chrome）

1. サイトを Chrome で開く
2. 右上の `⋮` メニュー → **「アプリをインストール」** または「ホーム画面に追加」

### Mac / Windows（Chrome / Edge）

1. アドレスバー右端のインストールアイコン（モニタに↓）をクリック
2. デスクトップアプリとして独立ウィンドウで起動できます

> ※ `localhost` でもインストールは可能ですが、本番運用するなら HTTPS 必須（Vercel なら自動でHTTPSです）。

---

## Vercel へのデプロイ

### A. Web UI から

1. GitHub に push
2. [Vercel](https://vercel.com) → 「Add New… → Project」
3. リポジトリ選択（Framework は Next.js 自動検出）
4. **Deploy** を押すだけ

### B. Vercel CLI から

```bash
npm i -g vercel
vercel        # 初回はウィザード
vercel --prod # 本番デプロイ
```

---

## AIコメント・節約アドバイスのロジック

現在は **すべてルールベース**（if文ベース）。
将来 OpenAI API に差し替える場合は、以下の純粋関数を1つ書き換えるだけで済むよう設計しています：

- `lib/aiComment.ts` → `generateAIComments(weeklyExpenses, weeklyBudget)`
- `lib/savingsAdvice.ts` → `generateSavingsAdvice(weeklyExpenses, predictions, weeklyBudget)`

---

## 今後の拡張ポイント（v2以降）

- 物価ニュースを実APIに置換（Yahoo / NHK / RSS）
- 値上がり予測を実データ × 軽量モデルに置換
- レシートOCR（画像 → 自動入力）
- カテゴリ別グラフ（recharts / chart.js）
- 電子マネー / 銀行連携
- OpenAI API による本格的なAIコメント

---

## 動作確認のおすすめ手順

1. **週予算 `10000`** を入力 → 残額が大きく緑で表示される
2. 支出フォームから **外食 ¥1,500** と **コンビニ ¥800** を追加
3. AIコメント／節約アドバイスが「外食多め」「自炊中心」「米・卵高騰」などに切り替わる
4. 数値入力にカーソルを合わせてマウスホイールしても **値が変わらない**ことを確認
5. ページをリロードしても **データが残っている**（localStorage）ことを確認
6. iPhone Safari で開いて **「ホーム画面に追加」** → アプリのように起動できることを確認
