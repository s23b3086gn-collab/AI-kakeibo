// レシート画像をClaude APIに渡し、金額・カテゴリ・メモを抽出するAPIルート。
// 失敗時もエラーレスポンスではなく fallback の JSON を返すことで、
// クライアント側のハンドリングをシンプルに保つ設計。

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

// ANTHROPIC_API_KEY を環境変数（.env.local）から自動で読み取る
const client = new Anthropic();

// 受け付けるカテゴリの一覧（lib/types.ts と整合）
const VALID_CATEGORIES = [
  "食費",
  "外食",
  "コンビニ",
  "趣味",
  "交通",
  "その他",
] as const;
type Category = (typeof VALID_CATEGORIES)[number];

// Claude API が受け付ける画像 MIME タイプ
const SUPPORTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;
type SupportedMime = (typeof SUPPORTED_MIME)[number];

// 読み取れないときに返す既定値
const FALLBACK = { amount: 0, category: "その他" as Category, memo: "" };

interface RequestBody {
  imageBase64: string;
  mimeType: string;
}

// Node.js 上で動かす（Edge ランタイムだと Anthropic SDK が動かないため）
export const runtime = "nodejs";
// 画像 + LLM 推論で時間がかかることがあるので少し長めに
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<RequestBody>;

    // 必須フィールドの存在 / 型チェック
    if (
      typeof body.imageBase64 !== "string" ||
      typeof body.mimeType !== "string" ||
      !body.imageBase64
    ) {
      return NextResponse.json(FALLBACK);
    }

    // 想定外の MIME タイプは fallback（Claude 側で 400 になるのを防ぐ）
    if (!isSupportedMime(body.mimeType)) {
      return NextResponse.json(FALLBACK);
    }

    const response = await client.messages.create({
      // NOTE: 2026-06-15 に廃止予定。安定して動くうちに claude-sonnet-4-6 への移行を検討
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system:
        "あなたはレシート解析AIです。画像からレシートの合計金額・カテゴリ・メモを読み取り、JSONのみを返してください。前置き・後置き・コードブロック不要。",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: body.mimeType,
                data: body.imageBase64,
              },
            },
            {
              type: "text",
              text: `このレシート画像から以下を抽出し、JSONのみで返してください:
{
  "amount": 数値（円、税込合計。読めない場合は0）,
  "category": "食費" | "外食" | "コンビニ" | "趣味" | "交通" | "その他",
  "memo": "短い説明（店名や品目など、20文字以内）"
}

カテゴリの判定基準:
- 食費: スーパー・八百屋など自炊向けの食材購入
- 外食: レストラン・居酒屋・ファストフードなど店内/テイクアウト食事
- コンビニ: セブンイレブン・ローソン・ファミマなどコンビニ全般
- 趣味: 書籍・ゲーム・娯楽
- 交通: 電車・バス・タクシー・ガソリン
- その他: 上記に該当しないもの`,
            },
          ],
        },
      ],
    });

    // テキストブロックを抽出
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(FALLBACK);
    }

    // Claude がたまに ```json ... ``` で囲んでくることがあるので除去
    const cleaned = stripCodeFence(textBlock.text.trim());

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(FALLBACK);
    }

    // 値のバリデーション
    if (typeof parsed !== "object" || parsed === null) {
      return NextResponse.json(FALLBACK);
    }
    const p = parsed as Record<string, unknown>;

    const amount =
      typeof p.amount === "number" && Number.isFinite(p.amount)
        ? Math.max(0, Math.round(p.amount))
        : 0;

    const category: Category =
      typeof p.category === "string" &&
      (VALID_CATEGORIES as readonly string[]).includes(p.category)
        ? (p.category as Category)
        : "その他";

    const memo =
      typeof p.memo === "string" ? p.memo.trim().slice(0, 100) : "";

    return NextResponse.json({ amount, category, memo });
  } catch (error) {
    // ネットワーク・API キー不正・レート制限 等。サーバーログには残しつつ
    // クライアントには fallback を返す（仕様: 500を返さない）
    console.error("[/api/receipt] error:", error);
    return NextResponse.json(FALLBACK);
  }
}

// ---- helpers ----

function isSupportedMime(s: string): s is SupportedMime {
  return (SUPPORTED_MIME as readonly string[]).includes(s);
}

// ```json\n...\n``` や ```...``` の囲みを除去
function stripCodeFence(s: string): string {
  return s
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
}
