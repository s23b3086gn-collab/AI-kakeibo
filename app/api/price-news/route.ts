// 物価高ニュース取得 API。
// Google News RSS から日本語ニュースを引いてきて、タイトル・出典・推定理由を
// PriceNews 形式に変換して返す。サーバー側で 30 分キャッシュする。
//
// 完全に失敗したら空配列を返す（クライアント側でフォールバックの DUMMY を使う）。

import { NextResponse } from "next/server";
import type { PriceCategory, PriceNews } from "@/lib/priceNews";

export const runtime = "nodejs";
export const revalidate = 1800; // 30分キャッシュ

// 取得するクエリの一覧（多すぎるとレート制限に当たるので絞る）
const QUERIES = [
  "値上げ 食品",
  "電気代 ガス代",
  "ガソリン 価格",
];

// 1クエリ最大何件取るか（多すぎないように制限）
const MAX_PER_QUERY = 4;
// 最終的に返す件数の上限
const MAX_TOTAL = 8;

export async function GET() {
  try {
    // 各クエリを並列 fetch（失敗したものは空配列に倒す）
    const settled = await Promise.allSettled(
      QUERIES.map((q) => fetchRss(q)),
    );

    const all = settled
      .filter(
        (r): r is PromiseFulfilledResult<PriceNews[]> => r.status === "fulfilled",
      )
      .flatMap((r) => r.value);

    if (all.length === 0) {
      return NextResponse.json([]);
    }

    // タイトルが重複したものを除外（先勝ち）
    const seen = new Set<string>();
    const unique = all.filter((n) => {
      const key = n.title.slice(0, 30); // タイトル先頭30文字でラフに重複判定
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 日付の新しい順に
    unique.sort((a, b) => (a.date < b.date ? 1 : -1));

    return NextResponse.json(unique.slice(0, MAX_TOTAL));
  } catch (error) {
    console.error("[/api/price-news] error:", error);
    return NextResponse.json([]);
  }
}

// クエリ1つを fetch → パース → PriceNews[] に変換
async function fetchRss(query: string): Promise<PriceNews[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ja&gl=JP&ceid=JP:ja`;

  const res = await fetch(url, {
    next: { revalidate: 1800 },
    headers: {
      // 一部の RSS リーダー検出を回避するため通常のブラウザ UA を渡す
      "User-Agent":
        "Mozilla/5.0 (compatible; AI-kakeibo/1.0; +https://example.com)",
    },
  });

  if (!res.ok) return [];

  const xml = await res.text();
  const items = parseRssItems(xml).slice(0, MAX_PER_QUERY);
  return items.map((it, idx) => toPriceNews(it, `${query}-${idx}`));
}

// ----- RSS XML パース -----

interface RawItem {
  title: string;
  link: string;
  pubDate: string;
  source?: string;
}

// 簡易的な正規表現ベース XML パース。
// Google News RSS は構造が安定しているので実用上問題ない。
function parseRssItems(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const blocks = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of blocks) {
    const block = m[1];
    const title = extractTag(block, "title");
    if (!title) continue;
    items.push({
      title: decodeHtml(title),
      link: extractTag(block, "link"),
      pubDate: extractTag(block, "pubDate"),
      source: extractSourceTag(block),
    });
  }
  return items;
}

// `<tag>…</tag>` から中身を取り出す（CDATA も剥がす）
function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  const m = block.match(re);
  if (!m) return "";
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "") // 残った HTML タグを除去
    .trim();
}

// `<source url="...">朝日新聞</source>` の中身
function extractSourceTag(block: string): string | undefined {
  const m = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  if (!m) return undefined;
  return decodeHtml(m[1].trim());
}

// HTML エンティティの最低限デコード
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ----- 変換: RawItem → PriceNews -----

function toPriceNews(raw: RawItem, idBase: string): PriceNews {
  // Google News のタイトルは "本文 - 出典名" となっていることが多いので分離
  const { title, source } = splitTitleSource(raw.title, raw.source);

  return {
    id: `news-${idBase}`,
    title,
    source,
    link: raw.link || undefined,
    reason: inferReason(raw.title),
    category: inferCategory(raw.title),
    date: toDateStr(raw.pubDate),
  };
}

// タイトル末尾の "- 出典" を分離。<source> タグが取れていればそちらを優先。
function splitTitleSource(
  rawTitle: string,
  rawSource: string | undefined,
): { title: string; source?: string } {
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx > 0) {
    return {
      title: rawTitle.slice(0, idx).trim(),
      source: rawSource || rawTitle.slice(idx + 3).trim(),
    };
  }
  return { title: rawTitle.trim(), source: rawSource };
}

// タイトルからキーワードを拾って「なぜ高くなる？」を一行で要約する。
// マッチしないときは undefined（UIで表示されない）。
function inferReason(title: string): string | undefined {
  const patterns: Array<[RegExp, string]> = [
    [/鳥インフル/, "鳥インフルエンザの流行による供給減"],
    [/原油|オイル価格/, "原油価格の上昇"],
    [/円安/, "円安による輸入コストの上昇"],
    [/天候不順|猛暑|寒波|台風|大雨|不作|冷夏/, "天候不順による収量減"],
    [/燃料費|燃料調整/, "燃料費の上昇"],
    [/物流|運送|輸送/, "物流コストの上昇"],
    [/賃上げ|人件費/, "人件費の上昇"],
    [/減反|出荷|供給不足|品薄/, "供給不足"],
    [/需要増|需要拡大|インバウンド/, "需要増加"],
    [/補助金|終了|打ち切り/, "補助金の終了・縮小"],
    [/円高/, "円高（参考）"],
  ];
  for (const [re, reason] of patterns) {
    if (re.test(title)) return reason;
  }
  return undefined;
}

// タイトルからカテゴリを推定
function inferCategory(title: string): PriceCategory {
  if (/電気代|電力|ガス|光熱/.test(title)) return "光熱費";
  if (/ガソリン|軽油|交通|電車|タクシー|バス料金/.test(title)) return "交通";
  if (
    /食品|食材|野菜|果物|肉|魚|米|卵|牛乳|乳製品|パン|油|小麦|外食/.test(title)
  )
    return "食材";
  if (/日用品|生活|洗剤|ティッシュ|紙製品|衣料/.test(title)) return "日用品";
  return "その他";
}

// pubDate (RFC822) → YYYY-MM-DD
function toDateStr(pubDate: string): string {
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
