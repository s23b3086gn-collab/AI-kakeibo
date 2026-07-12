// 「AIがチラシを検索して価格を予測する」機能のロジック（フェーズ3）。
//
// ⚠️ STATUS.md の禁止事項を厳守：
//   ・トクバイ/シュフー/イオン公式/ベイシア公式のスクレイピングは行わない
//   ・存在しない「チラシAPI」は呼ばない
//   ・Web検索由来のデータは必ず「要確認」ラベルを付ける（AI誤読リスク）
//   ・買い時判定の確実な根拠には使わない（画像解析を優先）
//
// 現状は API キー未登録のため **モック**。将来 Claude API の Web 検索へ差し替える際は
// searchChirashiByAI() の中身だけを /api/chirashi-search への fetch に置き換えればよい。

export interface AISearchItem {
  itemName: string;
  store: string;
  price: number;
  unit?: string;
  note: string;        // AI が付けた根拠コメント
  confidence: number;  // 0〜1（AI 推定の確からしさ）
}

export interface AISearchResult {
  query: string;
  found: boolean;
  items: AISearchItem[];
  summary: string;      // AI の予測まとめ
  disclaimer: string;   // 要確認の定型文
  searchedAt: string;   // ISO
}

// 要確認の定型文（全結果に必ず付与する）
const DISCLAIMER =
  "AIがWeb上の情報を検索・推定した結果です。誤読の可能性があるため、実際の店頭価格・チラシで必ずご確認ください。";

// モックの「AIが見つけた」データ。登録済みチラシ＋近隣店舗を想定した現実的な相場。
// key は検索語に含まれていれば一致とみなすキーワード。
const MOCK_DB: Record<
  string,
  { items: AISearchItem[]; summary: string }
> = {
  キャベツ: {
    items: [
      { itemName: "キャベツ", store: "イオン（千葉・津田沼）", price: 128, unit: "1玉", note: "登録チラシと一致。今週の最安", confidence: 0.9 },
      { itemName: "キャベツ", store: "ライフ", price: 138, unit: "1玉", note: "近隣店舗の特売（AI推定）", confidence: 0.74 },
      { itemName: "キャベツ", store: "マルエツ", price: 148, unit: "1玉", note: "通常より安め（AI推定）", confidence: 0.68 },
    ],
    summary:
      "『キャベツ』は今週イオン(千葉)の¥128/玉が最安。旬で入荷が増えており、来週はさらに下がる可能性があります。",
  },
  鶏むね肉: {
    items: [
      { itemName: "鶏むね肉", store: "イオン（千葉・津田沼）", price: 58, unit: "100g", note: "登録チラシと一致。100gあたり最安", confidence: 0.9 },
      { itemName: "鶏むね肉", store: "業務スーパー", price: 298, unit: "1kg", note: "まとめ買いなら割安（100gあたり約¥30）", confidence: 0.82 },
      { itemName: "鶏むね肉", store: "ドン・キホーテ", price: 65, unit: "100g", note: "近隣店舗の特売（AI推定）", confidence: 0.7 },
    ],
    summary:
      "『鶏むね肉』は100gあたりイオン¥58が最安。まとめ買いなら業務スーパーの1kg¥298がお得です。需給安定で当面は買い時が続く見込み。",
  },
  卵: {
    items: [
      { itemName: "卵", store: "業務スーパー", price: 168, unit: "1パック(10個)", note: "今週の最安（AI推定）", confidence: 0.8 },
      { itemName: "卵", store: "ベイシア", price: 178, unit: "1パック(10個)", note: "登録チラシと一致", confidence: 0.85 },
      { itemName: "卵", store: "ライフ", price: 188, unit: "1パック(10個)", note: "近隣店舗（AI推定）", confidence: 0.7 },
    ],
    summary:
      "『卵』は業務スーパーの¥168が最安。鳥インフルの影響で相場は高止まり、当面は横ばい〜微増の予測です。",
  },
  トマト: {
    items: [
      { itemName: "トマト", store: "ベイシア", price: 198, unit: "4個", note: "登録チラシと一致。旬で下落中", confidence: 0.85 },
      { itemName: "トマト", store: "ライフ", price: 228, unit: "4個", note: "近隣店舗（AI推定）", confidence: 0.7 },
    ],
    summary:
      "『トマト』は夏野菜の旬入りで下落傾向。ベイシアの¥198/4個が狙い目です。",
  },
  米: {
    items: [
      { itemName: "米", store: "業務スーパー", price: 3180, unit: "5kg", note: "今週の最安（AI推定）", confidence: 0.78 },
      { itemName: "米", store: "イオン（千葉・津田沼）", price: 3350, unit: "5kg", note: "登録チラシと一致", confidence: 0.75 },
    ],
    summary:
      "『米』は新米まで価格が高止まりの見込み。当面は大きく下がりにくい相場です。",
  },
};

