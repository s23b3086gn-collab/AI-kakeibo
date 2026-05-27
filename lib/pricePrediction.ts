// 値上がり予測（AI予測風）のダミーデータ。
// level で色分け、confidence で「AI分析感」を演出する。

export type PriceLevel = "stable" | "warn" | "surge";
// stable: 安定（緑）  warn: 注意（黄）  surge: 高騰（赤）

export interface PricePrediction {
  id: string;
  item: string;           // 卵 / キャベツ / 電気代 など
  emoji?: string;         // 視覚的アクセント
  level: PriceLevel;
  note: string;           // 「上昇予測」「やや高騰」など短いコメント
  confidence: number;     // 0〜1。AI分析感を出すための「信頼度」
}

export const DUMMY_PRICE_PREDICTIONS: PricePrediction[] = [
  {
    id: "p1",
    item: "卵",
    emoji: "🥚",
    level: "surge",
    note: "鳥インフル影響継続。当面は高騰予測",
    confidence: 0.92,
  },
  {
    id: "p2",
    item: "キャベツ",
    emoji: "🥬",
    level: "warn",
    note: "天候不順でやや高騰の兆し",
    confidence: 0.78,
  },
  {
    id: "p3",
    item: "電気代",
    emoji: "⚡",
    level: "warn",
    note: "夏場にかけて上昇傾向が継続",
    confidence: 0.81,
  },
  {
    id: "p4",
    item: "米",
    emoji: "🌾",
    level: "surge",
    note: "新米まで価格は高止まり予測",
    confidence: 0.88,
  },
  {
    id: "p5",
    item: "牛乳",
    emoji: "🥛",
    level: "stable",
    note: "価格は安定推移の見込み",
    confidence: 0.7,
  },
];

// レベル表示用のラベル
export const LEVEL_LABEL: Record<PriceLevel, string> = {
  stable: "安定",
  warn: "注意",
  surge: "高騰",
};
