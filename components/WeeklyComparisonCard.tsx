"use client";

// 先週 vs 今週のカテゴリ別比較カード。
//
// 構成：
//   ・全体トーンコメント（節約できてる/使いすぎ をフランクな口調で）
//   ・先週/今週を並べた棒グラフ + 大学生平均 ¥6,000 の参照ライン
//   ・平均超過カテゴリへの個別アドバイス
//
// データ：
//   ・expenses（localStorage 経由）から先週・今週分を抽出して集計
//   ・先週分が無い場合はダミー値を使う

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/Card";
import type { Expense } from "@/lib/types";
import { endOfThisWeek, startOfThisWeek } from "@/lib/date";

interface Props {
  expenses: Expense[];
}

// 比較対象とするカテゴリ（仕様で指定）
// 既存の Category 型に「カフェ」が無いため、ローカル定義として持つ
const COMPARISON_CATEGORIES = [
  "食費",
  "交通",
  "コンビニ",
  "外食",
  "カフェ",
] as const;
type ComparisonCategory = (typeof COMPARISON_CATEGORIES)[number];

// 大学生の週平均（仕様）：食費の週平均 ¥6,000 を全カテゴリ共通の参照ラインとして使用
const STUDENT_AVERAGE = 6000;

// 先週データが取得できないときのフォールバック（5カテゴリそれぞれの参考値）
const FALLBACK_LAST_WEEK: Record<ComparisonCategory, number> = {
  食費: 3500,
  交通: 1200,
  コンビニ: 1800,
  外食: 2500,
  カフェ: 800,
};

// Expense を5つの比較カテゴリに振り分ける。
// 「カフェ」は category="外食" かつ memo に "カフェ" を含むもの。
// 趣味・その他はチャートに含めない（null）。
function bucketize(e: Expense): ComparisonCategory | null {
  if (e.category === "食費") return "食費";
  if (e.category === "コンビニ") return "コンビニ";
  if (e.category === "交通") return "交通";
  if (e.category === "外食") {
    return e.memo.includes("カフェ") ? "カフェ" : "外食";
  }
  return null;
}

// Expense[] → カテゴリ別合計のマップ
function aggregateByCategory(
  expenses: Expense[],
): Record<ComparisonCategory, number> {
  const result: Record<ComparisonCategory, number> = {
    食費: 0,
    交通: 0,
    コンビニ: 0,
    外食: 0,
    カフェ: 0,
  };
  for (const e of expenses) {
    const cat = bucketize(e);
    if (cat) result[cat] += e.amount;
  }
  return result;
}

// Y軸ラベル短縮（¥10,000 → 1.0万、¥3,500 → 4k）
function formatAxis(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return String(v);
}

// 円フォーマット（Tooltip 用）
function yen(n: number): string {
  return `¥${Math.round(n).toLocaleString("ja-JP")}`;
}

// カテゴリ別の「平均超過」コメント。仕様の例文（外食）に合わせつつ口調をフランクに統一。
function buildOverComment(
  cat: ComparisonCategory,
  over: number,
): string {
  const amount = yen(over);
  switch (cat) {
    case "外食":
      return `外食が平均より多めかも。自炊を増やすと週${amount}節約できそう`;
    case "カフェ":
      return `カフェ多めだね。家ドリップにすると${amount}浮くかも`;
    case "コンビニ":
      return `コンビニが多めだね。スーパーでまとめ買いすると${amount}減らせそう`;
    case "食費":
      return `食費が平均より多め。安いスーパー探すと${amount}抑えられそう`;
    case "交通":
      return `交通費が多め。定期や徒歩で${amount}浮かせられるかも`;
  }
}

