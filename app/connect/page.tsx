"use client";

// 電子マネー連携設定ページ。
// 各サービスのカードを並べ、「連携する」で擬似認証モーダルを表示する。

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SERVICES, type ServiceId } from "@/lib/linkageData";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";

// 認証モーダルの内部 state
interface ModalState {
  open: boolean;
  serviceId: ServiceId | null;
}

export default function ConnectPage() {
  const [hydrated, setHydrated] = useState(false);
  // サービスID → 連携済みフラグ（boolean）
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  // 認証モーダル
  const [modal, setModal] = useState<ModalState>({
    open: false,
    serviceId: null,
  });
  // 連携完了トースト
  const [toast, setToast] = useState<string | null>(null);

  // 初回ロード
  useEffect(() => {
    setLinked(
      loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.linkedServices, {}),
    );
    setHydrated(true);
  }, []);

  // 連携状態の変更を localStorage に同期
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.linkedServices, linked);
  }, [linked, hydrated]);

  // 「連携する」押下時の擬似フロー：
  // モーダルで「認証中...」を2秒表示 → モーダル閉じる → トースト表示
  const connect = (id: ServiceId) => {
    setModal({ open: true, serviceId: id });
    setTimeout(() => {
      setLinked((prev) => ({ ...prev, [id]: true }));
      setModal({ open: false, serviceId: null });
      const name = SERVICES.find((s) => s.id === id)?.name ?? "サービス";
      setToast(`${name} と連携完了！`);
      // 3秒後にトースト自動非表示
      setTimeout(() => setToast(null), 3000);
    }, 2000);
  };

  // 解除（連携済み状態を元に戻す）
  const disconnect = (id: ServiceId) => {
    setLinked((prev) => ({ ...prev, [id]: false }));
  };

  return (
    <>
      <main className="mx-auto max-w-md px-4 py-6 pb-32">
        {/* ヘッダ */}
        <header className="mb-4">
          <h1 className="text-xl font-bold">💳 電子マネー連携</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            連携すると明細を自動取り込みできます（デモ）
          </p>
        </header>

        {/* サービス一覧 */}
        {/* === 通知リマインダー設定 === */}
        <div className="mb-4">
          <NotificationSettings />
        </div>

        <div className="space-y-3">
          {SERVICES.map((s) => {
            const isLinked = !!linked[s.id];
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-3xl" aria-hidden>
                    {s.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      {isLinked ? "✅ 連携済み" : "未連携"}
                    </p>
                  </div>
                </div>

                {isLinked ? (
                  <button
                    type="button"
                    onClick={() => disconnect(s.id)}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition active:scale-[0.97] hover:bg-gray-50"
                  >
                    解除
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(s.id)}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97] hover:bg-green-700"
                  >
                    連携する
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 説明文 */}
        <p className="mt-6 text-center text-[11px] text-gray-400">
          連携後、ホーム画面に取り込み候補のバナーが表示されます
        </p>
      </main>

      {/* ===== 認証モーダル ===== */}
      {modal.open && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="認証中"
        >
          <div className="w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl">
            <Spinner />
            <p className="mt-3 text-sm font-semibold text-gray-900">
              認証中...
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {SERVICES.find((s) => s.id === modal.serviceId)?.name} に接続しています
            </p>
          </div>
        </div>
      )}

      {/* ===== トースト ===== */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex max-w-md justify-center px-4">
          <div className="rounded-full bg-gray-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
            ✓ {toast}
          </div>
        </div>
      )}

      {/* ===== ボトムナビ（連携タブが現在地） ===== */}
      <BottomNav activeId="connect" />
    </>
  );
}

// 認証モーダル内のくるくるスピナー
function Spinner() {
  return (
    <svg
      className="mx-auto h-8 w-8 animate-spin text-accent"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
