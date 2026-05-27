// 物価高ニュースのダミーデータと型定義。
// 将来的に NHK / Yahoo ニュース等の API に差し替え可能なように分離。

export type PriceCategory = "食材" | "光熱費" | "交通" | "日用品" | "その他";

export interface PriceNews {
  id: string;
  title: string;       // 「米価格高騰」など短いタイトル
  description: string; // 1〜2行の補足
  changeRate: number;  // 上昇率（%）。例: 12 → +12%
  category: PriceCategory;
  date: string;        // YYYY-MM-DD
}

// 現時点はモック。後で fetch に差し替える前提でデータ＋形を固定しておく。
export const DUMMY_PRICE_NEWS: PriceNews[] = [
  {
    id: "n1",
    title: "米の価格が高止まり",
    description: "新米時期まで価格は高い水準で推移する見通し。",
    changeRate: 18,
    category: "食材",
    date: "2026-05-21",
  },
  {
    id: "n2",
    title: "キャベツが値上がり",
    description: "天候不順の影響で葉物野菜の出荷が減少。",
    changeRate: 25,
    category: "食材",
    date: "2026-05-19",
  },
  {
    id: "n3",
    title: "電気代が上昇傾向",
    description: "燃料費調整額の引き上げで、夏場の負担増に注意。",
    changeRate: 8,
    category: "光熱費",
    date: "2026-05-18",
  },
  {
    id: "n4",
    title: "ガソリン価格が上昇",
    description: "原油高と円安の影響でレギュラー1L単価がじわり上昇。",
    changeRate: 5,
    category: "交通",
    date: "2026-05-15",
  },
  {
    id: "n5",
    title: "卵の価格が高水準継続",
    description: "鳥インフルエンザの影響が長引いており、入荷量も不安定。",
    changeRate: 15,
    category: "食材",
    date: "2026-05-12",
  },
];
