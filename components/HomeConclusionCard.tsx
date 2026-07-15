"use client";

// 🛒 今週の買い時（結論カード）。ホーム最上部の主役。
// 「買う前に、それが今高いか安いか」の結論を最初に見せる。
// 買い時の食材チップをタップすると個別チャート（ボトムシート）を開く。

import { Card } from "./Card";
import type { HomeConclusion } from "@/lib/homeConclusion";
import type { MatchedChirashiItem } from "@/lib/chirashiMatch";

interface Props {
  conclusion: HomeConclusion;
  onSelectItem: (itemName: string) => void;
}

export function HomeConclusionCard({ conclusion, onSelectItem }: Props) {
  const { headline, buyItems, cautionItems } = conclusion;

  return (
    <Card
      className="border-l-4 border-l-green-500"
      title="今週の買い時"
    >
      {/* 結論文（1〜2行） */}
      <p className="text-sm font-medium leading-relaxed text-gray-800">
        {headline}
      </p>

      {/* 買い時の食材チップ（タップで価格推移） */}
      {buyItems.length > 0 && (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {buyItems.map((item) => (
              <BuyRow key={item.id} item={item} onSelect={onSelectItem} />
            ))}
          </div>
          <p className="mt-2 text-center text-[10px] text-gray-400">
            📈 タップで価格推移をチェック
          </p>
        </>
      )}

      {/* 高騰中で控えめに */}
      {cautionItems.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <p className="text-[11px] font-semibold text-amber-800">
            ⚠️ 高騰中（控えめに）
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            {cautionItems.map((c) => `${c.emoji ?? ""}${c.item}`).join("・")}
          </p>
        </div>
      )}
    </Card>
  );
}

function BuyRow({
  item,
  onSelect,
}: {
  item: MatchedChirashiItem;
  onSelect: (itemName: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.itemName)}
      className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-accent active:scale-[0.98]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-gray-900">{item.itemName}</span>
          {item.isForYou && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              あなた向け
            </span>
          )}
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
  );
}
