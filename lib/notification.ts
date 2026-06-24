// PWA 通知（Notifications API）周りのヘルパー。
// Notifications はブラウザネイティブの API なので追加依存なし。
// 本物の Web Push は backend が必須だが、本プロトタイプでは
// 「アプリ起動中に setTimeout で発火」の簡易方式を採用する。

export interface ReminderSettings {
  enabled: boolean; // リマインダーON/OFF
  hour: number;     // 0-23
  minute: number;   // 0-59
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 22,
  minute: 0,
};

// リマインダー設定が更新されたときに各所へ通知するためのカスタムイベント
export const REMINDER_CHANGED_EVENT = "ai-kakeibo:reminder-changed";

export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window;
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isNotificationSupported()) return "unsupported";
  return await Notification.requestPermission();
}

// ローカル通知を即時表示
export function showLocalNotification(title: string, body: string): void {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: "ai-kakeibo-reminder",
    });
  } catch (err) {
    console.error("[notification] failed:", err);
  }
}

// 次回 hour:minute まで何ミリ秒かを返す（既に過ぎていれば翌日）
export function msUntilNext(hour: number, minute: number): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

// 「今日 22:00」「明日 22:00」のような表示文字列
export function describeNextReminder(hour: number, minute: number): string {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  const isTomorrow = target.getTime() <= now.getTime();
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${isTomorrow ? "明日" : "今日"} ${hh}:${mm}`;
}
