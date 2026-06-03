// レシート読み取りAPI（モック版）。
// Claude API を呼ばずに、ランダムな「ありがちな支出」を返すデモ実装。
//
// 本物の Claude API に戻したい場合は git history から復元できる。

import { NextResponse } from "next/server";

// 想定される一般的なレシートのモックパターン
const MOCK_RECEIPTS = [
  { amount: 580,  category: "食費" as const,     memo: "スーパー（デモ）" },
  { amount: 1280, category: "外食" as const,     memo: "ランチ（デモ）" },
  { amount: 360,  category: "コンビニ" as const, memo: "おにぎり・飲料（デモ）" },
  { amount: 220,  category: "交通" as const,     memo: "電車運賃（デモ）" },
  { amount: 780,  category: "外食" as const,     memo: "カフェ（デモ）" },
  { amount: 1980, category: "食費" as const,     memo: "まとめ買い（デモ）" },
  { amount: 1500, category: "趣味" as const,     memo: "書籍（デモ）" },
  { amount: 450,  category: "コンビニ" as const, memo: "弁当（デモ）" },
];

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    // 本物っぽく見せるための擬似的なローディング時間（800ms）
    await sleep(800);

    // リクエストボディの最低限のチェック（無くてもエラーにはしない）
    await request.json().catch(() => null);

    // ランダムに1つ選んで返す
    const picked =
      MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];

    return NextResponse.json(picked);
  } catch (error) {
    console.error("[/api/receipt mock] error:", error);
    return NextResponse.json({ amount: 0, category: "その他", memo: "" });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
