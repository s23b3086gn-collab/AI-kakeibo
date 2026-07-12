// チラシ特売情報（フェーズ1：ダミーデータ）。
// トクバイ・シュフー・イオン公式・ベイシア公式のスクレイピングは利用規約違反のため一切行わない。
// フェーズ2でチラシ画像解析（source: "flyer_image"）、
// フェーズ3でAI Web検索結果（source: "web_search"）を追加する想定。

import { startOfThisWeek, endOfThisWeek } from "./date";

export type ChirashiStore = "イオン" | "ベイシア" | "業務スーパー";
export type ChirashiCategory = "野菜" | "肉" | "魚" | "調味料" | "惣菜" | "その他";

export const CHIRASHI_STORES: ChirashiStore[] = ["イオン", "ベイシア", "業務スーパー"];
export const CHIRASHI_CATEGORIES: ChirashiCategory[] = [
  "野菜",
  "肉",
  "魚",
  "調味料",
  "惣菜",
  "その他",
];

export interface ChirashiItem {
  id: string;
  // 登録3店舗（ChirashiStore）に加え、画像読取・AI検索で得た任意店舗名も入るため string
  store: string;
  storeArea?: string;
  itemName: string;      // "キャベツ" "鶏むね肉" など（品目単位）
  category: ChirashiCategory;
  price: number;         // 特売価格（税込・円）
  normalPrice?: number;  // 通常価格（割引率計算に使う。無ければ「特売」表示はしない）
  unit?: string;         // "1玉" "100gあたり" など
  validFrom: string;     // ISO
  validTo: string;       // ISO
  source: "dummy" | "flyer_image" | "web_search";
}

// 割引率（%）。normalPrice が無い/price 以下なら null（誤って煽らないため）
export function discountRate(
  item: Pick<ChirashiItem, "price" | "normalPrice">,
): number | null {
  if (!item.normalPrice || item.normalPrice <= item.price) return null;
  return Math.round((1 - item.price / item.normalPrice) * 100);
}

type RawItem = Omit<ChirashiItem, "id" | "validFrom" | "validTo" | "source">;

const RAW_ITEMS: RawItem[] = [
  // ---------- イオン ----------
  { store: "イオン", storeArea: "千葉県内", itemName: "キャベツ", category: "野菜", price: 128, normalPrice: 198, unit: "1玉" },
  { store: "イオン", storeArea: "千葉県内", itemName: "卵", category: "その他", price: 198, normalPrice: 258, unit: "1パック(10個)" },
  { store: "イオン", storeArea: "千葉県内", itemName: "豚バラ肉", category: "肉", price: 128, normalPrice: 168, unit: "100g" },
  { store: "イオン", storeArea: "千葉県内", itemName: "鶏むね肉", category: "肉", price: 58, normalPrice: 78, unit: "100g" },
  { store: "イオン", storeArea: "千葉県内", itemName: "サバ切身", category: "魚", price: 258, normalPrice: 328, unit: "1パック" },
  { store: "イオン", storeArea: "千葉県内", itemName: "玉ねぎ", category: "野菜", price: 128, normalPrice: 168, unit: "3個" },
  { store: "イオン", storeArea: "千葉県内", itemName: "にんじん", category: "野菜", price: 108, normalPrice: 148, unit: "3本" },
  { store: "イオン", storeArea: "千葉県内", itemName: "醤油", category: "調味料", price: 198, normalPrice: 248, unit: "1L" },
  { store: "イオン", storeArea: "千葉県内", itemName: "コロッケ", category: "惣菜", price: 128, normalPrice: 158, unit: "2個" },
  { store: "イオン", storeArea: "千葉県内", itemName: "牛乳", category: "その他", price: 198, normalPrice: 238, unit: "1L" },
  { store: "イオン", storeArea: "千葉県内", itemName: "豆腐", category: "その他", price: 68, normalPrice: 98, unit: "1丁" },
  { store: "イオン", storeArea: "千葉県内", itemName: "アジ開き", category: "魚", price: 328, normalPrice: 398, unit: "2枚" },
  { store: "イオン", storeArea: "千葉県内", itemName: "納豆", category: "その他", price: 78, normalPrice: 98, unit: "3パック" },

  // ---------- ベイシア ----------
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "トマト", category: "野菜", price: 198, normalPrice: 258, unit: "4個" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "きゅうり", category: "野菜", price: 128, normalPrice: 158, unit: "3本" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "鶏もも肉", category: "肉", price: 68, normalPrice: 88, unit: "100g" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "豚こま肉", category: "肉", price: 98, normalPrice: 128, unit: "100g" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "卵", category: "その他", price: 178, normalPrice: 228, unit: "1パック(10個)" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "味噌", category: "調味料", price: 248, normalPrice: 298, unit: "750g" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "ちくわ", category: "その他", price: 98, normalPrice: 128, unit: "1袋" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "じゃがいも", category: "野菜", price: 198, normalPrice: 258, unit: "5個" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "鮭切身", category: "魚", price: 398, normalPrice: 498, unit: "3切" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "コロッケ", category: "惣菜", price: 148, normalPrice: 198, unit: "3個" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "食パン", category: "その他", price: 98, normalPrice: 138, unit: "1斤" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "ヨーグルト", category: "その他", price: 198, normalPrice: 248, unit: "4個パック" },
  { store: "ベイシア", storeArea: "群馬・埼玉周辺", itemName: "ピーマン", category: "野菜", price: 98, normalPrice: 128, unit: "4個" },

  // ---------- 業務スーパー ----------
  { store: "業務スーパー", itemName: "鶏むね肉", category: "肉", price: 298, normalPrice: 398, unit: "1kg" },
  { store: "業務スーパー", itemName: "冷凍ブロッコリー", category: "野菜", price: 198, normalPrice: 258, unit: "500g" },
  { store: "業務スーパー", itemName: "パスタ", category: "その他", price: 198, normalPrice: 258, unit: "1kg" },
  { store: "業務スーパー", itemName: "卵", category: "その他", price: 168, unit: "1パック(10個)" },
  { store: "業務スーパー", itemName: "豚バラ薄切り", category: "肉", price: 398, normalPrice: 498, unit: "300g" },
  { store: "業務スーパー", itemName: "冷凍うどん", category: "その他", price: 198, normalPrice: 258, unit: "5食" },
  { store: "業務スーパー", itemName: "サラダ油", category: "調味料", price: 398, unit: "1.5kg" },
  { store: "業務スーパー", itemName: "カット野菜ミックス", category: "野菜", price: 98, normalPrice: 128, unit: "1袋" },
  { store: "業務スーパー", itemName: "ウインナー", category: "肉", price: 498, normalPrice: 598, unit: "1kg" },
  { store: "業務スーパー", itemName: "唐揚げ", category: "惣菜", price: 348, normalPrice: 428, unit: "1パック" },
];

// 特売期間は常に「今週」になるよう実行時に計算する（ダミーデータが古びないように）
const VALID_FROM = startOfThisWeek().toISOString();
const VALID_TO = endOfThisWeek().toISOString();

export const DUMMY_CHIRASHI_ITEMS: ChirashiItem[] = RAW_ITEMS.map((r, i) => ({
  ...r,
  id: `c${i + 1}`,
  validFrom: VALID_FROM,
  validTo: VALID_TO,
  source: "dummy",
}));
