// 「買った」記録。物価タブの品目ごとに「今日これを買った」を残し、
// 価格レーダー／個別価格チャートに「ここで買えた」点として重ねて表示するための
// シンプルな localStorage 永続化（サーバー保存なし）。

const STORAGE_KEY = "priceBuyRecords";
const RECENT_MS = 7 * 24 * 60 * 60 * 1000; // 直近7日以内を「今週」扱いにする簡易判定

export interface PurchaseRecord {
  item: string;
  date: string; // ISO文字列（記録した日時）
  price: number; // 記録時点の価格（参考表示用）
}

function readAll(): PurchaseRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records: PurchaseRecord[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < RECENT_MS;
}

// 直近7日以内に「買った」記録がある品目名の集合（チャートの点・ボタンの状態表示用）
export function getRecentlyBoughtItems(): Set<string> {
  const items = new Set<string>();
  for (const r of readAll()) {
    if (isRecent(r.date)) items.add(r.item);
  }
  return items;
}

// 「買った」をトグルする。直近の記録があれば取り消し、無ければ今の価格で追加する。
export function toggleBought(item: string, price: number): Set<string> {
  const all = readAll();
  const idx = all.findIndex((r) => r.item === item && isRecent(r.date));
  if (idx >= 0) {
    all.splice(idx, 1);
  } else {
    all.push({ item, date: new Date().toISOString(), price });
  }
  writeAll(all);
  return getRecentlyBoughtItems();
}
