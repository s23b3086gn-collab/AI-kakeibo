"use client";

// 6タブのボトムナビ。/ と /connect で共有する。
//
// 動作モード：
//   1) `/` で使う場合 → `onSelectInPageTab` を渡す。home/record/report/price/chirashi は
//      コールバックで in-page タブ切替（高速）。連携は /connect へ Link 遷移。
//   2) `/connect` で使う場合 → コールバック未渡し。home/record/report/price/chirashi は
//      Link で `/` へ戻る（その後ホーム表示）。連携は現在地。

import Link from "next/link";

// ホーム画面の in-page タブ ID（既存仕様と同じ）
export type TabId = "home" | "record" | "report" | "price" | "chirashi";

// ボトムナビ全体での「現在地」識別子
export type ActiveId = TabId | "connect";

const TABS: { id: ActiveId; label: string; icon: string }[] = [
  { id: "home",     label: "ホーム",   icon: "/icons/home.png" },
  { id: "record",   label: "記録",     icon: "/icons/record.png" },
  { id: "report",   label: "レポート", icon: "/icons/report.png" },
  { id: "price",    label: "物価",     icon: "/icons/price.png" },
  { id: "chirashi", label: "チラシ",   icon: "/icons/chirashi.png" },
  { id: "connect",  label: "連携",     icon: "/icons/connect.png" },
];

interface Props {
  activeId: ActiveId;
  // 同ページ内タブ切替コールバック。/ から呼ぶ場合のみ指定する
  onSelectInPageTab?: (tab: TabId) => void;
}

export function BottomNav({ activeId, onSelectInPageTab }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white"
      // iPhone のホームインジケータ領域（safe area）ぶんパディングを足す
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主要ナビゲーション"
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = activeId === tab.id;
          const className =
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition " +
            (isActive ? "text-accent" : "text-gray-400 hover:text-gray-600");

          // === 連携タブは常に /connect への Link ===
          if (tab.id === "connect") {
            return (
              <Link
                key={tab.id}
                href="/connect"
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                <Icon src={tab.icon} active={isActive} />
                <span>{tab.label}</span>
              </Link>
            );
          }

          // === in-page タブ（home/record/report/price） ===
          // / 上：コールバックで切替
          if (onSelectInPageTab) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectInPageTab(tab.id as TabId)}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                <Icon src={tab.icon} active={isActive} />
                <span>{tab.label}</span>
              </button>
            );
          }

          // /connect 上：/ に戻る Link（ホーム表示）
          return (
            <Link
              key={tab.id}
              href="/"
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              <Icon src={tab.icon} active={isActive} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// アイコン部分の共通レンダリング（タブ名と対応するPNGアイコン）
// PNGをCSS maskの型として使い、背景色で塗る → 非選択=グレー／選択=文字と同じ緑
function Icon({ src, active }: { src: string; active: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "inline-block h-[22px] w-[22px] transition-colors duration-150 " +
        (active ? "bg-accent" : "bg-gray-400")
      }
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
