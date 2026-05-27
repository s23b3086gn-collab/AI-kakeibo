"use client";

// 物価高ニュースを横スクロール可能なカードで一覧表示するコンポーネント
import { Card } from "./Card";
import type { PriceNews } from "@/lib/priceNews";

interface Props {
  news: PriceNews[];
}

// 上昇率に応じて色を切り替える小さなバッジ
function ChangeBadge({ rate }: { rate: number }) {
  // しきい値で色を変える（赤=高騰 / オレンジ=上昇 / グレー=軽微）
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
      {/* スマホで横スクロールできるカード列。x方向 overflow を有効化 */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
        {news.map((n) => (
          <article
            key={n.id}
            className="w-60 shrink-0 snap-start rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{n.category}</span>
              <ChangeBadge rate={n.changeRate} />
            </div>
            <p className="mt-1.5 text-sm font-semibold text-gray-900">
              {n.title}
            </p>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-600">
              {n.description}
            </p>
            <p className="mt-2 text-[10px] text-gray-400">{n.date}</p>
          </article>
        ))}
      </div>
      <p className="mt-2 text-center text-[10px] text-gray-400">
        ← 横にスワイプ →
      </p>
    </Card>
  );
}
