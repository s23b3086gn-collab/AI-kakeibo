// チラシ特売全体を分析する「AIコメント」。
// 既存の savingsAdvice.ts と同様、ルールベースの純粋関数として実装（将来 API 差し替え可能）。

import type { MatchedChirashiItem } from "./chirashiMatch";

export type ChirashiAdviceTone = "good" | "info" | "warn";

export interface ChirashiAdvice {
  tone: ChirashiAdviceTone;
  icon: string;
  title: string;
  message: string;
}

export function generateChirashiAdvice(
  items: MatchedChirashiItem[],
): ChirashiAdvice[] {
  if (items.length === 0) {
    return [
      {
        tone: "info",
        icon: "/icons/ai-robot.png",
        title: "特売情報がありません",
        message: "今週対象のチラシ特売情報がまだ登録されていません。",
      },
    ];
  }

  const advices: ChirashiAdvice[] = [];
  const sorted = [...items].sort(
    (a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0),
  );

  // 1. 今週いちばんの割引率
  const top = sorted[0];
  if (top.discountRate !== null) {
    advices.push({
      tone: "good",
      icon: "🏆",
      title: "今週イチのお買い得",
      message: `${top.store}の${top.itemName}が${top.discountRate}%オフの¥${top.price}${
        top.unit ? `（${top.unit}）` : ""
      }。今週の最大割引です。`,
    });
  }

  // 2. あなた向け × 買い時があれば強調。無ければ「あなた向け」だけでも紹介
  const forYouBuyTime = sorted.filter((i) => i.isForYou && i.isBuyTime);
  if (forYouBuyTime.length > 0) {
    const f = forYouBuyTime[0];
    advices.push({
      tone: "good",
      icon: "🎯",
      title: "あなた向け・買い時",
      message: `よく買う${f.itemName}が${f.store}で特売中。AI価格予測とも合致しているので今が買い時です。`,
    });
  } else {
    const forYou = sorted.filter((i) => i.isForYou);
    if (forYou.length > 0) {
      const f = forYou[0];
      advices.push({
        tone: "info",
        icon: "🛒",
        title: "あなた向け特売",
        message: `よく買う食材の${f.itemName}が${f.store}で特売中です。まとめ買いの候補にどうぞ。`,
      });
    }
  }

  // 3. 特売点数が最も多い店舗を紹介
  const byStore = new Map<string, number>();
  for (const i of items) byStore.set(i.store, (byStore.get(i.store) ?? 0) + 1);
  const bestStore = [...byStore.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestStore) {
    advices.push({
      tone: "info",
      icon: "🏬",
      title: `${bestStore[0]}が特売豊富`,
      message: `今週は${bestStore[0]}が${bestStore[1]}品目と特売数最多。まとめて見てみましょう。`,
    });
  }

  return advices.slice(0, 3);
}
