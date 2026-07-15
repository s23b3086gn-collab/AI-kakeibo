"use client";

// 月次サマリーカード。
// recharts の円グラフで、直近月のカテゴリ別内訳を表示する。

import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card } from "@/components/Card";
import type { Expense } from "@/lib/types";
import { aggregateByMonth } from "@/lib/monthlyStats";

interface Props {
  expenses: Expense[];
  // 月予算の近似値として weeklyBudget × 4 を使う
  weeklyBudget: number;
}

// カテゴリ別の固定カラーマップ（仕様で指定された色）
const CATEGORY_COLORS: Record<string, string> = {
  食費: "#16a34a",     // 緑
  外食: "#f97316",     // オレンジ
  コンビニ: "#eab308", // 黄
  交通: "#3b82f6",     // 青
  趣味: "#a855f7",     // 紫
  その他: "#6b7280",   // グレー
};

// Tooltip 用の通貨フォーマット
function formatYenFull(v: number): string {
  return `¥${v.toLocaleString("ja-JP")}`;
}

export function MonthlySummaryCard({ expenses, weeklyBudget }: Props) {
  // 集計は expenses が変わらない限り再計算しない
  const monthlyData = useMemo(() => aggregateByMonth(expenses), [expenses]);

  // 月予算の近似値（≒ 4週間ぶん）
  const monthlyBudget = weeklyBudget * 4;

  // ----- データなしのとき -----
  if (monthlyData.length === 0) {
    return (
      <Card title="月次サマリー">
        <p className="py-6 text-center text-sm text-gray-500">
          支出を記録すると月次サマリーが表示されます
        </p>
      </Card>
    );
  }

  // 円グラフ用：直近月のカテゴリ別内訳
  const latest = monthlyData[0];
  const pieData = Object.entries(latest.byCategory)
    .map(([category, value]) => ({ name: category, value }))
    // 大きい順に並べると凡例も見やすい
    .sort((a, b) => b.value - a.value);

  // 直近月の予算消化率（monthlyBudget=0 のときは表示しない）
  const usageRate =
    monthlyBudget > 0 ? Math.round((latest.total / monthlyBudget) * 100) : null;
  const isOver = monthlyBudget > 0 && latest.total > monthlyBudget;

  return (
    <Card title="月次サマリー">
      {/* ---- 直近月のサマリ数値 ---- */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-500">{latest.month}の合計支出</p>
        <p
          className={
            "mt-0.5 text-2xl font-bold " +
            (isOver ? "text-danger" : "text-gray-900")
          }
        >
          {formatYenFull(latest.total)}
        </p>
        {usageRate !== null && (
          <p className="mt-1 text-xs text-gray-600">
            月予算目安 {formatYenFull(monthlyBudget)} に対して{" "}
            <span
              className={
                "font-semibold " + (isOver ? "text-danger" : "text-accent")
              }
            >
              {usageRate}%
            </span>
          </p>
        )}
      </div>

      {/* ---- 最新月のカテゴリ別 ---- */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-700">
          {latest.month}のカテゴリ別内訳
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={70}
              innerRadius={32} // ドーナツ型でモバイルでも見やすく
              paddingAngle={1}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name] ?? "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip
              // recharts v3 では value/name は union 型なので narrow して扱う
              formatter={(v, name) => [
                formatYenFull(typeof v === "number" ? v : 0),
                typeof name === "string" ? name : "",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
