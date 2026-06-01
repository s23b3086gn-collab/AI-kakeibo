// 週次ふりかえりレポートを Claude API で生成する API ルート。
// クライアントから今週の支出データを受け取り、AIが200文字以内の振り返りコメントを返す。
// 失敗時もエラーレスポンスではなく fallback コメントを返してクライアントを簡潔に保つ。

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { Expense } from "@/lib/types";

// ANTHROPIC_API_KEY を環境変数（.env.local）から自動で読み取る
const client = new Anthropic();

// 失敗時に返す既定値
const FALLBACK = { comment: "レポートを生成できませんでした。" };

interface RequestBody {
  weeklyExpenses: Expense[];
  weeklyBudget: number;
  weeklySpent: number;
}

// Anthropic SDK は Node ランタイムが必要
export const runtime = "nodejs";
// LLM 推論で時間がかかる可能性があるので余裕を持たせる
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;

    // 簡易バリデーション
    if (
      !Array.isArray(body.weeklyExpenses) ||
      typeof body.weeklyBudget !== "number" ||
      typeof body.weeklySpent !== "number"
    ) {
      return NextResponse.json(FALLBACK);
    }

    // 0件のときはモデルを呼ばずに固定文を返す（コスト節約）
    if (body.weeklyExpenses.length === 0) {
      return NextResponse.json({
        comment: "今週はまだ支出が記録されていません。",
      });
    }

    // モデルに渡しやすい形に集計テキスト化する
    const userPrompt = buildSummary(
      body.weeklyExpenses,
      body.weeklyBudget,
      body.weeklySpent,
    );

    const response = await client.messages.create({
      // NOTE: 2026-06-15 廃止予定。後継は claude-sonnet-4-6
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        "あなたは家計簿アシスタントです。一人暮らしの大学生の今週の支出データを見て、200文字以内の日本語でふりかえりコメントを生成してください。褒めるべき点・改善点・来週へのアドバイスを含めてください。前置き不要。コメント本文のみ返してください。",
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(FALLBACK);
    }

    const comment = textBlock.text.trim();
    if (!comment) {
      return NextResponse.json(FALLBACK);
    }

    return NextResponse.json({ comment });
  } catch (error) {
    // 認証失敗・レート制限・ネットワークエラーなど
    console.error("[/api/weekly-report] error:", error);
    return NextResponse.json(FALLBACK);
  }
}

// ----- helpers -----

// モデル向けに「今週の家計サマリ」を Markdown 風に整形する。
// 生 JSON を渡すよりも読み取り精度が上がる。
function buildSummary(
  expenses: Expense[],
  budget: number,
  spent: number,
): string {
  // カテゴリ別の集計
  const byCat: Record<string, { amount: number; count: number }> = {};
  for (const e of expenses) {
    if (!byCat[e.category]) byCat[e.category] = { amount: 0, count: 0 };
    byCat[e.category].amount += e.amount;
    byCat[e.category].count += 1;
  }
  const categoryLines = Object.entries(byCat)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(
      ([cat, v]) =>
        `- ${cat}: ¥${v.amount.toLocaleString("ja-JP")}（${v.count}件）`,
    );

  // 予算との対比文言
  const remaining = budget - spent;
  let budgetLine = "- 週予算: 未設定";
  if (budget > 0) {
    const usageRate = Math.round((spent / budget) * 100);
    budgetLine =
      remaining >= 0
        ? `- 週予算: ¥${budget.toLocaleString("ja-JP")}（消化 ${usageRate}%、残り ¥${remaining.toLocaleString("ja-JP")}）`
        : `- 週予算: ¥${budget.toLocaleString("ja-JP")}（¥${Math.abs(remaining).toLocaleString("ja-JP")} オーバー）`;
  }

  // 直近の支出メモ（最大5件まで、傾向を掴むヒント）
  const recentMemos = expenses
    .slice(-5)
    .map((e) => {
      const memo = e.memo ? `「${e.memo}」` : "";
      return `- ${e.date}: ${e.category} ¥${e.amount.toLocaleString("ja-JP")}${memo}`;
    });

  return [
    "【今週の家計データ】",
    budgetLine,
    `- 今週の合計支出: ¥${spent.toLocaleString("ja-JP")}`,
    `- 支出件数: ${expenses.length}件`,
    "",
    "【カテゴリ別】",
    ...categoryLines,
    "",
    "【直近の支出（最大5件）】",
    ...recentMemos,
  ].join("\n");
}
