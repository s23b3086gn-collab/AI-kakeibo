// localStorage を型安全に扱うための小さなヘルパー。
// SSR（サーバー側）では window が無いので、必ず typeof window で守る。

// 保存に使うキーをまとめておく
export const STORAGE_KEYS = {
  assets: "ai-kakeibo:assets",
  expenses: "ai-kakeibo:expenses",
  weeklyBudget: "ai-kakeibo:weeklyBudget",
  // 記録ストリーク用：ユーザーが「支出を追加」したユニーク日付の配列（YYYY-MM-DD）
  recordDates: "ai-kakeibo:recordDates",
  // 先週比較用：先週の合計支出（円）。expenses から計算した値をミラー保存
  lastWeekTotal: "ai-kakeibo:lastWeekTotal",
  // 電子マネー連携用：サービスID → 連携済みフラグ（{ suica: true, paypay: false, ... }）
  linkedServices: "ai-kakeibo:linkedServices",
  // 取込候補の処理済みID（記録 or スキップ済み）
  linkageProcessed: "ai-kakeibo:linkageProcessed",
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
