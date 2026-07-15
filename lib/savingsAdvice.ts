// 「節約アドバイスAI」のロジック。
// 現在の支出傾向 × 物価予測 を組み合わせて、ルールベースで提案を生成する。
// 将来的に OpenAI API に差し替え可能なよう、純粋関数として実装。

import type { Expense } from "./types";
import type { PricePrediction } from "./pricePrediction";

export type AdviceTone = "good" | "info" | "warn";

export interface SavingsAdvice {
  tone: AdviceTone;
  icon: string;   // 視覚的なアクセント用の絵文字
  title: string;  // 太字の見出し
  message: string;// 1〜2行の本文
}

export function generateSavingsAdvice(
  weeklyExpenses: Expense[],
  predictions: PricePrediction[],
  weeklyBudget: number,
): SavingsAdvice[] {
  const advices: SavingsAdvice[] = [];

  // 今週支出のカテゴリ別集計
  const total = weeklyExpenses.reduce((s, e) => s + e.amount, 0);
  const byCat = sumByCategory(weeklyExpenses);
  const eatingOut = (byCat["外食"] ?? 0) + (byCat["コンビニ"] ?? 0);
  const cooking = byCat["食費"] ?? 0;

  // 高騰アイテムだけ抜き出す
  const surgeItems = predictions.filter((p) => p.level === "surge");
  const warnItems = predictions.filter((p) => p.level === "warn");

  // --- ルール1: 外食/コンビニ比率が高い × 食材価格上昇 → 自炊おすすめ ---
  if (
    total > 0 &&
    eatingOut / total >= 0.3 &&
    surgeItems.some((p) => ["卵", "米"].includes(p.item))
  ) {
    advices.push({
      tone: "warn",
      icon: "🍳",
      title: "自炊中心がおすすめ",
      message:
        "外食・コンビニ比率が高めです。米・卵が高騰中なので、安い食材を活用した自炊で出費を抑えましょう。",
    });
  } else if (total > 0 && eatingOut / total >= 0.4) {
    advices.push({
      tone: "warn",
      icon: "🍱",
      title: "外食が多めです",
      message:
        "今週は外食・コンビニ比率が高めです。自炊を1〜2回増やすと数千円単位で変わります。",
    });
  }

  // --- ルール2: 卵が高騰 → 代替食材を提案 ---
  if (surgeItems.some((p) => p.item === "卵")) {
    advices.push({
      tone: "info",
      icon: "🥚",
      title: "卵価格が上昇傾向",
      message:
        "豆腐・鶏むね肉などタンパク質の代替食材も検討してみると、コストを抑えられます。",
    });
  }

  // --- ルール3: 電気代が上昇傾向 → 節電アドバイス ---
  if (
    [...surgeItems, ...warnItems].some((p) => p.item === "電気代") &&
    !advices.some((a) => a.title.includes("電気"))
  ) {
    advices.push({
      tone: "info",
      icon: "⚡",
      title: "電気代に注意",
      message:
        "夏場のエアコン使用は28℃設定＋扇風機併用が定番。冷蔵庫の詰めすぎも要注意です。",
    });
  }

  // --- ルール4: コンビニ単体で目立つ → まとめ買い提案 ---
  const conv = byCat["コンビニ"] ?? 0;
  if (conv >= 2000 && total > 0 && conv / total >= 0.25) {
    advices.push({
      tone: "warn",
      icon: "🛒",
      title: "まとめ買いがおすすめ",
      message:
        "コンビニ支出が増えています。週1回スーパーでまとめ買いすると、同じ品でも2〜3割節約できます。",
    });
  }

  // --- ルール5: 自炊比率高い + 予算内 → 褒める ---
  if (
    total > 0 &&
    cooking / total >= 0.4 &&
    eatingOut < cooking &&
    weeklyBudget > 0 &&
    total <= weeklyBudget
  ) {
    advices.push({
      tone: "good",
      icon: "🌟",
      title: "やりくり上手！",
      message:
        "自炊比率が高く、予算内に収まっています。物価高でもこのペースなら安心です。",
    });
  }

  // --- 何も該当しないとき：基本のアドバイスを1つだけ表示 ---
  if (advices.length === 0) {
    advices.push({
      tone: "info",
      icon: "/icons/ai-robot.png",
      title: "AIが分析中",
      message:
        "支出を入力するほど、物価情報と組み合わせて具体的な節約アドバイスを提案できます。",
    });
  }

  // 最大3件まで
  return advices.slice(0, 3);
}

function sumByCategory(expenses: Expense[]): Record<string, number> {
  const r: Record<string, number> = {};
  for (const e of expenses) {
    r[e.category] = (r[e.category] ?? 0) + e.amount;
  }
  return r;
}
