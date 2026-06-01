"use client";

// 月次サマリーカード。
// 2つの recharts グラフを表示：
//   ①月別合計支出の棒グラフ（直近3ヶ月、予算ライン付き）
//   ②直近月のカテゴリ別円グラフ（凡例付き）

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

// Y軸ラベルを ¥10k / ¥3.5k 形式に短縮
function formatYenAxis(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

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
      <Card title="📅 月次サマリー">
        <p className="py-6 text-center text-sm text-gray-500">
          支出を記録すると月次サマリーが表示されます
        </p>
      </Card>
    );
  }

  // 棒グラフ用：時間が左→右になるよう配列を逆順にする（集計関数は新しい月が先頭）
  const barData = [...monthlyData].reverse().map((m) => ({
    month: m.month,
    total: m.total,
  }));

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
    <Card title="📅 月次サマリー">
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

      {/* ---- グラフ①：月別合計支出 ---- */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-gray-700">
          月別合計支出（直近{monthlyData.length}ヶ月）
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={barData}
            margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6b7280" }}
              axisLine={{ stroke: "#e5e7eb" }}
              tickLine={false}
              tickFormatter={formatYenAxis}
            />
            <Tooltip
              cursor={{ fill: "#f3f4f6" }}
              // recharts v3 では value は ValueType | undefined。narrow して扱う
              formatter={(v) => [
                formatYenFull(typeof v === "number" ? v : 0),
                "支出",
              ]}
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
              }}
            />
            {monthlyBudget > 0 && (
              <ReferenceLine
                y={monthlyBudget}
                stroke="#dc2626"
                strokeDasharray="4 3"
                label={{
                  value: "月予算",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#dc2626",
                }}
              />
            )}
            <Bar dataKey="total" fill="#16a34a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ---- グラフ②：最新月のカテゴリ別 ---- */}
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
