// 値上がり予測（AI予測風）のダミーデータ。
// level で色分け、confidence で「AI分析感」を演出する。

export type PriceLevel = "stable" | "warn" | "surge" | "drop";
// stable: 安定（グレー）  warn: 注意（黄）  surge: 高騰（赤）  drop: 値下がり（緑）

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
  // --- 値下がり予測（ホームの「お買い得」表示にも使われる） ---
  {
    id: "p6",
    item: "トマト",
    emoji: "🍅",
    level: "drop",
    note: "夏野菜の旬入り。出荷量増加でお買い得に",
    confidence: 0.86,
  },
  {
    id: "p7",
    item: "きゅうり",
    emoji: "🥒",
    level: "drop",
    note: "夏場の供給増で値下がり傾向",
    confidence: 0.83,
  },
  {
    id: "p8",
    item: "鶏むね肉",
    emoji: "🍗",
    level: "drop",
    note: "需給安定。特売頻度の増加が見込まれる",
    confidence: 0.74,
  },
];

// レベル表示用のラベル
export const LEVEL_LABEL: Record<PriceLevel, string> = {
  stable: "安定",
  warn: "注意",
  surge: "高騰",
  drop: "値下がり",
};
