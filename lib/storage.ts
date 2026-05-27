// localStorage を型安全に扱うための小さなヘルパー。
// SSR（サーバー側）では window が無いので、必ず typeof window で守る。

// 保存に使うキーをまとめておく
export const STORAGE_KEYS = {
  assets: "ai-kakeibo:assets",
  expenses: "ai-kakeibo:expenses",
  weeklyBudget: "ai-kakeibo:weeklyBudget",
} as const;

// 値を読み出す。失敗時は fallback を返す
export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// 値を書き込む。失敗（容量超過など）しても落ちないように try/catch
export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 保存できなくてもアプリ自体は動くようにする
  }
}
