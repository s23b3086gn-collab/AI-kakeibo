"use client";

// チラシ特売全体を分析するAIコメントカード。SavingsAdviceCard と同じトーンで表示する。

import { Card } from "./Card";
import type { ChirashiAdvice } from "@/lib/chirashiAdvice";

interface Props {
  advices: ChirashiAdvice[];
}

const TONE_STYLE: Record<ChirashiAdvice["tone"], { wrap: string; title: string }> = {
  good: { wrap: "border-green-200 bg-green-50", title: "text-green-800" },
  info: { wrap: "border-blue-200 bg-blue-50", title: "text-blue-800" },
  warn: { wrap: "border-amber-200 bg-amber-50", title: "text-amber-800" },
};

export function ChirashiAdviceCard({ advices }: Props) {
  return (
    <Card
      className="border-l-4 border-l-green-500"
      title="🤖 今週のおすすめ買い物"
    >
      <ul className="space-y-2">
        {advices.map((a, i) => {
          const s = TONE_STYLE[a.tone];
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-3 ${s.wrap}`}
            >
              <span className="text-2xl leading-none">{a.icon}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${s.title}`}>{a.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-gray-700">
                  {a.message}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
