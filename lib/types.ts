// アプリ全体で使う型を集めたファイル

// 支出のカテゴリ。例として6種類用意
export type Category =
  | "食費"
  | "外食"
  | "コンビニ"
  | "趣味"
  | "交通"
  | "その他";

// 全カテゴリの配列（UI のセレクトボックスで利用）
export const CATEGORIES: Category[] = [
  "食費",
  "外食",
  "コンビニ",
  "趣味",
  "交通",
  "その他",
];

// 1件の支出データ
export interface Expense {
  id: string;        // 一意な ID（削除時の特定用）
  amount: number;    // 金額（円）
  category: Category;// カテゴリ
  memo: string;      // メモ（任意）
  date: string;      // 日付（YYYY-MM-DD 形式の文字列）
}

// 所持金・収入の情報
export interface Assets {
  bank: number;   // 通帳残高
  cash: number;   // 財布の現金
  income: number; // 今月の収入
}

// ユーザーがカスタマイズできるクイック入力プリセット
// 表示はボタン上で `${icon} ${name}` として組み立てる
export interface QuickPreset {
  id: string;       // 一意な ID（編集・削除の特定用）
  icon: string;     // 単一の絵文字（例 "🍚"）
  name: string;     // 表示名（例 "自炊"）
  amount: number;   // 金額（円）
  category: Category;
  memo: string;     // 自動でメモ欄に入る文字（空可）
}
