// 電子マネー連携のダミーデータ。
// 本物の API 連携に差し替える際は、SERVICES と DUMMY_TRANSACTIONS の
// 形を保ったまま fetcher を入れ替えれば良いように設計。

import type { Category } from "./types";

// ----- サービス定義 -----

export type ServiceId = "suica" | "paypay" | "rakuten";

export interface Service {
  id: ServiceId;
  name: string;
  icon: string;
  // タグ用の Tailwind カラー（カードの色味アクセント）
  badgeClass: string;
}

export const SERVICES: Service[] = [
  {
    id: "suica",
    name: "Suica",
    icon: "🚆",
    badgeClass: "bg-green-50 text-green-700 border-green-200",
  },
  {
    id: "paypay",
    name: "PayPay",
    icon: "💰",
    badgeClass: "bg-red-50 text-red-700 border-red-200",
  },
  {
    id: "rakuten",
    name: "楽天Pay",
    icon: "🛍️",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
  },
];

// ----- ダミートランザクション -----

export type RelativeDate = "今日" | "昨日" | "2日前";

export interface LinkageTransaction {
  id: number;
  serviceId: ServiceId;
  serviceName: string; // 表示用（"Suica", "PayPay", "楽天Pay"）
  amount: number;
  label: string;       // 表示用ラベル（"コンビニ", "スーパー" など）
  category: Category;  // 記録時に使われる正規カテゴリ
  relativeDate: RelativeDate;
}

export const DUMMY_TRANSACTIONS: LinkageTransaction[] = [
  { id: 1, serviceId: "suica",   serviceName: "Suica",   amount: 480,  label: "コンビニ", category: "コンビニ", relativeDate: "今日" },
  { id: 2, serviceId: "paypay",  serviceName: "PayPay",  amount: 1200, label: "スーパー", category: "食費",     relativeDate: "昨日" },
  { id: 3, serviceId: "rakuten", serviceName: "楽天Pay", amount: 350,  label: "カフェ",   category: "外食",     relativeDate: "今日" },
  { id: 4, serviceId: "suica",   serviceName: "Suica",   amount: 220,  label: "電車",     category: "交通",     relativeDate: "今日" },
  { id: 5, serviceId: "paypay",  serviceName: "PayPay",  amount: 980,  label: "ランチ",   category: "外食",     relativeDate: "2日前" },
  { id: 6, serviceId: "suica",   serviceName: "Suica",   amount: 600,  label: "コンビニ", category: "コンビニ", relativeDate: "昨日" },
];

// "今日" / "昨日" / "2日前" を YYYY-MM-DD に変換（記録時に使う）
export function resolveRelativeDate(relative: RelativeDate): string {
  const d = new Date();
  if (relative === "昨日") d.setDate(d.getDate() - 1);
  else if (relative === "2日前") d.setDate(d.getDate() - 2);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
