"use client";

// 🔍 AIチラシ検索：食材名を入れると「AIがチラシ・特売を検索して価格を予測」する。
//
// ⚠️ 結果は Web 検索由来の推定のため、必ず「要確認」ラベルを付ける（STATUS.md 準拠）。
//    現状は lib/chirashiSearch.ts のモック。将来 Claude API の Web 検索に差し替え予定。

import { useEffect, useRef, useState } from "react";
import { Card } from "./Card";
import { RobotIcon } from "./RobotIcon";
import {
  SEARCH_STORES,
  SEARCH_SUGGESTIONS,
  searchChirashiByAI,
  searchChirashiByStore,
  type AISearchResult,
} from "@/lib/chirashiSearch";

// 「検索している感」を出すための段階メッセージ
const LOADING_STEPS: { icon: "🔍" | "🧮" | "robot"; text: string }[] = [
  { icon: "🔍", text: "チラシ・特売情報を検索中…" },
  { icon: "🧮", text: "店舗ごとの価格を比較中…" },
  { icon: "robot", text: "価格を予測中…" },
];

export function ChirashiSearchCard() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<AISearchResult | null>(null);
  const stepTimer = useRef<number | null>(null);

  // ローディング中はメッセージを順に切り替える
  useEffect(() => {
    if (!loading) return;
    setStepIndex(0);
    stepTimer.current = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % LOADING_STEPS.length);
    }, 550);
    return () => {
      if (stepTimer.current !== null) window.clearInterval(stepTimer.current);
    };
  }, [loading]);

  // 共通の検索実行（食材検索 / 店舗検索のどちらも受ける）
  const run = async (
    label: string,
    fn: () => Promise<AISearchResult>,
  ) => {
    if (loading) return;
    setQuery(label);
    setLoading(true);
    setResult(null);
    try {
      setResult(await fn());
    } finally {
      setLoading(false);
    }
  };

  // 食材名で検索
  const runSearch = (q: string) => {
    const text = q.trim();
    if (!text) return;
    run(text, () => searchChirashiByAI(text));
  };

  // お店で検索（AIがその店のチラシを持ってくる）
  const runStoreSearch = (label: string) => {
    run(label, () => searchChirashiByStore(label));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <Card title="🔍 AIチラシ検索">
      <p className="-mt-1 mb-2 text-[11px] text-gray-500">
        食材名やお店を選ぶと、AIがチラシ・特売を探してきます
      </p>

      {/* お店で探す（AIがその店のチラシを持ってくる） */}
      <p className="mb-1 text-[11px] font-semibold text-gray-600">
        🏬 お店で探す
      </p>
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SEARCH_STORES.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => runStoreSearch(s.label)}
            disabled={loading}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm transition hover:border-accent hover:text-accent active:scale-[0.97] disabled:opacity-40"
          >
            🛒 {s.label}
          </button>
        ))}
      </div>

      {/* 食材で探す */}
      <p className="mb-1 text-[11px] font-semibold text-gray-600">
        🥬 食材で探す
      </p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="例：キャベツが安いスーパー"
          className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || query.trim() === ""}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97] disabled:opacity-40"
        >
          検索
        </button>
      </form>

      {/* 検索候補チップ */}
      <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {SEARCH_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => runSearch(s)}
            disabled={loading}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-accent hover:text-accent active:scale-[0.97] disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* ローディング */}
      {loading && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <span className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-accent" />
          <p className="flex items-center gap-1 text-sm text-gray-700">
            {LOADING_STEPS[stepIndex].icon === "robot" ? (
              <RobotIcon />
            ) : (
              <span aria-hidden>{LOADING_STEPS[stepIndex].icon}</span>
            )}
            {LOADING_STEPS[stepIndex].text}
          </p>
        </div>
      )}

      {/* 結果 */}
      {!loading && result && (
        <div className="mt-3 space-y-2">
          {/* 要確認バナー（必須） */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[11px] font-semibold text-amber-800">
              ⚠️ AI検索結果・要確認
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
              {result.disclaimer}
            </p>
          </div>

          {/* AI予測まとめ */}
          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs leading-relaxed text-gray-700">
              <span className="inline-flex items-center gap-1 font-semibold">
                <RobotIcon /> AI予測：
              </span>
              {result.summary}
            </p>
          </div>

          {/* 見つかった特売の一覧 */}
          {result.found && (
            <ul className="space-y-2">
              {result.items.map((item, i) => {
                const conf = Math.round(item.confidence * 100);
                return (
                  <li
                    key={`${item.store}-${i}`}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-gray-900">
                            {item.itemName}
                          </span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            要確認
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.store}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                          {item.note}
                        </p>
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
                        {/* AI信頼度バー */}
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <div className="h-1 w-14 overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${conf}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-gray-500">
                            {conf}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-center text-[10px] text-gray-400">
            ※ 現在はデモ用のAI検索（モック）です。買い時の確実な根拠にはチラシ画像や店頭価格をご確認ください。
          </p>
        </div>
      )}
    </Card>
  );
}
