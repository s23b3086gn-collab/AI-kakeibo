"use client";

// 📡 価格レーダー：株価ボード風の価格トレンド表示。
//
// 構成（主要株価指数サイトのイメージを踏襲）：
//   1) 複合チャート … 全品目を「8週前=100」の指数に正規化して1枚に重ねる
//                     （銘柄ごとに色分け・凡例チップでON/OFF・基準ライン100）
//   2) 指数ボード   … 品目ごとの行。スパークライン＋現在値＋前週比バッジ。
//                     行タップでチャートの表示/非表示を切替。チラシ特売と接続。
//
// 価格は「上昇＝赤（家計に痛い）／下落＝緑（お買い得）」で色分け（買い物視点）。
// データはすべてダミー（lib/priceHistory.ts）。実データ差し替えは将来の課題。

import { useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./Card";
import { RobotIcon } from "./RobotIcon";
import {
  PRICE_SERIES,
  computeStats,
  weekLabels,
  type PriceSeries,
} from "@/lib/priceHistory";
import type { PriceLevel } from "@/lib/pricePrediction";
import { DUMMY_CHIRASHI_ITEMS } from "@/lib/chirashiData";

// 複合チャートで銘柄を識別するための固定色（トレンドではなく「銘柄の色」）
const ITEM_COLOR: Record<string, string> = {
  卵: "#ef4444",
  米: "#f59e0b",
  キャベツ: "#84cc16",
  電気代: "#a855f7",
  牛乳: "#64748b",
  トマト: "#ec4899",
  きゅうり: "#06b6d4",
  鶏むね肉: "#3b82f6",
};

// スパークライン／前週比バッジで使うトレンド色（上昇=赤・下落=緑）
const TREND_COLOR: Record<PriceLevel, string> = {
  surge: "#dc2626",
  warn: "#dc2626",
  stable: "#64748b",
  drop: "#16a34a",
};

// 選択品目に対応するチラシ特売の最安値を探す（無ければ null）
function findSalePrice(item: string): { price: number; store: string } | null {
  const matches = DUMMY_CHIRASHI_ITEMS.filter((c) => c.itemName === item);
  if (matches.length === 0) return null;
  const cheapest = matches.reduce((a, b) => (b.price < a.price ? b : a));
  return { price: cheapest.price, store: cheapest.store };
}

function yen(n: number): string {
  return Number.isInteger(n)
    ? `¥${n.toLocaleString("ja-JP")}`
    : `¥${n.toFixed(1)}`;
}

export function PriceRadarCard() {
  // 複合チャートに表示する銘柄（デフォルト全部ON）
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(PRICE_SERIES.map((s) => s.item)),
  );

  const toggle = (item: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  };

  const { labels, composite, rows, summary } = useMemo(() => {
    const labels = weekLabels(PRICE_SERIES[0].prices.length);

    // 各品目を「初週=100」の指数に正規化して1つの配列にまとめる
    const composite = labels.map((label, i) => {
      const row: Record<string, number | string> = { label };
      for (const s of PRICE_SERIES) {
        row[s.item] = Math.round((s.prices[i] / s.prices[0]) * 1000) / 10;
      }
      return row;
    });

    // 指数ボード用に品目ごとの統計・特売・買いシグナルを算出
    const rows = PRICE_SERIES.map((s) => {
      const stats = computeStats(s);
      const sale = findSalePrice(s.item);
      const buySignal = s.level === "drop" && sale !== null;
      return { series: s, stats, sale, buySignal };
    });

    // AIサマリー：上昇・下落の点数と、いちばんの買い時
    const upCount = rows.filter((r) => r.stats.weeklyChange > 0.05).length;
    const downCount = rows.filter((r) => r.stats.weeklyChange < -0.05).length;
    const buy = rows.find((r) => r.buySignal);
    let summary = `直近1週で 値上がり${upCount}品・値下がり${downCount}品。`;
    if (buy) {
      summary += `${buy.series.item}は${buy.sale!.store}の特売¥${buy.sale!.price}が狙い目、いまが買い時です。`;
    } else {
      summary += "特売と重なる買い時食材は現在ありません。";
    }

    return { labels, composite, rows, summary };
  }, []);

  // Y軸の範囲（表示中の銘柄の指数から算出）
  const visibleValues: number[] = [];
  for (const row of composite) {
    for (const s of PRICE_SERIES) {
      if (visible.has(s.item)) visibleValues.push(row[s.item] as number);
    }
  }
  const min = visibleValues.length ? Math.min(...visibleValues) : 90;
  const max = visibleValues.length ? Math.max(...visibleValues) : 110;
  const domain: [number, number] = [
    Math.floor(min - 4),
    Math.ceil(max + 4),
  ];

  return (
    <Card title="価格レーダー（AI分析）">
      <p className="-mt-1 mb-2 text-[11px] text-gray-500">
        主要食材の値動きを「8週前＝100」の指数で比較（自動更新）
      </p>

      {/* ===== 凡例チップ（銘柄ON/OFF） ===== */}
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {PRICE_SERIES.map((s) => {
          const on = visible.has(s.item);
          return (
            <button
              key={s.item}
              type="button"
              onClick={() => toggle(s.item)}
              className={
                "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition active:scale-[0.97] " +
                (on
                  ? "border-gray-300 bg-white text-gray-800"
                  : "border-gray-200 bg-gray-50 text-gray-400")
              }
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: on ? ITEM_COLOR[s.item] : "#d1d5db" }}
              />
              {s.item}
            </button>
          );
        })}
      </div>

      {/* ===== 複合チャート ===== */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart
          data={composite}
          margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            interval={0}
          />
          <YAxis
            domain={domain}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            formatter={(v, name) => [
              `${typeof v === "number" ? v.toFixed(1) : v}`,
              typeof name === "string" ? name : "",
            ]}
            contentStyle={{
              fontSize: 11,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
          {/* 基準ライン（8週前＝100） */}
          <ReferenceLine
            y={100}
            stroke="#9ca3af"
            strokeDasharray="4 3"
            label={{
              value: "基準 100",
              position: "insideLeft",
              fontSize: 9,
              fill: "#9ca3af",
            }}
          />
          {PRICE_SERIES.filter((s) => visible.has(s.item)).map((s) => (
            <Line
              key={s.item}
              type="monotone"
              dataKey={s.item}
              stroke={ITEM_COLOR[s.item]}
              strokeWidth={1.8}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* ===== 指数ボード（銘柄一覧） ===== */}
      <div className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
        {rows.map(({ series, stats, sale, buySignal }) => {
          const on = visible.has(series.item);
          const up = stats.weeklyChange > 0.05;
          const down = stats.weeklyChange < -0.05;
          const arrow = up ? "▲" : down ? "▼" : "―";
          const badge = up
            ? "bg-red-50 text-red-600"
            : down
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-500";
          return (
            <button
              key={series.item}
              type="button"
              onClick={() => toggle(series.item)}
              className={
                "flex w-full items-center gap-2.5 py-2 text-left transition " +
                (on ? "" : "opacity-40")
              }
              aria-pressed={on}
            >
              {/* 銘柄名 */}
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: ITEM_COLOR[series.item] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {series.item}
                </p>
                <p className="truncate text-[10px] text-gray-400">
                  /{series.unit}
                </p>
              </div>

              {/* スパークライン（コンパクトなサムネイル） */}
              <div className="h-8 w-16 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={series.prices.map((p, i) => ({ i, p }))}
                    margin={{ top: 4, right: 2, left: 2, bottom: 4 }}
                  >
                    <Line
                      type="monotone"
                      dataKey="p"
                      stroke={TREND_COLOR[series.level]}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 現在値・前週比 */}
              <div className="w-[76px] shrink-0 text-right">
                <p className="text-sm font-bold text-gray-900">
                  {yen(stats.current)}
                </p>
                <span
                  className={`inline-block rounded px-1 py-0.5 text-[10px] font-bold ${badge}`}
                >
                  {arrow} {Math.abs(stats.weeklyChange).toFixed(1)}%
                </span>
                {buySignal && sale && (
                  <p className="mt-0.5 text-[9px] font-semibold text-green-600">
                    🟢特売¥{sale.price}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ===== AIサマリー ===== */}
      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs leading-relaxed text-gray-700">
          <span className="inline-flex items-center gap-1 font-semibold">
            <RobotIcon /> AI予測：
          </span>
          {summary}
        </p>
      </div>
      <p className="mt-1 text-center text-[10px] text-gray-400">
        ※ 価格推移はデモ用のダミーデータです
      </p>
    </Card>
  );
}
