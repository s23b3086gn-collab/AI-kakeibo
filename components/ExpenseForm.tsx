"use client";

// 支出を追加するフォーム
import { useState } from "react";
import { Card } from "./Card";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";
import { toDateInputValue } from "@/lib/date";

interface Props {
  onAdd: (expense: Expense) => void;
}

export function ExpenseForm({ onAdd }: Props) {
  // フォームのローカル状態。送信後にリセットする
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("食費");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState<string>(toDateInputValue(new Date()));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const amt = Number(amount);
    // 0以下や数値以外は登録しない（簡易バリデーション）
    if (!Number.isFinite(amt) || amt <= 0) return;

    onAdd({
      // ランダム ID（簡易。重複可能性は実用上ほぼ無視できる）
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      amount: Math.round(amt),
      category,
      memo: memo.trim(),
      date,
    });

    // 入力欄をリセット（カテゴリと日付は使い回したいので残す）
    setAmount("");
    setMemo("");
  };

  return (
    <Card title="📝 支出を記録">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs text-gray-600">
            金額（円）
            <input
              type="number"
              inputMode="numeric"
              min={1}
              required
              value={amount}
              placeholder="例：500"
              onChange={(e) => setAmount(e.target.value)}
              // マウスホイールで数値が勝手に変わるのを防ぐ
              onWheel={(e) => e.currentTarget.blur()}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
            />
          </label>

          <label className="block text-xs text-gray-600">
            カテゴリ
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-xs text-gray-600">
          日付
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
          />
        </label>

        <label className="block text-xs text-gray-600">
          メモ（任意）
          <input
            type="text"
            value={memo}
            placeholder="例：スーパーで買い物"
            onChange={(e) => setMemo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98]"
        >
          支出を追加
        </button>
      </form>
    </Card>
  );
}
