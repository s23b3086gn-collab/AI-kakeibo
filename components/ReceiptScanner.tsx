"use client";

// レシート読み取りボタン。タップ → カメラ/ギャラリーから画像選択 →
// Claude API で解析 → 親（ExpenseForm）に値を渡す。
//
// モバイル写真は数MBになるため、送信前にクライアント側で
// 1600px / JPEG 85% に圧縮して Vercel のボディサイズ上限を回避する。

import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/types";

interface Props {
  // 解析結果を受け取って ExpenseForm の state にセットする
  onResult: (amount: number, category: Category, memo: string) => void;
}

type Status = "idle" | "loading" | "error";

// 画像長辺の最大ピクセル。Anthropic 推奨上限以内かつ通信量を抑える
const MAX_IMAGE_DIM = 1600;
// JPEG 品質（0〜1）
const JPEG_QUALITY = 0.85;

export function ReceiptScanner({ onResult }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  // setTimeout の ID を保持してクリーンアップ可能にする
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // アンマウント時にタイマーを掃除（メモリリーク防止）
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  // 「読み取りに失敗しました」を3秒間だけ表示
  const showError = () => {
    setStatus("error");
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
  };

  // 隠した input をプログラム経由で開く
  const openPicker = () => {
    if (status === "loading") return;
    fileInputRef.current?.click();
  };

  // 画像が選ばれたあとの処理本体
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 次回また同じ画像を選べるよう input の value を即リセット
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setStatus("loading");

    try {
      // 圧縮して base64 化（常に image/jpeg になる）
      const { base64, mimeType } = await resizeAndEncode(file);

      const res = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!res.ok) {
        showError();
        return;
      }

      const data = (await res.json()) as {
        amount: number;
        category: Category;
        memo: string;
      };

      // API が fallback（amount=0）を返してきたら「読み取れなかった」扱い
      if (!data.amount || data.amount <= 0) {
        showError();
        return;
      }

      onResult(data.amount, data.category, data.memo);
      setStatus("idle");
    } catch (err) {
      console.error("[ReceiptScanner] failed:", err);
      showError();
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openPicker}
        disabled={status === "loading"}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            読み取り中...
          </span>
        ) : (
          <>📷 レシートを読み取る</>
        )}
      </button>

      {/* 実体の input は隠して、ボタンから click() で開く */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        // モバイルではアウトカメラを優先（背面カメラで撮影）
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {status === "error" && (
        <p className="mt-2 text-center text-xs text-danger">
          読み取りに失敗しました
        </p>
      )}
    </div>
  );
}

// ---- ローカルヘルパー ----

// くるくる回る簡易スピナー（svg）
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

// File を <canvas> でリサイズして JPEG / base64 として返す
async function resizeAndEncode(
  file: File,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    // 長辺が MAX_IMAGE_DIM を超えていれば縮小、超えていなければそのまま
    const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas context not available");
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base64 = dataUrl.split(",")[1] ?? "";
    return { base64, mimeType: "image/jpeg" };
  } finally {
    // メモリ解放
    URL.revokeObjectURL(objectUrl);
  }
}

// <img> を Promise でラップ
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}
