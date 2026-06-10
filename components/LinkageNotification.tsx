"use client";

// 電子マネー連携の「取込通知バナー」＋「明細一覧モーダル」UI。
//
// 流れ：
//   1) 未連携サービスの明細は出ない
//   2) 連携済みサービスの未処理（記録/スキップしていない）明細件数をバナー表示
//   3) バナータップで一覧モーダル → 各明細を「記録する」or「スキップ」
//   4) 「記録する」→ 親の onRecord に Expense を渡す。同時にこの ID を処理済みへ
//   5) すべて処理し終わったら自動でバナー消去（モーダルは空状態に）

import { useEffect, useState } from "react";
import {
  DUMMY_TRANSACTIONS,
  resolveRelativeDate,
  type LinkageTransaction,
} from "@/lib/linkageData";
import {
  loadFromStorage,
  saveToStorage,
  STORAGE_KEYS,
} from "@/lib/storage";
import type { Expense } from "@/lib/types";

interface Props {
  // 取り込みボタン押下時に親（ホーム画面）へ Expense を渡す
  onRecord: (expense: Expense) => void;
}

export function LinkageNotification({ onRecord }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [linkedServices, setLinkedServices] = useState<Record<string, boolean>>({});
  const [processedIds, setProcessedIds] = useState<number[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // 初回ロード
  useEffect(() => {
    setLinkedServices(
      loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.linkedServices, {}),
    );
    setProcessedIds(
      loadFromStorage<number[]>(STORAGE_KEYS.linkageProcessed, []),
    );
    setHydrated(true);
  }, []);

  // 処理済みIDの変更を localStorage に同期
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.linkageProcessed, processedIds);
  }, [processedIds, hydrated]);

  // 連携済みサービスの未処理明細だけが「pending」
  const pending = DUMMY_TRANSACTIONS.filter(
    (t) => linkedServices[t.serviceId] && !processedIds.includes(t.id),
  );

  // hydrate 前 or pending=0 ならバナー非表示
  if (!hydrated || pending.length === 0) return null;

  // 記録ボタン押下：Expense を生成して親に渡す + 処理済みに追加
  const handleRecord = (tx: LinkageTransaction) => {
    onRecord({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      amount: tx.amount,
      category: tx.category,
      memo: `${tx.label}（${tx.serviceName}）`,
      date: resolveRelativeDate(tx.relativeDate),
    });
    setProcessedIds((prev) => [...prev, tx.id]);
  };

  // スキップ：処理済みに追加するだけ（支出には記録しない）
  const handleSkip = (tx: LinkageTransaction) => {
    setProcessedIds((prev) => [...prev, tx.id]);
  };

  return (
    <>
      {/* ===== バナー ===== */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-blue-200 bg-blue-50 p-3 text-left shadow-sm transition active:scale-[0.99]"
        aria-label={`新しい明細が${pending.length}件あります`}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-blue-900">
            📩 新しい明細が届いています
          </p>
          <p className="mt-0.5 text-xs text-blue-700">
            タップして取り込み内容を確認
          </p>
        </div>
        <span className="ml-2 inline-flex shrink-0 items-center justify-center rounded-full bg-blue-500 px-2.5 py-1 text-xs font-bold text-white">
          {pending.length}件
        </span>
      </button>

      {/* ===== 一覧モーダル ===== */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-4 pb-8 pt-12 sm:items-center"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダ */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  📩 取り込み候補
                </h2>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  記録すると支出データに追加されます
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {/* 明細リスト */}
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
              {pending.map((tx) => (
                <li
                  key={tx.id}
                  className="rounded-xl border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <span className="font-semibold">{tx.serviceName}</span>
                        <span>·</span>
                        <span>{tx.relativeDate}</span>
                      </div>
                      <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                        {tx.label}
                      </p>
                    </div>
                    <p className="shrink-0 text-base font-bold text-gray-900">
                      ¥{tx.amount.toLocaleString("ja-JP")}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecord(tx)}
                      className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.97]"
                    >
                      記録する
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSkip(tx)}
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition active:scale-[0.97] hover:bg-gray-50"
                    >
                      スキップ
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-center text-[10px] text-gray-400">
              ※ サンプルデータです。本番では連携サービスから自動取得します
            </p>
          </div>
        </div>
      )}
    </>
  );
}
