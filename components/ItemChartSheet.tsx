"use client";

// 個別食材の価格チャート（ボトムシート・オーバーレイ）。
// 結論カード／ウォッチリストの食材をタップすると開く。
// 「買う前に、それが今高いか安いか」を時系列＋買い時シグナル＋特売ラインで裏付ける。

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  PRICE_SERIES,
  computeStats,
  weekLabels,
} from "@/lib/priceHistory";
import type { PriceLevel } from "@/lib/pricePrediction";
import type { MatchedChirashiItem } from "@/lib/chirashiMatch";
import { RobotIcon } from "./RobotIcon";
import { getRecentlyBoughtItems } from "@/lib/purchaseRecords";

interface Props {
  itemName: string;
  chirashiItems: MatchedChirashiItem[];
  onClose: () => void;
}

const TREND_COLOR: Record<PriceLevel, string> = {
  surge: "#dc2626",
  warn: "#dc2626",
  stable: "#64748b",
  drop: "#16a34a",
};
const TREND_LABEL: Record<PriceLevel, string> = {
  surge: "高騰",
  warn: "上昇",
  stable: "横ばい",
  drop: "値下がり",
};

function yen(n: number): string {
  return Number.isInteger(n)
    ? `¥${n.toLocaleString("ja-JP")}`
    : `¥${n.toFixed(1)}`;
}