// 検索候補チップ（UI で提示する）
export const SEARCH_SUGGESTIONS = ["キャベツ", "鶏むね肉", "卵", "トマト", "米"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();
    window.setTimeout(resolve, ms);
  });
}

// クエリに含まれる既知キーワードを探す
function matchKey(query: string): string | null {
  const q = query.trim();
  for (const key of Object.keys(MOCK_DB)) {
    if (q.includes(key)) return key;
  }
  return null;
}

export async function searchChirashiByAI(query: string): Promise<AISearchResult> {
  // TODO(API差し替え): 将来ここを実検索に置き換える。
  //   const r = await fetch("/api/chirashi-search", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ query }),
  //   });
  //   return (await r.json()) as AISearchResult;
  // 現状は API キー未登録のためモック（検索している感を出すため少し待つ）。
  await delay(1400);

  const searchedAt = new Date().toISOString();
  const key = matchKey(query);

  if (!key) {
    return {
      query,
      found: false,
      items: [],
      summary:
        "該当する特売情報が見つかりませんでした。食材名（例：キャベツ、鶏むね肉、卵）で試してみてください。",
      disclaimer: DISCLAIMER,
      searchedAt,
    };
  }

  const hit = MOCK_DB[key];
  return {
    query,
    found: true,
    // 価格が安い順に並べる
    items: [...hit.items].sort((a, b) => a.price - b.price),
    summary: hit.summary,
    disclaimer: DISCLAIMER,
    searchedAt,
  };
}

// ===== お店で探す（AIがその店のチラシを持ってくる） =====

// 検索欄に出す店舗チップ（label=表示名、name=結果に使う正式名）
export const SEARCH_STORES: { label: string; name: string }[] = [
  { label: "イオン", name: "イオン（千葉・津田沼）" },
  { label: "ベイシア", name: "ベイシア" },
  { label: "業務スーパー", name: "業務スーパー" },
  { label: "ライフ", name: "ライフ" },
  { label: "マルエツ", name: "マルエツ" },
  { label: "ドンキ", name: "ドン・キホーテ" },
];

// 店舗ごとの「AIが持ってきたチラシ」モック。品目は現実的な相場で手置き。
const STORE_DB: Record<
  string,
  { items: Omit<AISearchItem, "store">[]; conf: number }
