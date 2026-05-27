"use client";

// 支出一覧を表示するカード
import { Card } from "./Card";
import type { Expense } from "@/lib/types";
import { formatDateForDisplay } from "@/lib/date";

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

// カテゴリごとに簡単な絵文字をつけて視認性アップ
const CATEGORY_EMOJI: Record<string, string> = {
  食費: "🍳",
  外食: "🍜",
  コンビニ: "🏪",
  趣味: "🎮",
  交通: "🚃",
  その他: "📦",
};

export function ExpenseList({ expenses, onDelete }: Props) {
  // 新しい日付が上に来るようにソート（同日なら追加順）
  const sorted = [...expenses].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );

  // 合計金額（表示用）
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <Card title={`📒 支出一覧（${expenses.length}件 / 合計 ¥${total.toLocaleString("ja-JP")}）`}>
      {sorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          まだ支出が登録されていません
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {sorted.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span>{CATEGORY_EMOJI[e.category] ?? "📦"}</span>
                  <span className="font-medium">{e.category}</span>
                  <span className="text-xs text-gray-500">
                    {formatDateForDisplay(e.date)}
                  </span>
                </div>
                {e.memo && (
                  <p className="mt-0.5 truncate text-xs text-gray-600">
                    {e.memo}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                <p className="text-base font-semibold">
                  ¥{e.amount.toLocaleString("ja-JP")}
                </p>
                <button
                  onClick={() => onDelete(e.id)}
                  className="mt-0.5 text-xs text-gray-500 hover:text-danger"
                  aria-label="削除"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