export function WeeklyComparisonCard({ expenses }: Props) {
  const view = useMemo(() => {
    const thisStart = startOfThisWeek();
    const thisEnd = endOfThisWeek();
    const lastStart = new Date(thisStart);
    lastStart.setDate(lastStart.getDate() - 7);

    // 今週分・先週分の支出を切り分けて集計
    const thisWeekExp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= thisStart && d < thisEnd;
    });
    const lastWeekExp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= lastStart && d < thisStart;
    });

    const thisWeek = aggregateByCategory(thisWeekExp);
    const lastWeekReal = aggregateByCategory(lastWeekExp);

    // 先週の総額が0ならダミー値を使う（仕様）
    const lastWeekRealTotal = Object.values(lastWeekReal).reduce(
      (s, v) => s + v,
      0,
    );
    const usingFallback = lastWeekRealTotal === 0;
    const lastWeek: Record<ComparisonCategory, number> = usingFallback
      ? FALLBACK_LAST_WEEK
      : lastWeekReal;

    const thisTotal = Object.values(thisWeek).reduce((s, v) => s + v, 0);
    const lastTotal = Object.values(lastWeek).reduce((s, v) => s + v, 0);

    // recharts に渡すデータ形式
    const chartData = COMPARISON_CATEGORIES.map((cat) => ({
      category: cat,
      先週: lastWeek[cat],
      今週: thisWeek[cat],
    }));

    // 平均超過カテゴリのコメント生成
    const overComments: { cat: ComparisonCategory; message: string }[] = [];
    for (const cat of COMPARISON_CATEGORIES) {
      if (thisWeek[cat] > STUDENT_AVERAGE) {
        overComments.push({
          cat,
          message: buildOverComment(cat, thisWeek[cat] - STUDENT_AVERAGE),
        });
      }
    }

    // 全体トーンコメント（仕様：フランクな口調・ですます抜き）
    type Tone = "good" | "warn" | "info";
    let tone: Tone = "info";
    let message = "";
    if (thisTotal === 0) {
      tone = "info";
      message = "今週はまだ支出が入ってないよ。何か記録してみよう";
    } else if (thisTotal < lastTotal) {
      tone = "good";
      message = `今週はえらい！${yen(lastTotal - thisTotal)}節約できてる🎉`;
    } else if (thisTotal > lastTotal) {
      tone = "warn";
      message = "ちょっと使いすぎかも。来週は外食1回減らしてみよう";
    } else {
      tone = "info";
      message = "今週は先週と同じペース。維持できてるね";
    }

    return {
      chartData,
      overComments,
      usingFallback,
      summary: { tone, message },
    };
  }, [expenses]);

  // トーンごとのスタイル
  const toneStyle: Record<"good" | "warn" | "info", string> = {
    good: "border-green-200 bg-green-50 text-green-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-gray-200 bg-gray-50 text-gray-700",
  };

  return (
    <Card title="🆚 先週 vs 今週">
      {/* ===== 全体トーンコメント（フランク） ===== */}
      <div
        className={`mb-3 rounded-xl border p-3 text-sm font-medium ${toneStyle[view.summary.tone]}`}
      >
        {view.summary.message}
      </div>

      {/* ===== 棒グラフ ===== */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={view.chartData}
          margin={{ top: 12, right: 8, left: -8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 11, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={formatAxis}
          />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            // recharts v3 で value/name は union 型になっているため narrow して扱う
            formatter={(v, name) => [
              yen(typeof v === "number" ? v : 0),
              typeof name === "string" ? name : "",
            ]}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
          />
          {/* 大学生平均ライン（仕様：食費の週平均 ¥6,000） */}
          <ReferenceLine
            y={STUDENT_AVERAGE}
            stroke="#dc2626"
            strokeDasharray="4 3"
            label={{
              value: `大学生平均 ${yen(STUDENT_AVERAGE)}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "#dc2626",
            }}
          />
          {/* 先週は薄いグレー、今週は accent 緑で「現在」を際立たせる */}
          <Bar dataKey="先週" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="今週" fill="#16a34a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* フォールバック使用時の注釈 */}
      {view.usingFallback && (
        <p className="mt-1 text-center text-[10px] text-gray-400">
          ※ 先週のデータが無いため参考値（大学生の典型例）を表示中
        </p>
      )}

      {/* ===== 平均超過カテゴリのコメント ===== */}
      {view.overComments.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {view.overComments.map((c) => (
            <div
              key={c.cat}
              className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800"
            >
              💡 {c.message}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
