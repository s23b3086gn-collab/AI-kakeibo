// 週次ふりかえりレポートAPI（モック版）。
// Claude API を呼ばずに、実データに応じてテンプレ文を組み立てるデモ実装。
//
// 本物の Claude API に戻したい場合は git history から復元できる。

import { NextResponse } from "next/server";
import type { Expense } from "@/lib/types";

interface RequestBody {
  weeklyExpenses: Expense[];
  weeklyBudget: number;
  weeklySpent: number;
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 本物っぽく見せるための擬似ローディング時間（1200ms）
    await sleep(1200);

    const body = (await request.json()) as Partial<RequestBody>;

    if (
      !Array.isArray(body.weeklyExpenses) ||
      typeof body.weeklyBudget !== "number" ||
      typeof body.weeklySpent !== "number"
    ) {
      return NextResponse.json({
        comment: "レポートを生成できませんでした。",
      });
    }

    if (body.weeklyExpenses.length === 0) {
      return NextResponse.json({
        comment: "今週はまだ支出が記録されていません。",
      });
    }

    const comment = buildMockComment(
      body.weeklyExpenses,
      body.weeklyBudget,
      body.weeklySpent,
    );

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("[/api/weekly-report mock] error:", error);
    return NextResponse.json({
      comment: "レポートを生成できませんでした。",
    });
  }
}

// 実データに応じてテンプレ文を組み立てる。
// データを実際に見ているので、本物のAIっぽい応答に見える。
function buildMockComment(
  expenses: Expense[],
  budget: number,
  spent: number,
): string {
  // 最大カテゴリを抽出
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const topEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const topCategory = topEntry?.[0] ?? "食費";

  const eatingOut =
    (byCategory["外食"] ?? 0) + (byCategory["コンビニ"] ?? 0);
  const cooking = byCategory["食費"] ?? 0;
  const eatingOutRatio = spent > 0 ? eatingOut / spent : 0;
  const cookingRatio = spent > 0 ? cooking / spent : 0;

  const usageRate = budget > 0 ? spent / budget : 0;
  const remaining = budget - spent;

  // 予算消化フレーズ
  let budgetPhrase = "";
  if (budget > 0) {
    if (usageRate >= 1) {
      budgetPhrase = `予算を¥${(spent - budget).toLocaleString("ja-JP")}オーバーしてしまいました。`;
    } else if (usageRate >= 0.8) {
      budgetPhrase = `予算の${Math.round(usageRate * 100)}%まで使っています。`;
    } else if (usageRate >= 0.5) {
      budgetPhrase = `予算の半分以上（${Math.round(usageRate * 100)}%）を消化しています。`;
    } else {
      budgetPhrase = `予算内にしっかり収まっています（消化率${Math.round(usageRate * 100)}%）。`;
    }
  }

  // 褒めるポイント
  let praise = "";
  if (cookingRatio >= 0.4 && cookingRatio > eatingOutRatio) {
    praise = "自炊比率が高いのは素晴らしいです。";
  } else if (usageRate < 0.5 && budget > 0) {
    praise = "支出ペースは順調で、計画的に動けています。";
  } else if (expenses.length <= 3) {
    praise = "支出回数が少なく、無駄遣いを抑えられています。";
  } else {
    praise = `${topCategory}を中心にメリハリのある支出ができています。`;
  }

  // 改善ポイント
  let improvement = "";
  if (eatingOutRatio >= 0.4) {
    improvement = "外食・コンビニ比率がやや高めなので、自炊回数を1〜2回増やすと効果的です。";
  } else if (usageRate >= 0.8) {
    improvement = `${topCategory}の支出を少し抑えると、予算内に着地しやすくなります。`;
  } else if (byCategory["コンビニ"] && byCategory["コンビニ"] >= 1500) {
    improvement = "コンビニ利用が多めなので、週1のまとめ買いを検討してみましょう。";
  } else {
    improvement = "このペースを維持しつつ、来週は趣味や交際費の予算枠も意識してみましょう。";
  }

  // 来週へのアドバイス
  let advice = "";
  if (usageRate >= 1) {
    advice = "来週は3日間だけでも自炊チャレンジをすると、すぐに取り戻せます。";
  } else if (remaining > 0 && budget > 0) {
    advice = `残り¥${remaining.toLocaleString("ja-JP")}を意識して、週末まで計画的に過ごしましょう。`;
  } else {
    advice = "来週も今週のペースを意識しつつ、無理のない節約を続けていきましょう。";
  }

  // 200文字以内に収まるよう組み立て
  return `${praise}${budgetPhrase}${improvement}${advice}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
