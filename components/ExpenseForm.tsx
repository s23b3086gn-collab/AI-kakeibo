"use client";

// 支出を追加するフォーム。
// クイック入力プリセットは親（app/page.tsx）から props で受け取る方式に変更し、
// localStorage 経由のユーザーカスタムに対応している。

import { useState } from "react";
import { Card } from "./Card";
import { ReceiptScanner } from "./ReceiptScanner";
import {
  CATEGORIES,
  type Category,
  type Expense,
  type QuickPreset,
} from "@/lib/types";
import { toDateInputValue } from "@/lib/date";

interface Props {
  onAdd: (expense: Expense) => void;
  // ユーザーがカスタマイズ可能なクイック入力プリセット
  presets: QuickPreset[];
  // クイック入力エリアの「✏️ 編集」ボタンが押されたとき
  onEditPresets: () => void;
}

export function ExpenseForm({ onAdd, presets, onEditPresets }: Props) {
  // フォームのローカル状態。送信後にリセットする
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<Category>("食費");
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState<string>(toDateInputValue(new Date()));
  // 現在ハイライト中のプリセット ID（手入力や保存リセットで null に戻る）。
  // index ではなく id 管理にしたことで、プリセット並び替え/追加削除後でも
  // ハイライトが破綻しない。
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  // プリセットボタンを押したときの処理。
  // 即送信ではなく「フォームに値が入った状態」にして、ユーザーが確認できるようにする。
  const applyPreset = (p: QuickPreset) => {
    setAmount(String(p.amount));
    setCategory(p.category);
    setMemo(p.memo);
    setSelectedPresetId(p.id);
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

  // レシート読み取り結果をフォームにセットする。
  // 既存の handleSubmit / バリデーション / リセットロジックには触らない。
  const handleReceiptResult = (
    amount: number,
    category: Category,
    memo: string,
  ) => {
    setAmount(String(amount));
    setCategory(category);
    setMemo(memo);
    // 自動入力で値が変わったらプリセットのハイライトも解除しておく
    setSelectedPresetId(null);
  };

  return (
    <Card title="📝 支出を記録">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* === レシート読み取り === */}
        <ReceiptScanner onResult={handleReceiptResult} />

        {/* === クイック入力エリア === */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs text-gray-600">クイック入力</p>
            <button
              type="button"
              onClick={onEditPresets}
              className="text-[11px] font-semibold text-accent hover:underline"
            >
              ✏️ 編集
            </button>
          </div>

          {presets.length === 0 ? (
            // プリセット 0 件のときの案内
            <button
              type="button"
              onClick={onEditPresets}
              className="w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-accent hover:text-accent active:scale-[0.97]"
            >
              + プリセットを追加
            </button>
          ) : (
            // 横スクロール可能なボタン列。スマホで親指1本でも操作しやすい
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {presets.map((p) => {
                const isActive = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button" // submit にならないように明示
                    onClick={() => applyPreset(p)}
                    className={
                      "shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition active:scale-[0.97] " +
                      (isActive
                        ? // ハイライト時：accent 色で塗りつぶし
                          "border-accent bg-accent text-white shadow-sm"
                        : // 通常時：白背景＋hover で accent ボーダーに
                          "border-gray-200 bg-white text-gray-700 hover:border-accent hover:text-accent")
                    }
                  >
                    {p.icon} {p.name}
                    <span className="ml-1 text-[10px] opacity-80">
                      ¥{p.amount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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
              placeholder="例:500"
              onChange={(e) => {
                setAmount(e.target.value);
                // 手入力で値を変えたらプリセットのハイライトを解除
                setSelectedPresetId(null);
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
                setSelectedPresetId(null);
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
              setSelectedPresetId(null);
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
