// 購買記録・価格予測とチラシ特売情報を接続するロジック。
// 「記録 × 価格予測 × 特売」を繋ぐのがこの機能の独自価値。
//
// Expense は品目単位で記録していない（カテゴリ + memo のみ）ため、
// 「あなた向け」判定はカテゴリ集計 + memo キーワードの部分一致で行う。
// 「買い時」判定は PricePrediction.item と ChirashiItem.itemName の一致で行う。

import type { AIComment } from "./aiComment";
import { discountRate, type ChirashiItem } from "./chirashiData";
import type { PricePrediction } from "./pricePrediction";
import type { Expense } from "./types";

export interface MatchedChirashiItem extends ChirashiItem {
  discountRate: number | null;
  isForYou: boolean;
  forYouReason?: string;
  isBuyTime: boolean;
  buyTimeReason?: string;
}

// 食費カテゴリの記録がこの件数以上あれば「自炊派」とみなし、食品系特売を優先表示する
const COOKING_USER_THRESHOLD = 3;

export function enrichChirashiItems(
  items: ChirashiItem[],
  expenses: Expense[],
  predictions: PricePrediction[],
): MatchedChirashiItem[] {
  const cookingExpenses = expenses.filter((e) => e.category === "食費");
  const isCookingUser = cookingExpenses.length >= COOKING_USER_THRESHOLD;

  // memo に含まれる語（2文字以上）を集めておき、品目名との部分一致に使う
  const memoWords = Array.from(
    new Set(
      cookingExpenses.map((e) => e.memo.trim()).filter((m) => m.length >= 2),
    ),
  );

  const dropOrStableItems = new Set(
    predictions
      .filter((p) => p.level === "drop" || p.level === "stable")
      .map((p) => p.item),
  );
  const predictionByItem = new Map(predictions.map((p) => [p.item, p]));

  return items.map((item) => {
    const matchedMemo = memoWords.find(
      (w) => item.itemName.includes(w) || w.includes(item.itemName),
    );

    let isForYou = false;
    let forYouReason: string | undefined;

    if (matchedMemo) {
      isForYou = true;
      forYouReason = `あなたが「${matchedMemo}」と記録した食品です`;
    } else if (
      isCookingUser &&
      (["野菜", "肉", "魚", "調味料"] as const).includes(
        item.category as "野菜" | "肉" | "魚" | "調味料",
      )
    ) {
      isForYou = true;
      forYouReason = "よく自炊記録があるあなたへのおすすめ食材です";
    }

    const prediction = predictionByItem.get(item.itemName);
    const isBuyTime = dropOrStableItems.has(item.itemName);
    const buyTimeReason =
      isBuyTime && prediction ? `AI価格予測でも「${prediction.note}」` : undefined;

    return {
      ...item,
      discountRate: discountRate(item),
      isForYou,
      forYouReason,
      isBuyTime,
      buyTimeReason,
    };
  });
}

// 「あなた向け」×「買い時」を優先し、無ければ「あなた向け」の中で割引率最大のものを選ぶ
export function pickHomeHighlight(
  items: MatchedChirashiItem[],
): MatchedChirashiItem | null {
  const byDiscountDesc = (a: MatchedChirashiItem, b: MatchedChirashiItem) =>
    (b.discountRate ?? 0) - (a.discountRate ?? 0);

  const buyTimeForYou = items.filter((i) => i.isForYou && i.isBuyTime);
  if (buyTimeForYou.length > 0) {
    return [...buyTimeForYou].sort(byDiscountDesc)[0];
  }

  const forYou = items.filter((i) => i.isForYou);
  if (forYou.length > 0) {
    return [...forYou].sort(byDiscountDesc)[0];
  }

  return null;
}

// ホーム画面 AIコメント欄に足す1行を組み立てる
export function buildHomeHighlightComment(
  item: MatchedChirashiItem,
): AIComment {
  const unitLabel = item.unit ? `/${item.unit}` : "";
  return {
    tone: "good",
    message: `あなたがよく買う${item.itemName}、今週${item.store}で特売中（¥${item.price}${unitLabel}）。買い時です！`,
  };
}
