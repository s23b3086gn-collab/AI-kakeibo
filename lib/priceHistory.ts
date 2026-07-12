// 「価格レーダー」用の価格推移ダミーデータ（品目ごとの週次系列）。
// 株価チャート風に過去8週間の推移を見せ、AI予測とチラシ特売ラインを重ねる。
//
// 実データではないため、値はすべて現実的な相場感で手置きした固定値。
// 週ラベル（日付）は表示時に算出するので、時間が経っても系列は古びない。

import type { PriceLevel } from "./pricePrediction";

export interface PriceSeries {
  item: string;       // "卵" "キャベツ" 等（PricePrediction の item と対応）
  emoji: string;
  unit: string;       // "1パック(10個)" "1玉" 等
  level: PriceLevel;  // surge/warn/stable/drop（トレンド色に使う）
  note: string;       // AI予測の一言
  prices: number[];   // 過去8週の価格（古い→新しい、末尾が「今週」）
}

// prices は 8 点固定（週次）。末尾が最新（今週）。
export const PRICE_SERIES: PriceSeries[] = [
  {
    item: "卵",
    emoji: "🥚",
    unit: "1パック(10個)",
    level: "surge",
    note: "鳥インフル影響継続。当面は高騰予測",
    prices: [220, 235, 240, 248, 250, 255, 258, 265],
  },
  {
    item: "米",
    emoji: "🌾",
    unit: "5kg",
    level: "surge",
    note: "新米まで価格は高止まり予測",
    prices: [2980, 3080, 3180, 3250, 3280, 3300, 3320, 3350],
  },
  {
    item: "キャベツ",
    emoji: "🥬",
    unit: "1玉",
    level: "warn",
    note: "天候不順でやや高騰の兆し",
    prices: [150, 145, 158, 165, 170, 178, 185, 198],
  },
  {
    item: "電気代",
    emoji: "⚡",
    unit: "1kWh",
    level: "warn",
    note: "夏場にかけて上昇傾向が継続",
    prices: [31, 31.5, 32, 32.5, 33, 33.5, 34, 34.5],
  },
  {
    item: "牛乳",
    emoji: "🥛",
    unit: "1L",
    level: "stable",
    note: "価格は安定推移の見込み",
    prices: [228, 230, 228, 232, 230, 231, 230, 230],
  },
  {
    item: "トマト",
    emoji: "🍅",
    unit: "4個",
    level: "drop",
    note: "夏野菜の旬入り。出荷量増加でお買い得に",
    prices: [340, 330, 315, 300, 285, 270, 258, 240],
  },
  {
    item: "きゅうり",
    emoji: "🥒",
    unit: "3本",
    level: "drop",
    note: "夏場の供給増で値下がり傾向",
    prices: [178, 172, 165, 158, 150, 145, 138, 128],
  },
  {
    item: "鶏むね肉",
    emoji: "🍗",
    unit: "100g",
    level: "drop",
    note: "需給安定。特売頻度の増加が見込まれる",
    prices: [88, 85, 82, 78, 72, 68, 62, 58],
  },
];

export interface PriceStats {
  current: number;      // 最新値
  prev: number;         // 1週前
  first: number;        // 期間の最初
  weeklyChange: number; // 直近1週の変化率（%）
  periodChange: number; // 期間全体の変化率（%）
  forecast: number;     // 来週の予測値（直近トレンドの単純外挿）
}

export function computeStats(series: PriceSeries): PriceStats {
  const p = series.prices;
  const current = p[p.length - 1];
  const prev = p[p.length - 2] ?? current;
  const first = p[0];
  const weeklyChange = prev === 0 ? 0 : ((current - prev) / prev) * 100;
  const periodChange = first === 0 ? 0 : ((current - first) / first) * 100;
  // 来週予測：直近2週の変化幅を1/2に減衰させて外挿（過度に振れないように）
  const forecast = Math.round((current + (current - prev) * 0.5) * 10) / 10;
  return { current, prev, first, weeklyChange, periodChange, forecast };
}

// 8点ぶんの週ラベルを作る（末尾＝「今週」、他は M/D）。
// 表示時に今日を基準に算出するため、系列データ自体は日付を持たない。
export function weekLabels(count: number, now: Date = new Date()): string[] {
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    if (i === 0) {
      labels.push("今週");
      continue;
    }
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}
