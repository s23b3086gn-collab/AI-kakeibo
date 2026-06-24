"use client";

// 毎日のリマインダー通知を発火するためのアプリ全体タイマー。
// レイアウトに置くことでルートを跨いでも継続動作する。
//
// 仕組み：
//   ・ localStorage の reminderSettings を読み、有効なら次の発火時刻まで setTimeout
//   ・ 発火したら通知を出し、翌日のために再スケジュール
//   ・ 設定変更（REMINDER_CHANGED_EVENT）/ フォーカス復帰 / 別タブの storage 変更で再スケジュール

import { useEffect } from "react";
import {
  DEFAULT_REMINDER_SETTINGS,
  msUntilNext,
  REMINDER_CHANGED_EVENT,
  showLocalNotification,
  type ReminderSettings,
} from "@/lib/notification";
import { loadFromStorage, STORAGE_KEYS } from "@/lib/storage";

export function ReminderTimer() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    // 現状の設定を読み直してタイマーをセットし直す
    const reschedule = () => {
      clearTimer();
      const s = loadFromStorage<ReminderSettings>(
        STORAGE_KEYS.reminderSettings,
        DEFAULT_REMINDER_SETTINGS,
      );
      if (!s.enabled) return;
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;

      const ms = msUntilNext(s.hour, s.minute);
      timer = setTimeout(() => {
        showLocalNotification("AI家計簿", "今日の支出は記録した？");
        // 翌日ぶんを再セット
        reschedule();
      }, ms);
    };

    reschedule();

    // 設定が変わったらタイマーを張り直す
    const onChanged = () => reschedule();
    window.addEventListener(REMINDER_CHANGED_EVENT, onChanged);

    // 別タブで localStorage が書き換わった場合（クロスタブ同期）
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.reminderSettings) reschedule();
    };
    window.addEventListener("storage", onStorage);

    // タブが復帰したときも setTimeout の精度がズレないよう張り直す
    const onVisible = () => {
      if (!document.hidden) reschedule();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimer();
      window.removeEventListener(REMINDER_CHANGED_EVENT, onChanged);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
