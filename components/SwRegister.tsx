"use client";

// Service Worker をブラウザに登録する小さなクライアントコンポーネント。
// レイアウトに置くことでアプリ起動直後に SW を有効化する。

import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch((err) => {
      // 失敗してもアプリ動作には影響しないので警告のみ
      console.warn("[SW register] failed:", err);
    });
  }, []);

  return null;
}
