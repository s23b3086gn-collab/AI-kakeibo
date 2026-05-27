import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 白基調・ミニマルのカラーパレット
        bg: "#ffffff",     // ページ背景（完全な白）
        card: "#ffffff",   // カード背景（白）
        border: "#e5e7eb", // ボーダー（gray-200）
        accent: "#16a34a", // 余裕あり（緑、白背景でも視認性◎）
        warn: "#d97706",   // 注意（オレンジ）
        danger: "#dc2626", // 危険（赤）
      },
    },
  },
  plugins: [],
};
export default config;