> = {
  イオン: {
    conf: 0.9,
    items: [
      { itemName: "キャベツ", price: 128, unit: "1玉", note: "今週の特売", confidence: 0.9 },
      { itemName: "鶏むね肉", price: 58, unit: "100g", note: "100gあたり最安", confidence: 0.9 },
      { itemName: "豚バラ肉", price: 128, unit: "100g", note: "今週の特売", confidence: 0.88 },
      { itemName: "卵", price: 198, unit: "1パック(10個)", note: "高止まり中", confidence: 0.85 },
      { itemName: "サバ切身", price: 258, unit: "1パック", note: "鮮魚特売", confidence: 0.82 },
    ],
  },
  ベイシア: {
    conf: 0.9,
    items: [
      { itemName: "トマト", price: 198, unit: "4個", note: "旬で下落中", confidence: 0.88 },
      { itemName: "鶏もも肉", price: 68, unit: "100g", note: "今週の特売", confidence: 0.88 },
      { itemName: "卵", price: 178, unit: "1パック(10個)", note: "近隣より安め", confidence: 0.85 },
      { itemName: "じゃがいも", price: 198, unit: "5個", note: "まとめ買い向き", confidence: 0.8 },
      { itemName: "鮭切身", price: 398, unit: "3切", note: "鮮魚特売", confidence: 0.78 },
    ],
  },
  業務スーパー: {
    conf: 0.88,
    items: [
      { itemName: "鶏むね肉", price: 298, unit: "1kg", note: "まとめ買いが割安", confidence: 0.85 },
      { itemName: "卵", price: 168, unit: "1パック(10個)", note: "今週の最安級", confidence: 0.85 },
      { itemName: "パスタ", price: 198, unit: "1kg", note: "常備向き特価", confidence: 0.8 },
      { itemName: "冷凍うどん", price: 198, unit: "5食", note: "冷凍麺特価", confidence: 0.78 },
      { itemName: "唐揚げ", price: 348, unit: "1パック", note: "惣菜特売", confidence: 0.72 },
    ],
  },
  ライフ: {
    conf: 0.76,
    items: [
      { itemName: "キャベツ", price: 138, unit: "1玉", note: "近隣店舗の特売（AI推定）", confidence: 0.74 },
      { itemName: "豚こま肉", price: 108, unit: "100g", note: "今週の特売（AI推定）", confidence: 0.74 },
      { itemName: "鮭切身", price: 380, unit: "3切", note: "鮮魚特売（AI推定）", confidence: 0.7 },
      { itemName: "木綿豆腐", price: 58, unit: "1丁", note: "日配特価（AI推定）", confidence: 0.72 },
      { itemName: "トマト", price: 258, unit: "4個", note: "青果特売（AI推定）", confidence: 0.68 },
    ],
  },
  マルエツ: {
    conf: 0.74,
    items: [
      { itemName: "鶏もも肉", price: 78, unit: "100g", note: "今週の特売（AI推定）", confidence: 0.72 },
      { itemName: "レタス", price: 158, unit: "1玉", note: "青果特売（AI推定）", confidence: 0.7 },
      { itemName: "卵", price: 198, unit: "1パック(10個)", note: "日配特価（AI推定）", confidence: 0.72 },
      { itemName: "食パン", price: 108, unit: "1斤", note: "ベーカリー特価（AI推定）", confidence: 0.7 },
      { itemName: "バナナ", price: 138, unit: "1房", note: "青果特売（AI推定）", confidence: 0.68 },
    ],
  },
  ドンキ: {
    conf: 0.72,
    items: [
      { itemName: "鶏むね肉", price: 62, unit: "100g", note: "近隣店舗の特売（AI推定）", confidence: 0.7 },
      { itemName: "もやし", price: 29, unit: "1袋", note: "激安特価（AI推定）", confidence: 0.72 },
      { itemName: "冷凍餃子", price: 218, unit: "1袋", note: "冷凍特価（AI推定）", confidence: 0.68 },
      { itemName: "牛乳", price: 188, unit: "1L", note: "日配特価（AI推定）", confidence: 0.7 },
      { itemName: "カットわかめ", price: 158, unit: "1袋", note: "乾物特価（AI推定）", confidence: 0.66 },
    ],
  },
};

export async function searchChirashiByStore(
  label: string,
): Promise<AISearchResult> {
  // TODO(API差し替え): 将来ここを実検索（店舗名でチラシを探す）に置き換える。
  // 現状は API キー未登録のためモック。
  await delay(1400);

  const searchedAt = new Date().toISOString();
  const meta = SEARCH_STORES.find((s) => s.label === label);
  const db = STORE_DB[label];

  if (!meta || !db) {
    return {
      query: `${label}のチラシ`,
      found: false,
      items: [],
      summary: "この店舗のチラシは見つかりませんでした。",
      disclaimer: DISCLAIMER,
      searchedAt,
    };
  }

  const items: AISearchItem[] = db.items
    .map((it) => ({ ...it, store: meta.name }))
    .sort((a, b) => a.price - b.price);

  const cheapest = items[0];
  return {
    query: `${label}のチラシ`,
    found: true,
    items,
    summary: `${meta.name}のチラシを持ってきました。今週の特売は${items.length}品目、最安は${cheapest.itemName}¥${cheapest.price}${
      cheapest.unit ? `/${cheapest.unit}` : ""
    }です。`,
    disclaimer: DISCLAIMER,
    searchedAt,
  };
}
