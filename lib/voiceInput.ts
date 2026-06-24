// 音声入力テキストを解析して Expense フィールドに変換するロジック。
// 「コンビニで500円」「ランチで1200円使った」のような発話を想定。

import type { Category } from "./types";

export interface VoiceParseResult {
  amount: number;
  category: Category;
  memo: string;
  rawText: string;
}

// 「コンビニで500円」「外食で1200円」のような発話を解釈
export function parseVoiceInput(text: string): VoiceParseResult | null {
  if (!text) return null;

  // 全角数字を半角に変換してから数字を抽出
  const normalized = text.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0),
  );
  const amountMatch = normalized.match(/(\d+)\s*円?/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1], 10);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  // キーワードでカテゴリ + メモを推定
  let category: Category = "その他";
  let memo = "";

  if (/コンビニ|セブン|ローソン|ファミマ|ファミリーマート|ミニストップ/.test(text)) {
    category = "コンビニ";
    memo = "コンビニ";
  } else if (/カフェ|スタバ|スターバックス|ドトール|タリーズ|コーヒー|喫茶/.test(text)) {
    category = "外食";
    memo = "カフェ";
  } else if (
    /ランチ|夕食|昼食|朝食|ディナー|外食|定食|レストラン|居酒屋|ラーメン|寿司|焼肉|ピザ|ハンバーガー|牛丼|そば|うどん/.test(text)
  ) {
    category = "外食";
    memo = "外食";
  } else if (/スーパー|八百屋|肉屋|魚屋|食料品|業務スーパー/.test(text)) {
    category = "食費";
    memo = "スーパー";
  } else if (/自炊|食材|食費/.test(text)) {
    category = "食費";
    memo = "自炊";
  } else if (
    /電車|地下鉄|バス|タクシー|交通|新幹線|JR|ガソリン|定期/.test(text)
  ) {
    category = "交通";
    memo = "";
  } else if (/本|書籍|ゲーム|映画|漫画|趣味|ライブ|コンサート/.test(text)) {
    category = "趣味";
    memo = "";
  }

  return { amount, category, memo, rawText: text };
}

// SpeechRecognition が使えるブラウザかチェック（Chrome / Edge / Android Chrome）
export function isVoiceInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}
