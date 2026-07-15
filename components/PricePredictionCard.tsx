"use client";

// 値上がり予測（AI分析風）コンポーネント。
// レベルごとに赤/黄/緑で色分けし、信頼度バーで「AIっぽさ」を演出。

import { Card } from "./Card";
import {
  LEVEL_LABEL,
  type PriceLevel,
  type PricePrediction,
} from "@/lib/pricePrediction";

interface Props {
  predictions: PricePrediction[];
}

// レベル → スタイルのマッピング
const LEVEL_STYLE: Record<
  PriceLevel,
  { badge: string; bar: string; text: string }
> = {
  surge:  { badge: "bg-red-100 text-red-700",      bar: "bg-red-500",    text: "text-red-700" },
  warn:   { badge: "bg-amber-100 text-amber-700",  bar: "bg-amber-500",  text: "text-amber-700" },
  // stable は「変動なし」なので中立のグレーに（drop と色がかぶらないように）
  stable: { badge: "bg-gray-100 text-gray-700",    bar: "bg-gray-400",   text: "text-gray-700" },
  // drop は「値下がり = 嬉しいニュース」なので緑
  drop:   { badge: "bg-green-100 text-green-700",  bar: "bg-green-500",  text: "text-green-700" },
};

export function PricePredictionCard({ predictions }: Props) {
  return (
    <Card title="🔮 価格予測（AI分析）">
      <ul className="space-y-2">
        {predictions.map((p) => {
          const s = LEVEL_STYLE[p.level];
          // 信頼度を 0〜100% に
          const conf = Math.round(p.confidence * 100);

          return (
            <li
              key={p.id}
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-semibold text-gray-900">
                    {p.item}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${s.badge}`}
                >
                  {LEVEL_LABEL[p.level]}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-600">{p.note}</p>

              {/* AI信頼度バー */}
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full ${s.bar}`}
                    style={{ width: `${conf}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${s.text}`}>
                  AI信頼度 {conf}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
