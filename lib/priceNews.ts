// 物価高ニュースのデータ型 + フォールバック用のダミーデータ。
// 実データは /api/price-news 経由で Google News RSS から取得する。

export type PriceCategory = "食材" | "光熱費" | "交通" | "日用品" | "その他";

export interface PriceNews {
  id: string;
  title: string;            // ニュース見出し
  source?: string;          // 出典メディア名（NHK / 朝日新聞 など）
  link?: string;            // 元記事 URL（あれば外部リンクで開く）
  reason?: string;          // 「なぜ高くなる？」を要約した一行（タイトルから推定）
  category: PriceCategory;
  date: string;             // YYYY-MM-DD
  changeRate?: number;      // 上昇率（%）。RSS では取得できないので任意
}

// API から取得できなかった場合のフォールバック。
// reason フィールドを使って「背景」が伝わるようにしてある。
export const DUMMY_PRICE_NEWS: PriceNews[] = [
  {
    id: "n1",
    title: "米の価格、高止まりが継続",
    source: "サンプルニュース",
    reason: "新米までの端境期で在庫がタイトな状況",
    changeRate: 18,
    category: "食材",
    date: "2026-05-21",
  },
  {
    id: "n2",
    title: "キャベツが値上がり",
    source: "サンプルニュース",
    reason: "天候不順で葉物野菜の出荷が減少",
    changeRate: 25,
    category: "食材",
    date: "2026-05-19",
  },
  {
    id: "n3",
    title: "電気代が夏場に向けて上昇",
    source: "サンプルニュース",
    reason: "燃料費調整額の引き上げ",
    changeRate: 8,
    category: "光熱費",
    date: "2026-05-18",
  },
  {
    id: "n4",
    title: "ガソリン価格が3週連続値上がり",
    source: "サンプルニュース",
    reason: "原油高と円安の影響",
    changeRate: 5,
    category: "交通",
    date: "2026-05-15",
  },
  {
    id: "n5",
    title: "卵の価格が高水準で継続",
    source: "サンプルニュース",
    reason: "鳥インフルエンザの影響長期化",
    changeRate: 15,
    category: "食材",
    date: "2026-05-12",
  },
];