export function ItemChartSheet({ itemName, chirashiItems, onClose }: Props) {
  // 下スワイプで閉じる（スクロールが先頭のときだけドラッグ開始 → 内部スクロールと共存）
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const draggingRef = useRef(false);
  const allowDragRef = useRef(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const CLOSE_THRESHOLD = 90;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    allowDragRef.current = (sheetRef.current?.scrollTop ?? 0) <= 0;
    startYRef.current = e.clientY;
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!allowDragRef.current) return;
    const delta = e.clientY - startYRef.current;
    if (!draggingRef.current) {
      if (delta <= 4) return;
      draggingRef.current = true;
      setIsDragging(true);
      sheetRef.current?.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
    setDragY(Math.max(0, delta));
  }

  function endDrag() {
    if (draggingRef.current) {
      setDragY((y) => {
        if (y > CLOSE_THRESHOLD) onClose();
        return y > CLOSE_THRESHOLD ? y : 0;
      });
    }
    draggingRef.current = false;
    allowDragRef.current = false;
    setIsDragging(false);
  }

  // 物価タブで「買った」記録済みなら、チャートにその点を反映する
  const [bought, setBought] = useState(false);
  useEffect(() => {
    setBought(getRecentlyBoughtItems().has(itemName));
  }, [itemName]);

  const series = PRICE_SERIES.find((s) => s.item === itemName) ?? null;

  // この食材のチラシ特売（安い順）
  const sales = useMemo(
    () =>
      chirashiItems
        .filter((c) => c.itemName === itemName)
        .sort((a, b) => a.price - b.price),
    [chirashiItems, itemName],
  );
  const cheapest = sales[0] ?? null;

  const view = useMemo(() => {
    if (!series) return null;
    const labels = weekLabels(series.prices.length);
    const stats = computeStats(series);
    const data: {
      label: string;
      price: number | null;
      forecast: number | null;
    }[] = series.prices.map((p, i) => ({
      label: labels[i],
      price: p,
      forecast: i === series.prices.length - 1 ? p : null,
    }));
    data.push({ label: "来週", price: null, forecast: stats.forecast });
    return { data, stats };
  }, [series]);

  const color = series ? TREND_COLOR[series.level] : "#64748b";
  const emoji = series?.emoji ?? "🛒";

  // Y軸ドメイン（特売ライン・予測点も収まるよう調整）
  const domain: [number, number] | undefined = useMemo(() => {
    if (!series || !view) return undefined;
    const values = [
      ...series.prices,
      view.stats.forecast,
      ...(cheapest ? [cheapest.price] : []),
    ];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.15 || max * 0.1;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [series, view, cheapest]);

  const up = (view?.stats.weeklyChange ?? 0) > 0.05;
  const down = (view?.stats.weeklyChange ?? 0) < -0.05;
  const arrow = up ? "▲" : down ? "▼" : "―";
  const changeColor = up
    ? "text-red-600"
    : down
      ? "text-green-600"
      : "text-gray-500";
  const buySignal = series?.level === "drop" && cheapest !== null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0, 0.4 - dragY / 500)})`,
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={sheetRef}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl bg-white p-4 pb-8"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? "none" : "transform 220ms cubic-bezier(0.32,0.72,0,1)",
          touchAction: "pan-y",
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* ドラッグハンドル風 + 閉じる */}
        <div className="mb-3 flex items-center justify-between">
          <span className="mx-auto h-1 w-10 rounded-full bg-gray-300" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 text-sm font-semibold text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            閉じる
          </button>
        </div>

        {/* ヘッダー：現在値・前週比 */}
        <div className="mb-2 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl" aria-hidden>
              {emoji}
            </span>
            <div>
              <p className="text-lg font-bold text-gray-900">{itemName}</p>
              {series && (
                <p className="text-[11px] text-gray-500">/{series.unit}</p>
              )}
            </div>
          </div>
          {view && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {yen(view.stats.current)}
              </p>
              <p className={`text-xs font-semibold ${changeColor}`}>
                {arrow} {Math.abs(view.stats.weeklyChange).toFixed(1)}%
                <span className="ml-1 font-normal text-gray-400">前週比</span>
              </p>
            </div>
          )}
        </div>

        {/* トレンド・買いシグナル */}
        {series && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              {TREND_LABEL[series.level]}トレンド
            </span>
            {view && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                8週で{view.stats.periodChange >= 0 ? "+" : ""}
                {view.stats.periodChange.toFixed(0)}%
              </span>
            )}
            {buySignal && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                🟢 買いシグナル
              </span>
            )}
            {bought && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                ✓ 今週買った記録あり
              </span>
            )}
          </div>
        )}

        {/* チャート（時系列＋来週予測＋特売ライン） */}
        {view && domain ? (
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart
              data={view.data}
              margin={{ top: 8, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="sheetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
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
                width={44}
                tickFormatter={(v) => yen(v)}
              />
              <Tooltip
                formatter={(v) => [yen(typeof v === "number" ? v : 0), ""]}
                labelFormatter={(l) => (l === "来週" ? "来週（AI予測）" : l)}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                }}
              />
              {cheapest && (
                <ReferenceLine
                  y={cheapest.price}
                  stroke="#16a34a"
                  strokeDasharray="4 3"
                  label={{
                    value: `特売 ${yen(cheapest.price)}（${cheapest.store}）`,
                    position: "insideBottomRight",
                    fontSize: 9,
                    fill: "#16a34a",
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill="url(#sheetGrad)"
                dot={(dotProps: {
                  cx?: number;
                  cy?: number;
                  index?: number;
                  payload?: { label?: string; price?: number | null };
                }) => {
                  const { cx, cy, index, payload } = dotProps;
                  if (payload?.price == null) return <g key={`empty-${index}`} />;
                  if (bought && payload.label === "今週") {
                    return (
                      <circle
                        key={`bought-${index}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill={color}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    );
                  }
                  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={2} fill={color} />;
                }}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={{ r: 3, fill: "#fff", stroke: color, strokeWidth: 2 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-600">
              この食材の価格推移データはまだありません。
            </p>
            <p className="mt-1 text-xs text-gray-500">
              下の特売情報とチラシ読み取りで買い時を確認できます。
            </p>
          </div>
        )}

        {/* AI予測コメント */}
        {series && view && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs leading-relaxed text-gray-700">
              <span className="inline-flex items-center gap-1 font-semibold">
                <RobotIcon /> AI予測：
              </span>
              {series.note}。来週は{yen(view.stats.forecast)}前後の見込み。
              {buySignal &&
                cheapest &&
                `いまなら${cheapest.store}の特売¥${cheapest.price}が狙い目です。`}
            </p>
          </div>
        )}

        {/* この食材の特売情報 */}
        {sales.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-gray-600">
              🛒 今週の特売（{sales.length}件）
            </p>
            <ul className="space-y-1.5">
              {sales.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {s.store}
                    </p>
                    {s.source === "flyer_image" && (
                      <span className="text-[10px] font-semibold text-blue-600">
                        📷 チラシ読取
                      </span>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-bold text-gray-900">
                    ¥{s.price.toLocaleString("ja-JP")}
                    {s.unit && (
                      <span className="ml-0.5 text-xs font-normal text-gray-500">
                        /{s.unit}
                      </span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-3 text-center text-[10px] text-gray-400">
          ※ 価格推移はデモ用のダミーデータです
        </p>
      </div>
    </div>
  );
}
