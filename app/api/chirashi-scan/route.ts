// チラシ画像の解析API。
// ANTHROPIC_API_KEY があれば Claude Vision で実際にチラシを解析し、
// キーが無い / 解析失敗時はモック（固定のチラシ）にフォールバックする。
// ※ スクレイピングはしない。ユーザーが撮影・保存した画像のみを解析する。

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// 1品目ぶんの抽出結果（ChirashiItem のうち画像から取れるフィールド）
interface ScanItem {
  itemName: string;
  category: "野菜" | "肉" | "魚" | "調味料" | "惣菜" | "その他";
  price: number;
  unit?: string;
  store: string;
}

const VALID_CATEGORIES = ["野菜", "肉", "魚", "調味料", "惣菜", "その他"] as const;

// Vision 対応モデル。既定は最上位の Claude Opus 4.8。
// コストを抑えたい場合は "claude-haiku-4-5" / "claude-sonnet-5" に差し替え可。
const VISION_MODEL = "claude-opus-4-8";

const EXTRACTION_PROMPT = `このスーパーのチラシ画像から、特売商品を抽出してJSON配列で返してください。
各商品について: itemName（商品名）, category（"野菜"/"肉"/"魚"/"調味料"/"惣菜"/"その他" のいずれか）, price（税込価格の数値のみ、カンマや円記号は不要）, unit（単位。例 "1玉" "100g" "1パック"）, store（店名が読み取れれば。無ければ省略可）。
食品・日用品のみを対象にしてください。前置きや説明・マークダウンは不要で、JSON配列だけを返してください。`;

// チラシ1枚ぶんのモック（キー未設定・解析失敗時のフォールバック）
const MOCK_FLYERS: ScanItem[][] = [
  [
    { itemName: "キャベツ", category: "野菜", price: 138, unit: "1玉", store: "ライフ" },
    { itemName: "豚こま肉", category: "肉", price: 108, unit: "100g", store: "ライフ" },
    { itemName: "鮭切身", category: "魚", price: 380, unit: "3切", store: "ライフ" },
    { itemName: "木綿豆腐", category: "その他", price: 58, unit: "1丁", store: "ライフ" },
    { itemName: "トマト", category: "野菜", price: 258, unit: "4個", store: "ライフ" },
  ],
  [
    { itemName: "鶏もも肉", category: "肉", price: 78, unit: "100g", store: "マルエツ" },
    { itemName: "レタス", category: "野菜", price: 158, unit: "1玉", store: "マルエツ" },
    { itemName: "卵", category: "その他", price: 198, unit: "1パック(10個)", store: "マルエツ" },
    { itemName: "食パン", category: "その他", price: 108, unit: "1斤", store: "マルエツ" },
    { itemName: "バナナ", category: "その他", price: 138, unit: "1房", store: "マルエツ" },
  ],
  [
    { itemName: "鶏むね肉", category: "肉", price: 62, unit: "100g", store: "ドン・キホーテ" },
    { itemName: "もやし", category: "野菜", price: 29, unit: "1袋", store: "ドン・キホーテ" },
    { itemName: "冷凍餃子", category: "惣菜", price: 218, unit: "1袋", store: "ドン・キホーテ" },
    { itemName: "牛乳", category: "その他", price: 188, unit: "1L", store: "ドン・キホーテ" },
    { itemName: "カットわかめ", category: "その他", price: 158, unit: "1袋", store: "ドン・キホーテ" },
  ],
];

export const runtime = "nodejs";
// Vision 解析は数秒かかるため関数の実行上限を延ばす
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as { imageBase64?: string; mimeType?: string } | null;
  const imageBase64 = body?.imageBase64;
  const mimeType = body?.mimeType ?? "image/jpeg";

  // APIキー未設定 or 画像なし → モック（従来動作）
  if (!process.env.ANTHROPIC_API_KEY || !imageBase64) {
    await sleep(1200);
    return NextResponse.json({ items: pickMockFlyer(), source: "mock" });
  }

  try {
    const items = await extractWithClaude(imageBase64, mimeType);
    return NextResponse.json({ items, source: "ai" });
  } catch (error) {
    console.error("[/api/chirashi-scan] Vision error:", error);
    // 解析失敗時はモックにフォールバック（デモを止めない）
    return NextResponse.json({ items: pickMockFlyer(), source: "mock" });
  }
}

// ---- Claude Vision 解析 ----

type ImageMedia = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

async function extractWithClaude(
  imageBase64: string,
  mimeType: string,
): Promise<ScanItem[]> {
  const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

  const response = await client.messages.create({
    model: VISION_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: normalizeMedia(mimeType),
              data: imageBase64,
            },
          },
          { type: "text", text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  // テキストブロックを連結して JSON を取り出す
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n");

  return parseItems(text);
}

function normalizeMedia(mimeType: string): ImageMedia {
  if (mimeType === "image/png" || mimeType === "image/gif" || mimeType === "image/webp") {
    return mimeType;
  }
  return "image/jpeg";
}

// AI応答テキストから JSON 配列を取り出して ScanItem[] に正規化する
function parseItems(text: string): ScanItem[] {
  const jsonText = extractJsonArray(text);
  if (!jsonText) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const items: ScanItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const o = entry as Record<string, unknown>;

    const itemName = typeof o.itemName === "string" ? o.itemName.trim() : "";
    const price =
      typeof o.price === "number" ? o.price : Number(String(o.price ?? "").replace(/[^\d.]/g, ""));
    if (!itemName || !Number.isFinite(price) || price <= 0) continue;

    items.push({
      itemName,
      category: normalizeCategory(o.category),
      price: Math.round(price),
      unit: typeof o.unit === "string" && o.unit.trim() ? o.unit.trim() : undefined,
      store: typeof o.store === "string" && o.store.trim() ? o.store.trim() : "読み取り店舗",
    });
  }
  return items;
}

// テキスト中の最初の '[' 〜 最後の ']' を JSON 配列候補として切り出す
function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}

function normalizeCategory(v: unknown): ScanItem["category"] {
  if (typeof v === "string" && (VALID_CATEGORIES as readonly string[]).includes(v)) {
    return v as ScanItem["category"];
  }
  return "その他";
}

// ---- モック ----

function pickMockFlyer(): ScanItem[] {
  return MOCK_FLYERS[Math.floor(Math.random() * MOCK_FLYERS.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
