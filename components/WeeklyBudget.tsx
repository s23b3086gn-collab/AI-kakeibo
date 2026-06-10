"use client";

// 「今週つかった金額」をメインに表示するカード（最重要）。
// 情報の階層：
//   大：今週つかった金額（text-4xl・色付き）
//   中：週予算と残り（text-sm 一行）＋ゲージ
//   小：今月トータル（text-xs・gray-400）

import { Card } from "./Card";

interface Props {
  weeklyBudget: number;           // 週予算
  weeklySpent: number;            // 今週使った金額
  monthlyTotal: number;           // 今月の合計支出（補足表示）
  onChangeBudget: (n: number) => void; // 週予算を更新するコールバック
}

export function WeeklyBudget({
  weeklyBudget,
  weeklySpent,
  monthlyTotal,
  onChangeBudget,
}: Props) {
  // 残り金額（オーバー時はマイナス）
  const remaining = weeklyBudget - weeklySpent;
  // 使用率（0〜1+）
  const rate = weeklyBudget > 0 ? weeklySpent / weeklyBudget : 0;

  // 使用率に応じて色を決定（緑 ≤60% → 黄 61〜85% → 赤 86%以上）
  // メイン金額の色とゲージ色の両方に同じ閾値を適用
  let amountColor = "text-gray-900";
  let barColor = "bg-accent";
  if (weeklyBudget <= 0) {
    amountColor = "text-gray-900";
    // 予算未設定時はゲージも目立たないグレー
    barColor = "bg-gray-300";
  } else if (rate > 0.85) {
    amountColor = "text-danger";
    barColor = "bg-danger";
  } else if (rate > 0.6) {
    amountColor = "text-warn";
    barColor = "bg-warn";
  } else {
    amountColor = "text-accent";
    barColor = "bg-accent";
  }

  // 表示用パーセント
  const percent = Math.round(rate * 100);

  return (
    <Card className="text-center">
      {/* ===== 大：今週つかった金額（メイン） ===== */}
      <p className="text-xs text-gray-500">今週つかった金額</p>
      <p
        className={`mt-1 text-4xl font-bold tracking-tight ${amountColor}`}
      >
        {formatYen(weeklySpent)}
      </p>

      {/* ===== 中：週予算と残り（サブ・一行） ===== */}
      {weeklyBudget > 0 ? (
        <p className="mt-1 text-sm text-gray-600">
          週予算 {formatYen(weeklyBudget)}{" "}
          {remaining >= 0 ? (
            <>
              まで残り{" "}
              <span className="font-semibold text-gray-800">
                {formatYen(remaining)}
              </span>
            </>
          ) : (
            <>
              を{" "}
              <span className="font-semibold text-danger">
                {formatYen(Math.abs(remaining))}
              </span>{" "}
              オーバー
            </>
          )}
        </p>
      ) : (
        <p className="mt-1 text-sm text-gray-500">
          週予算を設定すると残額を表示します
        </p>
      )}

      {/* ===== 中：ゲージ（既存をそのまま残す。色閾値は 60/85） ===== */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={"h-full transition-all " + barColor}
          // 100% を上限にして見切れないように
          style={{ width: `${Math.min(rate, 1) * 100}%` }}
        />
      </div>

      {/* ゲージ直後の小さな使用率表示（予算ありのときだけ） */}
      {weeklyBudget > 0 && (
        <p className="mt-2 text-[11px] text-gray-500">{percent}%使用</p>
      )}

      {/* ===== 小：今月トータル（補足・最小・グレー） ===== */}
      <p className="mt-3 text-xs text-gray-400">
        今月トータル {formatYen(monthlyTotal)}
      </p>

      {/* ===== 週予算の入力欄 ===== */}
      <label className="mt-4 block text-left text-xs text-gray-500">
        週予算（円）
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={weeklyBudget || ""}
          placeholder="例:10000"
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
