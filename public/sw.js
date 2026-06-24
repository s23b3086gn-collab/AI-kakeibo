// Service Worker for AI家計簿 v5
//
// 主な役割：
//   1) installation を即時 activate（古いSWに引きずられない）
//   2) 通知タップ時にアプリを最前面に持ってくる / 新規タブで開く
//
// 注意：本プロトタイプの「定時リマインド」は backend を持たないため
// アプリ側の setTimeout で発火している。SW 単体での定時スケジュールは
// しない（Periodic Background Sync は対応範囲が狭いため）。

self.addEventListener("install", (event) => {
  // 旧 SW を待たず即座に新 SW を有効化
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // 既存タブも今すぐ新 SW の管理下に
  event.waitUntil(self.clients.claim());
});

// 通知タップ：既存タブがあればフォーカス、なければ新規で開く
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const origin = self.location.origin;
        const existing = clients.find((c) => c.url.startsWith(origin));
        if (existing) {
          return existing.focus();
        }
        return self.clients.openWindow("/");
      }),
  );
});
