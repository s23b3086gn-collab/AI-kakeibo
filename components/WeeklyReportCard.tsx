"use client";

// 週次ふりかえりレポート表示カード。
// 「レポートを生成する」ボタンをタップすると Claude API を叩いて
// AI からのふりかえりコメントを取得・表示する。
//
// 状態は3パターン：
//  1) 支出0件: ボタン非活性 + 案内文
//  2) 未生成: 「レポートを生成する」ボタンのみ
//  3) 生成済み: コメント表示 + 「🔄 再生成」ボタン

import { useState } from "react";
import { Card } from "@/components/Card";
import type { Expense } from "@/lib/types";

interface Props {
  weeklyExpenses: Expense[];
  weeklyBudget: number;
  weeklySpent: number;
}

type Status = "idle" | "loading" | "error";

export function WeeklyReportCard({
  weeklyExpenses,
  weeklyBudget,
  weeklySpent,
}: Props) {
  // 生成済みのコメント（再生成中は古いものを残す方針）
  const [comment, setComment] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");

  const hasExpenses = weeklyExpenses.length > 0;
  const isLoading = status === "loading";

  const generate = async () => {
    if (!hasExpenses || isLoading) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/weekly-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyExpenses,
          weeklyBudget,
          weeklySpent,
        }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      const data = (await res.json()) as { comment: string };
      setComment(data.comment);
      setStatus("idle");
    } catch (err) {
      console.error("[WeeklyReportCard] failed:", err);
      setStatus("error");
    }
  };

  return (
    <Card title="今週のふりかえり">
      {/* --- 既存のコメントがあれば常に表示（再生成中も残す） --- */}
      {comment && (
        <div className="mb-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {comment}
          </p>
        </div>
      )}

      {/* --- HTTP 失敗時のみ表示するエラーメッセージ --- */}
      {status === "error" && (
        <p className="mb-2 text-center text-xs text-danger">
          生成に失敗しました。もう一度お試しください。
        </p>
      )}

      {/* --- メインボタン --- */}
      <button
        type="button"
        onClick={generate}
        disabled={!hasExpenses || isLoading}
        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            AIが分析中...
          </span>
        ) : comment ? (
          "🔄 再生成"
        ) : (
          "レポートを生成する"
        )}
      </button>

      {/* --- 支出0件のときの案内文（ボタン直下） --- */}
      {!hasExpenses && (
        <p className="mt-2 text-center text-xs text-gray-500">
          今週の支出を記録するとレポートが生成できます
        </p>
      )}
    </Card>
  );
}

// くるくる回る簡易スピナー（ReceiptScanner と同じデザイン）
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
