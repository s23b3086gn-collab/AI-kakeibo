"use client";

// 毎日の通知リマインダー設定 UI。/connect ページに配置される想定。
//
// フロー：
//   1) 通知許可（未許可なら「許可する」ボタン）
//   2) リマインダーON/OFF + 時刻設定
//   3) 設定保存は localStorage、変更時にカスタムイベントで全アプリに通知
//   4) テスト通知ボタンで即時動作確認

import { useEffect, useState } from "react";
import {
  DEFAULT_REMINDER_SETTINGS,
  describeNextReminder,
  getNotificationPermission,
  isNotificationSupported,
  REMINDER_CHANGED_EVENT,
  requestNotificationPermission,
  showLocalNotification,
  type ReminderSettings,
} from "@/lib/notification";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";

export function NotificationSettings() {
  const [settings, setSettings] = useState<ReminderSettings>(
    DEFAULT_REMINDER_SETTINGS,
  );
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  // SSR では window が無いので、初期は楽観的に「対応している」扱い。
  // mount 後の useEffect で実際の値を確定する（hydration ミスマッチ回避）
  const [supported, setSupported] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // 初回ロード
  useEffect(() => {
    setSupported(isNotificationSupported());
    setSettings(
      loadFromStorage<ReminderSettings>(
        STORAGE_KEYS.reminderSettings,
        DEFAULT_REMINDER_SETTINGS,
      ),
    );
    setPermission(getNotificationPermission());
    setHydrated(true);
  }, []);

  // 設定変更を localStorage に同期 + 全アプリにイベント通知
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.reminderSettings, settings);
    // 同じタブ内の ReminderTimer に届けるためカスタムイベントを dispatch
    window.dispatchEvent(new Event(REMINDER_CHANGED_EVENT));
  }, [settings, hydrated]);

  const onAskPermission = async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
  };

  const onToggle = (enabled: boolean) => {
    setSettings((s) => ({ ...s, enabled }));
  };

  const onChangeHour = (hour: number) => {
    setSettings((s) => ({ ...s, hour }));
  };

  const onChangeMinute = (minute: number) => {
    setSettings((s) => ({ ...s, minute }));
  };

  // テスト通知ボタン：成功/失敗を画面に出して原因切り分けしやすくする
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const onTest = () => {
    // デバッグのため Console にも出す
    console.log("[Test Notification]", {
      supported: isNotificationSupported(),
      permission:
        typeof Notification !== "undefined" ? Notification.permission : "n/a",
    });

    if (!isNotificationSupported()) {
      setTestResult({
        ok: false,
        message: "このブラウザは通知 API に未対応です",
      });
    } else if (Notification.permission !== "granted") {
      setTestResult({
        ok: false,
        message: `通知が許可されていません（現状: ${Notification.permission}）`,
      });
    } else {
      try {
        new Notification("AI家計簿", {
          body: "今日の支出は記録した？",
          tag: "ai-kakeibo-test",
        });
        setTestResult({
          ok: true,
          message: "✓ 通知を送信しました（画面右上 / 通知センターを確認）",
        });
      } catch (err) {
        setTestResult({
          ok: false,
          message: `エラー: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    setTimeout(() => setTestResult(null), 6000);
  };

  // hydration が終わるまで「対応していません」を出さない（楽観的）
  if (hydrated && !supported) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">
          毎日のリマインダー
        </h2>
        <p className="mt-2 text-xs text-gray-500">
          このブラウザは通知 API に対応していません
        </p>
      </section>
    );
  }

  const disabled = settings.enabled === false || permission !== "granted";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">
        毎日のリマインダー
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        指定した時刻に「今日の支出は記録した？」と通知します
      </p>

      {/* === 通知許可の状態 === */}
      <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <span className="text-xs text-gray-600">通知の許可</span>
        {permission === "granted" ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            ✅ 許可済み
          </span>
        ) : permission === "denied" ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
            ❌ 拒否されています
          </span>
        ) : (
          <button
            type="button"
            onClick={onAskPermission}
            className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97]"
          >
            通知を許可
          </button>
        )}
      </div>
      {permission === "denied" && (
        <p className="mt-1 text-[11px] text-gray-500">
          ブラウザのアドレスバー左の鍵アイコンから許可してください
        </p>
      )}

      {/* === リマインダー ON/OFF === */}
      <label
        className={
          "mt-3 flex items-center gap-2 text-sm " +
          (permission === "granted" ? "text-gray-800" : "text-gray-400")
        }
      >
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={permission !== "granted"}
          className="h-4 w-4 accent-green-600"
        />
        毎日のリマインダーを有効にする
      </label>

      {/* === 時刻設定 === */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-gray-600">
          時
          <select
            value={settings.hour}
            onChange={(e) => onChangeHour(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent disabled:opacity-50"
          >
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>
                {String(i).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[11px] text-gray-600">
          分
          <select
            value={settings.minute}
            onChange={(e) => onChangeMinute(parseInt(e.target.value, 10))}
            disabled={disabled}
            className="mt-0.5 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-accent disabled:opacity-50"
          >
            {[0, 15, 30, 45].map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* === 次の通知予定 === */}
      {settings.enabled && permission === "granted" && (
        <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">
          次の通知：{describeNextReminder(settings.hour, settings.minute)}
        </p>
      )}

      {/* === テスト通知 === */}
      <button
        type="button"
        onClick={onTest}
        className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition active:scale-[0.97] hover:bg-gray-50"
      >
        テスト通知を送る
      </button>
      {testResult && (
        <p
          className={
            "mt-2 rounded-lg px-3 py-2 text-[11px] " +
            (testResult.ok
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800")
          }
        >
          {testResult.message}
        </p>
      )}

      <p className="mt-3 text-[10px] leading-snug text-gray-400">
        ※ ブラウザを開いている間のみ動作します（プロトタイプ仕様）。
        ホーム画面に追加した PWA でも、起動中のみ通知されます。
      </p>
    </section>
  );
}
