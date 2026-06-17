// クイック入力のデフォルトプリセット + 旧形式 → 新形式のマイグレーション。
// 初回ユーザー or「リセット」操作時の起点。

import type { Category, QuickPreset } from "./types";

export const DEFAULT_QUICK_PRESETS: QuickPreset[] = [
  { id: "default-1", icon: "🍚", name: "自炊",     amount: 500,  category: "食費",     memo: "自炊" },
  { id: "default-2", icon: "🍜", name: "外食",     amount: 1000, category: "外食",     memo: "外食" },
  { id: "default-3", icon: "🏪", name: "コンビニ", amount: 500,  category: "コンビニ", memo: "コンビニ" },
  { id: "default-4", icon: "🚃", name: "交通",     amount: 200,  category: "交通",     memo: "" },
  { id: "default-5", icon: "☕", name: "カフェ",   amount: 600,  category: "外食",     memo: "カフェ" },
];

// 既存ユーザーは古い localStorage に `{ label: "🍚 自炊", ... }` 形式のデータを
// 持っている可能性があるため、ロード時に新形式へ変換する。
// 既に新形式（icon, name 持ち）なら何もしない。
export function migrateQuickPresets(raw: unknown): QuickPreset[] {
  if (!Array.isArray(raw)) return DEFAULT_QUICK_PRESETS;
  if (raw.length === 0) return [];
  return raw
    .map((r) => migrateOne(r))
    .filter((p): p is QuickPreset => p !== null);
}

function migrateOne(raw: unknown): QuickPreset | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;

  const baseFields = {
    id:
      typeof r.id === "string"
        ? r.id
        : `migrated-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    amount: typeof r.amount === "number" ? r.amount : 0,
    category: (typeof r.category === "string"
      ? r.category
      : "食費") as Category,
    memo: typeof r.memo === "string" ? r.memo : "",
  };

  // 新形式：そのまま返す
  if (typeof r.icon === "string" && typeof r.name === "string") {
    return { ...baseFields, icon: r.icon, name: r.name };
  }

  // 旧形式：label を最初のスペースで分割して { icon, name } に変換
  if (typeof r.label === "string") {
    const trimmed = r.label.trim();
    const idx = trimmed.indexOf(" ");
    if (idx > 0) {
      return {
        ...baseFields,
        icon: trimmed.slice(0, idx),
        name: trimmed.slice(idx + 1).trim() || "プリセット",
      };
    }
    // スペース無しの場合は全部 name にする
    return { ...baseFields, icon: "✨", name: trimmed || "プリセット" };
  }

  return null;
}
