"use client";

// 月別カレンダー + ヒートマップ表示。
// 各日のセルを「その日の支出合計」で色分けし、
// タップするとその日の支出内訳を下に表示する。
//
// ・月曜始まりのグリッド（6行7列固定ではなく可変）
// ・前月/翌月ナビゲーション
// ・今日は青リング、選択中は緑リング
// ・0円 → グレー / 少額 → 薄緑 / 多額 → 濃緑（GitHub Contribution 風）

import { useMemo, useState } from "react";
import { Card } from "./Card";
import type { Expense } from "@/lib/types";

interface Props {
  expenses: Expense[];
}

// 曜日ラベル（月始まり）
const WEEK_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

// セル表示用に金額を短縮（"1,500円" → "1.5k"）
function formatShort(amount: number): string {
  if (amount >= 10000) return `${Math.round(amount / 1000)}k`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return String(amount);
}

// 金額 → セル背景色（絶対値ベース。GitHub 風の6段階）
function bgForAmount(amount: number): string {
  if (amount === 0) return "bg-gray-100";
  if (amount < 500) return "bg-green-100";
  if (amount < 1500) return "bg-green-200";
  if (amount < 3000) return "bg-green-300";
  if (amount < 5000) return "bg-green-500";
  return "bg-green-700";
}

// 濃い緑では文字を白に、薄いところでは黒に
function textForAmount(amount: number): string {
  return amount >= 3000 ? "text-white" : "text-gray-900";
}

export function CalendarHeatmap({ expenses }: Props) {
  // 表示中の年月（初期は今月）
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // タップされた日付（YYYY-MM-DD）。null なら詳細非表示
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 月グリッド + 日別合計 + 月合計をまとめて計算
  const { cells, dailyTotals, monthTotal } = useMemo(() => {
    const monthPrefix = `${current.year}-${String(current.month).padStart(2, "0")}`;

    // 当月分だけ抽出して集計
    const totals: Record<string, number> = {};
    let mTotal = 0;
    for (const e of expenses) {
      if (e.date.startsWith(monthPrefix)) {
        totals[e.date] = (totals[e.date] ?? 0) + e.amount;
        mTotal += e.amount;
      }
    }

    const firstDay = new Date(current.year, current.month - 1, 1);
    const lastDay = new Date(current.year, current.month, 0);
    const daysInMonth = lastDay.getDate();

    // 月曜始まりに合わせるためのオフセット
    // Date.getDay() は 日=0..土=6 なので、月=0..日=6 に変換
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

    const result: Array<{ date: string; day: number; amount: number } | null> =
      [];
    for (let i = 0; i < firstDayOfWeek; i++) result.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${monthPrefix}-${String(day).padStart(2, "0")}`;
      result.push({ date: dateStr, day, amount: totals[dateStr] ?? 0 });
    }
    // 末尾の空セルで週を埋める
    while (result.length % 7 !== 0) result.push(null);

    return { cells: result, dailyTotals: totals, monthTotal: mTotal };
  }, [current, expenses]);

  // 選択日の支出リスト（金額大きい順）
  const selectedExpenses = useMemo(() => {
    if (!selectedDate) return [];
    return expenses
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, selectedDate]);

  const goPrev = () => {
    setCurrent((c) =>
      c.month === 1
        ? { year: c.year - 1, month: 12 }
        : { year: c.year, month: c.month - 1 },
    );
    setSelectedDate(null);
  };

  const goNext = () => {
    setCurrent((c) =>
      c.month === 12
        ? { year: c.year + 1, month: 1 }
        : { year: c.year, month: c.month + 1 },
    );
    setSelectedDate(null);
  };

  // 今日の日付文字列（YYYY-MM-DD, ローカルタイム）
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  return (
    <Card title="📅 支出カレンダー">
      {/* === 月ナビゲーション === */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.97]"
          aria-label="前月"
        >
          ← 前月
        </button>
        <p className="text-sm font-bold text-gray-900">
          {current.year}年{current.month}月
        </p>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.97]"
          aria-label="翌月"
        >
          翌月 →
        </button>
      </div>

      {/* === 曜日ラベル（土=青 / 日=赤） === */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={
              i === 5
                ? "text-blue-500"
                : i === 6
                  ? "text-red-500"
                  : "text-gray-500"
            }
          >
            {label}
          </div>
        ))}
      </div>

      {/* === 日セルグリッド === */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;
          const bg = bgForAmount(cell.amount);
          const text = textForAmount(cell.amount);

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() =>
                setSelectedDate(isSelected ? null : cell.date)
              }
              className={
                "aspect-square rounded-lg p-1 text-left transition active:scale-90 " +
                bg +
                " " +
                text +
                " " +
                (isSelected
                  ? "ring-2 ring-accent"
                  : isToday
                    ? "ring-2 ring-blue-400"
                    : "hover:ring-1 hover:ring-gray-300")
              }
              aria-label={`${cell.day}日 ${cell.amount > 0 ? `¥${cell.amount.toLocaleString("ja-JP")}` : "支出なし"}`}
            >
              <div className="text-[10px] font-semibold leading-none">
                {cell.day}
              </div>
              {cell.amount > 0 && (
                <div className="mt-0.5 text-[9px] font-semibold leading-tight">
                  {formatShort(cell.amount)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* === カラースケール凡例 === */}
      <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-gray-500">
        <span>少</span>
        <div className="h-3 w-3 rounded-sm bg-gray-100" />
        <div className="h-3 w-3 rounded-sm bg-green-100" />
        <div className="h-3 w-3 rounded-sm bg-green-200" />
        <div className="h-3 w-3 rounded-sm bg-green-300" />
        <div className="h-3 w-3 rounded-sm bg-green-500" />
        <div className="h-3 w-3 rounded-sm bg-green-700" />
        <span>多</span>
      </div>

      {/* === 月合計 === */}
      <p className="mt-3 text-center text-xs text-gray-500">
        {current.month}月の合計：
        <span className="ml-1 font-bold text-gray-900">
          ¥{monthTotal.toLocaleString("ja-JP")}
        </span>
      </p>

      {/* === 選択日の詳細 === */}
      {selectedDate && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-800">
              {selectedDate.replaceAll("-", "/")}
            </p>
            <p className="text-xs text-gray-500">
              合計{" "}
              <span className="font-bold text-gray-900">
                ¥{(dailyTotals[selectedDate] ?? 0).toLocaleString("ja-JP")}
              </span>
            </p>
          </div>
          {selectedExpenses.length === 0 ? (
            <p className="mt-2 py-2 text-center text-xs text-gray-400">
              この日の支出はありません
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {selectedExpenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-700">
                    {e.category}
                    {e.memo && (
                      <span className="ml-1 text-gray-400">
                        （{e.memo}）
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ¥{e.amount.toLocaleString("ja-JP")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
