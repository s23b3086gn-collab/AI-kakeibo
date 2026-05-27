"use client";

// AIコメントを表示するカード。アプリの中心体験。
import { Card } from "./Card";
import type { AIComment } from "@/lib/aiComment";

interface Props {
  comments: AIComment[];
}

// トーンごとの色・アイコン（白背景に合わせ淡い背景＋濃いドット）
const TONE_STYLE: Record<
  AIComment["tone"],
  { wrap: string; dot: string }
> = {
  good:   { wrap: "border-green-200 bg-green-50",   dot: "bg-accent" },
  info:   { wrap: "border-blue-200 bg-blue-50",     dot: "bg-blue-500" },
  warn:   { wrap: "border-amber-200 bg-amber-50",   dot: "bg-warn" },
  danger: { wrap: "border-red-200 bg-red-50",       dot: "bg-danger" },
};

export function AICommentCard({ comments }: Props) {
  return (
    <Card title="🤖 AIコメント">
      <ul className="space-y-2">
        {comments.map((c, i) => {
          const style = TONE_STYLE[c.tone];
          return (
            <li
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-3 ${style.wrap}`}
            >
              {/* 色付きの小さな丸でトーンを示す */}
              <span className={`mt-2 inline-block h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <p className="text-sm leading-relaxed text-gray-800">{c.message}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
