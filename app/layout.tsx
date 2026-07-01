// アプリ全体のレイアウト（App Router のルート）
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";
import { ReminderTimer } from "@/components/ReminderTimer";

// タブやSNSでの表示メタ情報
export const metadata: Metadata = {
  title: "AI家計簿 v6",
  description:
    "一人暮らし大学生のための、AI伴走型家計簿。物価高時代の節約をAIがサポート。",
  applicationName: "AI家計簿",
  // iOS Safari でホーム画面追加したときフルスクリーン化させるための設定
  appleWebApp: {
    capable: true,
    title: "AI家計簿",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

// スマホでの初期表示を最適化。viewportFit: cover で iPhone のノッチ対応
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-gray-900">
        {/* Service Worker 登録 + リマインダータイマー（不可視のクライアント部品） */}
        <SwRegister />
        <ReminderTimer />
        {children}
      </body>
    </html>
  );
}
