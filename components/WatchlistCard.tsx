"use client";

// ⭐ あなた向けウォッチリスト。ホームの結論カードの直下。
// 記録（カテゴリ＋memo）から「あなた向け」と判定された特売を並べる。
// 各食材をタップすると個別チャート（ボトムシート）を開く。

import { Card } from "./Card";
import type { MatchedChirashiItem } from "@/lib/chirashiMatch";

interface Props {
  items: MatchedChirashiItem[]; // isForYou のもの
  onSelectItem: (itemName: string) => void;
}

export function WatchlistCard({ items, onSelectItem }: Props) {
  return (
    <Card title="⭐ あなた向けウォッチリスト">
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelectItem(item.itemName)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-accent active:scale-[0.98]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-gray-900">
                    {item.itemName}
                  </span>
                  {item.isBuyTime && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      今が買い時
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{item.store}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold text-gray-900">
                  ¥{item.price.toLocaleString("ja-JP")}
                  {item.unit && (
                    <span className="ml-0.5 text-xs font-normal text-gray-500">
                      /{item.unit}
                    </span>
                  )}
                </p>
                {item.discountRate !== null && (
                  <p className="text-xs font-semibold text-red-600">
                    {item.discountRate}%OFF
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center text-[10px] text-gray-400">
        📈 タップで価格推移をチェック
      </p>
    </Card>
  );
}
