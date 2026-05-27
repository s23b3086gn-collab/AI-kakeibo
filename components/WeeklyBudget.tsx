"use client";

// 「今週あといくら使えるか」を大きく表示するカード（最重要）
import { Card } from "./Card";

interface Props {
  weeklyBudget: number;           // 週予算
  weeklySpent: number;            // 今週使った金額
  onChangeBudget: (n: number) => void; // 週予算を更新するコールバック
}

export function WeeklyBudget({ weeklyBudget, weeklySpent, onChangeBudget }: Props) {
  // 残り金額。マイナスになることもある（オーバー時）
  const remaining = weeklyBudget - weeklySpent;
  // 使用率（0〜1+）
  const rate = weeklyBudget > 0 ? weeklySpent / weeklyBudget : 0;

  // 残りに応じて色を変える（緑 → 黄 → 赤）
  let color = "text-accent";
  let label = "今週あと使える金額";
  if (weeklyBudget <= 0) {
    color = "text-gray-500";
    label = "週予算を設定してください";
  } else if (rate >= 1) {
    color = "text-danger";
    label = "今週は予算オーバーです";
  } else if (rate >= 0.8) {
    color = "text-warn";
    label = "予算ペースに注意！";
  }

  return (
    <Card className="text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-5xl font-bold tracking-tight ${color}`}>
        {formatYen(remaining)}
      </p>

      {/* 使用状況のプログレスバー */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={
            "h-full transition-all " +
            (rate >= 1 ? "bg-danger" : rate >= 0.8 ? "bg-warn" : "bg-accent")
          }
          // 100% を上限にする
          style={{ width: `${Math.min(rate, 1) * 100}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>使用 {formatYen(weeklySpent)}</span>
        <span>予算 {formatYen(weeklyBudget)}</span>
      </div>

      {/* 週予算の入力欄 */}
      <label className="mt-4 block text-left text-xs text-gray-500">
        週予算（円）
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={weeklyBudget || ""}
          placeholder="例：10000"
          onChange={(e) => onChangeBudget(Number(e.target.value) || 0)}
          // マウスホイールで数値が勝手に変わるのを防ぐ
          onWheel={(e) => e.currentTarget.blur()}
          className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 outline-none focus:border-accent"
        />
      </label>
    </Card>
  );
}

// 円フォーマット（マイナスも考慮）
function formatYen(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}¥${Math.abs(Math.round(n)).toLocaleString("ja-JP")}`;
}
