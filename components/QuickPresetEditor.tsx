"use client";

// クイック入力プリセットを編集するモーダル。
//
// 操作：
//   ・ 各プリセットの アイコン / 名前 / 金額 / カテゴリ / メモ をインライン編集
//   ・ アイコンは絵文字パレットから選ぶ（行ごとに展開／格納）
//   ・ 行ごとに削除ボタン
//   ・ 「+ プリセットを追加」で新規行追加（緑リング＋自動スクロール＋自動フォーカス）
//   ・ 「リセット」でデフォルトに戻す
//   ・ 「保存して閉じる」で localStorage に反映
//   ・ 背景タップでキャンセル（破棄）

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, type Category, type QuickPreset } from "@/lib/types";
import { DEFAULT_QUICK_PRESETS } from "@/lib/defaultPresets";

// 絵文字パレットの候補（食事・買い物・交通・娯楽・その他 を一通り）
const ICON_OPTIONS = [
  "🍚", "🍜", "🍱", "🍔", "🍕", "🥗", "🍣", "🍰", "☕", "🥛",
  "🍞", "🍳", "🍺", "🍵", "🥤", "🏪", "🛒", "🛍️", "📦", "🎁",
  "🚃", "🚌", "🚗", "⛽", "🎮", "📚", "💊", "👕", "💰", "✨",
];

interface Props {
  presets: QuickPreset[];
  onSave: (presets: QuickPreset[]) => void;
  onClose: () => void;
}

