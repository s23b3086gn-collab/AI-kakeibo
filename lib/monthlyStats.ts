// 月次サマリー用の集計ロジック。
// Expense[] を年月ごとにグループ化し、直近3ヶ月分だけ返す純粋関数。

import type { Expense } from "./types";

export interface MonthlyData {
  month: string; // 表示用文字列。例: "2025年5月"
  total: number; // その月の合計支出
  byCategory: Record<string, number>; // カテゴリ別の合計支出
}

/**
 * 支出データを月ごとに集計する。
 *
 * - 日付（YYYY-MM-DD）の先頭7文字 "YYYY-MM" でグループ化
 * - 新しい月が先頭（降順）
 * - 直近3ヶ月分のみ返す（それ以前は切り捨て）
 * - データ0件の月は含めない（自動的に skip される）
 */
export function aggregateByMonth(expenses: Expense[]): MonthlyData[] {
  // 集計バケット。キーは "YYYY-MM"
  const groups: Record<
    string,
    { total: number; byCategory: Record<string, number> }
  > = {};

  for (const e of expenses) {
    // 想定する形式は YYYY-MM-DD。それ以外は安全に skip
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) continue;
    const key = e.date.slice(0, 7); // "2025-05"

    if (!groups[key]) {
      groups[key] = { total: 0, byCategory: {} };
    }
    groups[key].total += e.amount;
    groups[key].byCategory[e.category] =
      (groups[key].byCategory[e.category] ?? 0) + e.amount;
  }

  // "YYYY-MM" 形式は辞書順 = 時系列順なので、降順ソートはそのまま比較でOK
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a)) // 新しい月が先頭
    .slice(0, 3) // 直近3ヶ月
    .map(([key, data]) => {
      // 表示文字列に変換。先頭ゼロは外す（"05" → 5）
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      return {
        month: `${year}年${month}月`,
        total: data.total,
        byCategory: data.byCategory,
      };
    });
}
