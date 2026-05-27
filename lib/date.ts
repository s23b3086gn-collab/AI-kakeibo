// 「今週」の判定など、日付関連のユーティリティをまとめる

// 月曜日始まり「今週」の開始日（00:00:00）を返す
export function startOfThisWeek(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // getDay(): 日曜=0, 月曜=1, …, 土曜=6
  const day = d.getDay();
  // 月曜始まりにそろえる（日曜なら6日戻る、それ以外は day-1 日戻る）
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// 今週の終了日（次の月曜 00:00:00）を返す
export function endOfThisWeek(now: Date = new Date()): Date {
  const start = startOfThisWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return end;
}

// YYYY-MM-DD（input[type="date"] 互換）に変換
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 「2025/05/23」のような表示用フォーマット
export function formatDateForDisplay(dateStr: string): string {
  // YYYY-MM-DD を YYYY/MM/DD に変換するだけ
  return dateStr.replaceAll("-", "/");
}
