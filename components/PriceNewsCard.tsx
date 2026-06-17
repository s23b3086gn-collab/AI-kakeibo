"use client";

// 物価高ニュースを横スクロール可能なカードで一覧表示。
// 「なぜ高くなるのか」（reason）と「出典」を見せて具体性を出している。

import { Card } from "./Card";
import type { PriceNews } from "@/lib/priceNews";

interface Props {
  news: PriceNews[];
}

// 上昇率に応じて色を変える小バッジ（RSS 由来は数値が無いので非表示）
function ChangeBadge({ rate }: { rate: number }) {
  const style =
    rate >= 10
      ? "bg-red-100 text-red-700"
      : rate >= 5
        ? "bg-amber-100 text-amber-700"
        : "bg-gray-100 text-gray-700";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${style}`}
    >
      +{rate}%
    </span>
  );
}

export function PriceNewsCard({ news }: Props) {
  return (
    <Card title="📰 最近の物価高ニュース">
      {/* スマホで横スクロールできるカード列 */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {news.map((n) => (
          <article
            key={n.id}
            className="w-64 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            {/* 1行目：カテゴリ + 右側に上昇率 or 出典 */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{n.category}</span>
              {n.changeRate !== undefined ? (
                <ChangeBadge rate={n.changeRate} />
              ) : n.source ? (
                <span className="truncate text-[10px] text-gray-400">
                  {n.source}
                </span>
              ) : null}
            </div>

            {/* 2行目：タイトル（リンクがあれば外部リンクとして展開可能） */}
            {n.link ? (
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 line-clamp-3 block text-sm font-semibold text-gray-900 hover:text-accent"
              >
                {n.title}
              </a>
            ) : (
              <p className="mt-1.5 line-clamp-3 text-sm font-semibold text-gray-900">
                {n.title}
              </p>
            )}

            {/* 3行目：背景（reason）。タイトルから推定された「なぜ」 */}
            {n.reason && (
              <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] leading-snug text-amber-900">
                <span className="font-semibold">背景:</span> {n.reason}
              </p>
            )}

            {/* 4行目：日付 + 出典（changeRate がある場合の補助表示） */}
            <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-gray-400">
              <span>{n.date}</span>
              {n.changeRate !== undefined && n.source && (
                <span className="truncate">{n.source}</span>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-400">
        ← 横にスワイプ →
      </p>
    </Card>
  );
}
