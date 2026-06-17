// PWA 用 manifest。Next.js の規約により /manifest.webmanifest として配信される。
// この設定で「ホーム画面に追加」したときフルスクリーン・アプリ風で起動する。
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI家計簿 v4",
    short_name: "AI家計簿",
    description:
      "一人暮らし大学生のための、AI伴走型家計簿。物価高時代の節約をAIがサポート。",
    start_url: "/",
    display: "standalone", // タブやアドレスバーを隠してアプリのように
    background_color: "#ffffff",
    theme_color: "#ffffff",
    orientation: "portrait",
    lang: "ja",
    icons: [
      {
        // SVG は解像度フリーで全サイズに対応するのでこれ1つでOK
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
