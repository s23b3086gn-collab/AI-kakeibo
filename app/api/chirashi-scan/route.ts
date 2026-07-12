// チラシ画像の解析API（モック版）。
// レシート読み取り（/api/receipt）と同じ方針で、Claude API を呼ばずに
// 「ありがちなチラシ1枚ぶんの特売品目」をランダムに返すデモ実装。
//
// 本物にする場合は Claude Vision API（claude-sonnet-4-20250514 等）へ画像を渡し、
// itemName / category / price / unit / store を JSON 抽出させる想定。
// ※ トクバイ等のスクレイピングは行わない。あくまでユーザーが撮影した画像のみを解析する。

import { NextResponse } from "next/server";

// 1品目ぶんの抽出結果（ChirashiItem のうち画像から取れるフィールド）
interface ScanItem {
  itemName: string;
  category: "野菜" | "肉" | "魚" | "調味料" | "惣菜" | "その他";
  price: number;
  unit?: string;
  store: string;
}

// チラシ1枚ぶんのモック（店舗ごとに現実的な特売品目のセット）
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

export async function POST(request: Request) {
  try {
    // 解析している感を出すための擬似ローディング（1200ms）
    await sleep(1200);

    // リクエストボディの最低限のチェック（無くてもエラーにはしない）
    await request.json().catch(() => null);

    // ランダムに1枚ぶん返す
    const items =
      MOCK_FLYERS[Math.floor(Math.random() * MOCK_FLYERS.length)];

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[/api/chirashi-scan mock] error:", error);
    // 失敗時は空配列（クライアント側で「読み取れなかった」扱い）
    return NextResponse.json({ items: [] });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
