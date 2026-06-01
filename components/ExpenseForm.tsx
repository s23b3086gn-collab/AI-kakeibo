"use client";

// 支出を追加するフォーム
import { useState } from "react";
import { Card } from "./Card";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";
import { toDateInputValue } from "@/lib/date";

// よく使う支出パターンのプリセット。
// ボタン1タップで金額・カテゴリ・メモがフォームにセットされる（即送信ではない）。
// `as const` で各フィールドを literal 型として固定 → category は Category 型と互換になる。
const QUICK_PRESETS = [
  { label: "🍚 自炊", amount: 500,  category: "食費",   memo: "自炊" },
  { label: "🍜 外食", amount: 1000, category: "外食",   memo: "外食" },
  { label: "🏪 コンビニ", amount: 500, category: "コンビニ", memo: "コンビニ" },
  { label: "🚃 交通", amount: 200,  category: "交通",   memo: "" },
  { label: "☕ カフェ", amount: 600, category: "外食",   memo: "カフェ" },
] as const;

interface Props {
  onAdd: (expense: Expense) => void;
}

export function ExpenseForm({ onAdd }: Props) {
  // フォームのローカル状態。送信後にリセットする
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("食費");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState<string>(toDateInputValue(new Date()));
  // 現在ハイライト中のプリセットのインデックス。手入力があれば null に戻す。
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(
    null,
  );

  // プリセットボタンを押したときの処理。
  // 即送信ではなく「フォームに値が入った状態」にして、ユーザーが確認できるようにする。
  const applyPreset = (index: number) => {
    const p = QUICK_PRESETS[index];
    setAmount(String(p.amount));
    setCategory(p.category);
    setMemo(p.memo);
    setSelectedPresetIndex(index);
  };

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
        {/* === クイック入力エリア === */}
        <div>
          <p className="mb-1.5 text-xs text-gray-600">クイック入力</p>
          {/* 横スクロール可能なボタン列。スマホで親指1本でも操作しやすい */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {QUICK_PRESETS.map((p, i) => {
              const isActive = selectedPresetIndex === i;
              return (
                <button
                  key={p.label}
                  type="button" // submit にならないように明示
                  onClick={() => applyPreset(i)}
                  className={
                    "shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition active:scale-[0.97] " +
                    (isActive
                      ? // ハイライト時：accent 色で塗りつぶし
                        "border-accent bg-accent text-white shadow-sm"
                      : // 通常時：白背景＋hover で accent ボーダーに
                        "border-gray-200 bg-white text-gray-700 hover:border-accent hover:text-accent")
                  }
                >
                  {p.label}
                  <span className="ml-1 text-[10px] opacity-80">
                    ¥{p.amount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
              onChange={(e) => {
                setAmount(e.target.value);
                // 手入力で値を変えたらプリセットのハイライトを解除
                setSelectedPresetIndex(null);
              }}
              // マウスホイールで数値が勝手に変わるのを防ぐ
              onWheel={(e) => e.currentTarget.blur()}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
            />
          </label>

          <label className="block text-xs text-gray-600">
            カテゴリ
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as Category);
                // カテゴリ手動変更でもプリセットのハイライトを解除
                setSelectedPresetIndex(null);
              }}
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
            onChange={(e) => {
              setMemo(e.target.value);
              // メモ手動変更でもプリセットのハイライトを解除
              setSelectedPresetIndex(null);
            }}
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