export function QuickPresetEditor({ presets, onSave, onClose }: Props) {
  // モーダル内の作業用コピー（保存するまで親の state には反映しない）
  const [working, setWorking] = useState<QuickPreset[]>(presets);

  // 直近で追加された新規プリセットの ID（ハイライト + 自動スクロール対象）
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // 絵文字ピッカーが開いている行 ID（同時に開けるのは1行のみ）
  const [openIconFor, setOpenIconFor] = useState<string | null>(null);

  // 新規行の名前入力に ref を当てて自動フォーカス
  const newNameRef = useRef<HTMLInputElement | null>(null);

  // 1件分のフィールドを部分更新
  const updatePreset = (id: string, patch: Partial<QuickPreset>) => {
    setWorking((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  // 削除
  const removePreset = (id: string) => {
    setWorking((prev) => prev.filter((p) => p.id !== id));
    if (id === lastAddedId) setLastAddedId(null);
    if (id === openIconFor) setOpenIconFor(null);
  };

  // 新規追加（最後に追加 → lastAddedId にしてハイライト）
  const addPreset = () => {
    const newId = `custom-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
    setWorking((prev) => [
      ...prev,
      {
        id: newId,
        icon: "✨",
        name: "新しいプリセット",
        amount: 500,
        category: "食費",
        memo: "",
      },
    ]);
    setLastAddedId(newId);
    setOpenIconFor(null); // 別の行のピッカーが開いていれば閉じる
  };

  // デフォルトに戻す（確認あり）
  const resetToDefault = () => {
    if (
      window.confirm(
        "プリセットをデフォルトに戻しますか？現在のカスタムは破棄されます。",
      )
    ) {
      setWorking(DEFAULT_QUICK_PRESETS.map((p) => ({ ...p })));
      setLastAddedId(null);
      setOpenIconFor(null);
    }
  };

  // 保存：不正な行（空 name・金額0以下）を自動除外
  const handleSave = () => {
    const valid = working
      .map((p) => ({
        ...p,
        name: p.name.trim(),
        memo: p.memo.trim(),
        // 絵文字が空文字なら ✨ にフォールバック
        icon: p.icon.trim() || "✨",
      }))
      .filter((p) => p.name.length > 0 && p.amount > 0);
    onSave(valid);
  };

  // 新規プリセット追加後の自動スクロール＋フォーカス＋テキスト全選択
  useEffect(() => {
    if (!lastAddedId || !newNameRef.current) return;
    const el = newNameRef.current;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => {
      el.focus();
      el.select(); // "新しいプリセット" を全選択 → 即タイプで上書き可
    }, 300);
    return () => clearTimeout(t);
  }, [lastAddedId]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-4 pb-8 pt-12 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダ */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              ⚡ クイック入力をカスタム
            </h2>
            <p className="mt-0.5 text-[11px] text-gray-500">
              アイコンと名前を自由に編集できます
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* プリセット一覧 */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto py-1">
          {working.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500">
              プリセットがありません。下の追加ボタンから作成してね
            </p>
          ) : (
            working.map((p) => {
              const isNew = p.id === lastAddedId;
              const iconOpen = p.id === openIconFor;
              return (
                <div
                  key={p.id}
                  className={
                    "relative rounded-xl border p-3 transition-colors " +
                    (isNew
                      ? "border-accent bg-green-50 ring-2 ring-accent/40"
                      : "border-gray-200 bg-gray-50")
                  }
                >
                  {/* 「新規追加」バッジ */}
                  {isNew && (
                    <span className="absolute -top-2 right-3 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      ✨ 新規追加
                    </span>
                  )}

                  {/* === アイコン選択トリガ + 名前 === */}
                  <div className="flex gap-2">
                    {/* アイコン選択ボタン（タップで絵文字パレットを開閉） */}
                    <div className="shrink-0">
                      <p className="text-[11px] text-gray-600">アイコン</p>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenIconFor(iconOpen ? null : p.id)
                        }
                        aria-expanded={iconOpen}
                        className={
                          "mt-0.5 flex h-[34px] w-[68px] items-center justify-center gap-1 rounded-lg border bg-white text-lg transition active:scale-[0.97] " +
                          (iconOpen
                            ? "border-accent ring-2 ring-accent/30"
                            : isNew
                              ? "border-accent/60"
                              : "border-gray-200 hover:border-accent")
                        }
                      >
                        <span>{p.icon}</span>
                        <span className="text-[10px] text-gray-400">
                          {iconOpen ? "▴" : "▾"}
                        </span>
                      </button>
                    </div>

                    {/* 名前入力 */}
                    <label className="block flex-1 text-[11px] text-gray-600">
                      名前
                      <input
                        ref={isNew ? newNameRef : null}
                        type="text"
                        value={p.name}
                        onChange={(e) =>
                          updatePreset(p.id, { name: e.target.value })
                        }
                        placeholder="例: 自炊"
                        className={
                          "mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent " +
                          (isNew ? "border-accent/60" : "border-gray-200")
                        }
                      />
                    </label>
                  </div>

                  {/* === 絵文字パレット（展開時のみ表示） === */}
                  {iconOpen && (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-2">
                      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                        {ICON_OPTIONS.map((emoji) => {
                          const selected = p.icon === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                updatePreset(p.id, { icon: emoji });
                                setOpenIconFor(null); // 選んだら閉じる
                              }}
                              className={
                                "flex aspect-square items-center justify-center rounded-lg border text-lg transition active:scale-95 " +
                                (selected
                                  ? "border-accent bg-accent/10 ring-2 ring-accent/40"
                                  : "border-gray-200 bg-white hover:border-accent")
                              }
                              aria-label={`アイコン ${emoji} を選択`}
                              aria-pressed={selected}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-center text-[10px] text-gray-400">
                        絵文字をタップで選択
                      </p>
                    </div>
                  )}

                  {/* === 金額 + カテゴリ === */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block text-[11px] text-gray-600">
                      金額（円）
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={p.amount || ""}
                        onChange={(e) =>
                          updatePreset(p.id, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="500"
                        className={
                          "mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent " +
                          (isNew ? "border-accent/60" : "border-gray-200")
                        }
                      />
                    </label>
                    <label className="block text-[11px] text-gray-600">
                      カテゴリ
                      <select
                        value={p.category}
                        onChange={(e) =>
                          updatePreset(p.id, {
                            category: e.target.value as Category,
                          })
                        }
                        className={
                          "mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent " +
                          (isNew ? "border-accent/60" : "border-gray-200")
                        }
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* === メモ === */}
                  <label className="mt-2 block text-[11px] text-gray-600">
                    メモ（任意）
                    <input
                      type="text"
                      value={p.memo}
                      onChange={(e) =>
                        updatePreset(p.id, { memo: e.target.value })
                      }
                      placeholder="自炊 など"
                      className={
                        "mt-0.5 w-full rounded-lg border bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent " +
                        (isNew ? "border-accent/60" : "border-gray-200")
                      }
                    />
                  </label>

                  {/* === 削除 === */}
                  <button
                    type="button"
                    onClick={() => removePreset(p.id)}
                    className="mt-2 w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 active:scale-[0.97]"
                  >
                    🗑 このプリセットを削除
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* + 追加ボタン */}
        <button
          type="button"
          onClick={addPreset}
          className="mt-3 w-full rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-accent hover:text-accent active:scale-[0.97]"
        >
          + プリセットを追加
        </button>

        {/* フッタ：リセット + 保存 */}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={resetToDefault}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.97]"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.97]"
          >
            保存して閉じる
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-gray-400">
          ※ 名前が空 or 金額0のプリセットは保存時に除外されます
        </p>
      </div>
    </div>
  );
}
