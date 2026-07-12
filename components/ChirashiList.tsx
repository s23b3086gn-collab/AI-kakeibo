"use client";

// チラシ特売リスト。店舗/カテゴリで絞り込み、割引率降順（あなた向けは最優先）で表示する。

import { useMemo, useState } from "react";
import { Card } from "./Card";
import {
  CHIRASHI_CATEGORIES,
  CHIRASHI_STORES,
  type ChirashiCategory,
  type ChirashiStore,
} from "@/lib/chirashiData";
import type { MatchedChirashiItem } from "@/lib/chirashiMatch";

interface Props {
  items: MatchedChirashiItem[];
}

const CATEGORY_EMOJI: Record<ChirashiCategory, string> = {
  野菜: "🥬",
  肉: "🍗",
  魚: "🐟",
  調味料: "🧂",
  惣菜: "🍱",
  その他: "📦",
};

type StoreFilter = ChirashiStore | "すべて";
type CategoryFilter = ChirashiCategory | "すべて";

export function ChirashiList({ items }: Props) {
  const [store, setStore] = useState<StoreFilter>("すべて");
  const [category, setCategory] = useState<CategoryFilter>("すべて");

  const filtered = useMemo(() => {
    return items
      .filter((i) => store === "すべて" || i.store === store)
      .filter((i) => category === "すべて" || i.category === category)
      .sort((a, b) => {
        // あなた向けを最優先し、その中では割引率降順
        if (a.isForYou !== b.isForYou) return a.isForYou ? -1 : 1;
        return (b.discountRate ?? 0) - (a.discountRate ?? 0);
      });
  }, [items, store, category]);

  const storeOptions: StoreFilter[] = ["すべて", ...CHIRASHI_STORES];
  const categoryOptions: CategoryFilter[] = ["すべて", ...CHIRASHI_CATEGORIES];

  return (
    <Card title="🛒 今週のチラシ特売">
      {/* 店舗フィルタ */}
      <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {storeOptions.map((s) => (
          <FilterChip key={s} label={s} active={store === s} onClick={() => setStore(s)} />
        ))}
      </div>

      {/* カテゴリフィルタ */}
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {categoryOptions.map((c) => (
          <FilterChip
            key={c}
            label={c === "すべて" ? c : `${CATEGORY_EMOJI[c]} ${c}`}
            active={category === c}
            onClick={() => setCategory(c)}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          該当する特売情報がありません
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span aria-hidden>{CATEGORY_EMOJI[item.category]}</span>
                    <span className="font-semibold text-gray-900">
                      {item.itemName}
                    </span>
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
                    {item.source === "flyer_image" && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                        📷読取
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.store}
                    {item.storeArea ? `（${item.storeArea}）` : ""}
                    {" ・ "}
                    {formatValidTo(item.validTo)}まで
                  </p>
                  {(item.forYouReason || item.buyTimeReason) && (
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                      {item.forYouReason}
                      {item.forYouReason && item.buyTimeReason ? "／" : ""}
                      {item.buyTimeReason}
                    </p>
                  )}
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition active:scale-[0.97] " +
        (active
          ? "border-accent bg-accent text-white"
          : "border-gray-200 bg-white text-gray-600 hover:border-accent hover:text-accent")
      }
    >
      {label}
    </button>
  );
}

function formatValidTo(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
