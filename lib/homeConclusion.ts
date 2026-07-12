// ホーム画面「今週の買い時」結論カードのロジック（フェーズ4）。
// チラシ特売（記録・予測と接続済みの MatchedChirashiItem）と価格予測を統合し、
// 「今週買うべき／待つべき食材」の結論を組み立てる純粋関数。

import type { MatchedChirashiItem } from "./chirashiMatch";
import type { PricePrediction } from "./pricePrediction";

export interface CautionItem {
  item: string;
  emoji?: string;
  note: string;
}

export interface HomeConclusion {
  buyItems: MatchedChirashiItem[]; // タップで個別チャートに遷移（最大3）
  cautionItems: CautionItem[]; // 高騰中で控えめに（最大2）
  headline: string; // 1〜2行の結論文
}

// 買い時スコア：あなた向け×買い時 > 買い時 > あなた向け、同点は割引率で
function buyScore(i: MatchedChirashiItem): number {
  return (
    (i.isForYou && i.isBuyTime ? 4 : 0) +
    (i.isBuyTime ? 2 : 0) +
    (i.isForYou ? 1 : 0)
  );
}

export function buildHomeConclusion(
  items: MatchedChirashiItem[],
  predictions: PricePrediction[],
): HomeConclusion {
  // 買い時候補：スコア降順 → 割引率降順
  const ranked = [...items].sort(
    (a, b) =>
      buyScore(b) - buyScore(a) ||
      (b.discountRate ?? 0) - (a.discountRate ?? 0),
  );
  // 同一品目が重複しないよう先頭から拾う
  const seen = new Set<string>();
  const buyItems: MatchedChirashiItem[] = [];
  for (const i of ranked) {
    if (seen.has(i.itemName)) continue;
    seen.add(i.itemName);
    buyItems.push(i);
    if (buyItems.length >= 3) break;
  }

  // 高騰中（surge）＝控えめに
  const cautionItems: CautionItem[] = predictions
    .filter((p) => p.level === "surge")
    .slice(0, 2)
    .map((p) => ({ item: p.item, emoji: p.emoji, note: p.note }));

  const headline = buildHeadline(buyItems, cautionItems);

  return { buyItems, cautionItems, headline };
}

function buildHeadline(
  buy: MatchedChirashiItem[],
  caution: CautionItem[],
): string {
  if (buy.length === 0 && caution.length === 0) {
    return "今週の特売情報がまだありません。記録を増やすと、あなた向けの買い時が見えてきます。";
  }

  const parts: string[] = [];
  const top = buy[0];
  if (top) {
    const phrase = top.isBuyTime
      ? "が底値"
      : top.discountRate != null
        ? `が${top.discountRate}%オフ`
        : "が特売中";
    parts.push(`${top.store}の${top.itemName}${phrase}。`);
  }

  // 2番手以降で「あなた向け」があれば添える
  const forYouSecond = buy.slice(1).find((i) => i.isForYou);
  if (forYouSecond) {
    parts.push(`あなたがよく買う${forYouSecond.itemName}も安いです。`);
  }

  if (caution[0]) {
    parts.push(`${caution[0].item}は高騰中なので控えめに。`);
  }

  return parts.join("");
}
