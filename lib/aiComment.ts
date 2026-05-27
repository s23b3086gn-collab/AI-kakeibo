// ルールベースの「AIコメント」生成ロジック。
// 将来的に OpenAI API などに差し替えやすいように、純粋関数として実装。

import type { Expense } from "./types";

// AIコメントの種類（UI で色を変えるなど使い分けるために用意）
export type CommentTone = "good" | "info" | "warn" | "danger";

export interface AIComment {
  tone: CommentTone;
  message: string;
}

// 今週の支出を引数に取り、最大3件までのコメントを返す
export function generateAIComments(
  weeklyExpenses: Expense[],
  weeklyBudget: number,
): AIComment[] {
  const comments: AIComment[] = [];

  // 今週使った合計金額
  const total = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 予算がまだ未設定（0）のときは最初の案内コメントだけ返す
  if (weeklyBudget <= 0) {
    comments.push({
      tone: "info",
      message: "週予算を設定すると、AIが使いすぎを教えてくれます。",
    });
    return comments;
  }

  // 使用率（%）。1未満でも残額の表現に使う
  const usageRate = total / weeklyBudget;

  // 1. 全体の使用率に基づくコメント
  if (usageRate >= 1) {
    comments.push({
      tone: "danger",
      message: `今週は予算を ${formatYen(total - weeklyBudget)} オーバーしています。来週は控えめにいきましょう。`,
    });
  } else if (usageRate >= 0.8) {
    comments.push({
      tone: "warn",
      message: "このペースだと予算を超えそうです。残り日数に注意！",
    });
  } else if (usageRate >= 0.5) {
    comments.push({
      tone: "info",
      message: "予算の半分を超えました。後半ペースを落としていきましょう。",
    });
  } else if (weeklyExpenses.length === 0) {
    comments.push({
      tone: "good",
      message: "今週はまだ支出ゼロ。素晴らしいスタートです！",
    });
  } else {
    comments.push({
      tone: "good",
      message: "今週は予算内でうまくやりくりできています。",
    });
  }

  // 2. カテゴリ別の傾向コメント
  const totalsByCat = sumByCategory(weeklyExpenses);

  // 外食 + コンビニの合計が全体の40%超なら警告
  const eatingOut = (totalsByCat["外食"] ?? 0) + (totalsByCat["コンビニ"] ?? 0);
  if (total > 0 && eatingOut / total >= 0.4) {
    comments.push({
      tone: "warn",
      message: "今週は外食・コンビニが多めです。自炊を増やすと節約になります。",
    });
  }

  // 食費（自炊）の比率が高い場合は褒める
  const cooking = totalsByCat["食費"] ?? 0;
  if (total > 0 && cooking / total >= 0.4 && eatingOut < cooking) {
    comments.push({
      tone: "good",
      message: "自炊比率が高くて良い感じです。続けましょう！",
    });
  }

  // コンビニ単独でも目立つなら指摘
  const conv = totalsByCat["コンビニ"] ?? 0;
  if (conv >= 2000 && total > 0 && conv / total >= 0.25) {
    comments.push({
      tone: "warn",
      message: "コンビニ支出が増えています。まとめ買いを検討してみては？",
    });
  }

  // 最大3件までに絞って返す
  return comments.slice(0, 3);
}

// カテゴリごとの合計金額を計算するヘルパー
function sumByCategory(expenses: Expense[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const e of expenses) {
    result[e.category] = (result[e.category] ?? 0) + e.amount;
  }
  return result;
}

// 円フォーマット（例: 1234 → "1,234円"）
function formatYen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}
