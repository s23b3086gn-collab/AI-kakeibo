"use client";

// ホーム画面用の「もうすぐお買い得」コンパクトバナー。
// 既存の DUMMY_PRICE_PREDICTIONS から level="drop" のものだけ抽出して、
// チップ形式で横スクロール表示する。「ちらっと」見せる用なので Card は使わず最小限の枠。

import { DUMMY_PRICE_PREDICTIONS } from "@/lib/pricePrediction";

export function CheapForecast() {
  // 値下がり予測だけ抽出
  const drops = DUMMY_PRICE_PREDICTIONS.filter((p) => p.level === "drop");

  // データ無しなら何も出さない（ホームをすっきり保つ）
  if (drops.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-green-200 bg-green-50 p-3"
      aria-label="もうすぐお買い得な品目"
    >
      {/* タイトル行：AI予測であることを小さく明示 */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold text-green-800">
          📉 もうすぐお買い得
        </p>
        <span className="text-[10px] text-green-700">AI分析</span>
      </div>

      {/* 横スクロールのチップ列 */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {drops.map((d) => (
          <div
            key={d.id}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green-200 bg-white px-2.5 py-1"
            // チップに簡易説明をツールチップとして付ける（PC ホバー時）
            title={d.note}
          >
            <span aria-hidden>{d.emoji}</span>
            <span className="text-xs font-medium text-gray-800">{d.item}</span>
            <span className="text-[10px] font-semibold text-green-600">
              ↓{Math.round(d.confidence * 100)}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
