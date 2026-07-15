// 共通のカード見た目を作る薄いラッパーコンポーネント
import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;       // カード上部のタイトル（任意。文字列 or アイコン込みのJSX）
  children: ReactNode;     // カード内容
  className?: string;      // 追加のクラス
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <section
      className={
        "rounded-2xl border border-gray-200 bg-white p-4 shadow-sm " + className
      }
    >
      {title && (
        <h2 className="mb-3 text-sm font-semibold text-gray-700">{title}</h2>
      )}
      {children}
    </section>
  );
}
