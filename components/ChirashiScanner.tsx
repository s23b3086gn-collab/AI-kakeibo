"use client";

// 📷 チラシ読み取り。タップ → カメラ/ギャラリーで画像選択 → /api/chirashi-scan で解析 →
// 抽出した特売品目を ChirashiItem（source: "flyer_image"）として親に渡す。
//
// ReceiptScanner と同じ方針：モバイル写真は数MBになるため、送信前に
// 1600px / JPEG 85% に圧縮して Vercel のボディサイズ上限を回避する。
// 現状 /api/chirashi-scan はモック。将来 Claude Vision API に差し替え可能。

import { useEffect, useRef, useState } from "react";
import {
  type ChirashiCategory,
  type ChirashiItem,
} from "@/lib/chirashiData";
import { startOfThisWeek, endOfThisWeek } from "@/lib/date";

interface Props {
  // 読み取った特売品目を受け取って親の state に追加する
  onScan: (items: ChirashiItem[]) => void;
  // これまでに読み取り済みの件数（クリアボタン表示用）
  scannedCount: number;
  onClear: () => void;
}

type Status = "idle" | "loading" | "error";

// API から返る 1 品目
interface ScanItem {
  itemName: string;
  category: ChirashiCategory;
  price: number;
  unit?: string;
  store: string;
}

const MAX_IMAGE_DIM = 1600;
const JPEG_QUALITY = 0.85;

export function ChirashiScanner({ onScan, scannedCount, onClear }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [lastCount, setLastCount] = useState(0);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const showError = () => {
    setStatus("error");
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setStatus("idle"), 3000);
  };

  const openPicker = () => {
    if (status === "loading") return;
    fileInputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setStatus("loading");
    setLastCount(0);

    try {
      const { base64, mimeType } = await resizeAndEncode(file);

      const res = await fetch("/api/chirashi-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!res.ok) {
        showError();
        return;
      }

      const data = (await res.json()) as { items?: ScanItem[] };
      const items = Array.isArray(data.items) ? data.items : [];

      if (items.length === 0) {
        showError();
        return;
      }

      // ScanItem → ChirashiItem（今週有効・source: flyer_image）に変換
      const validFrom = startOfThisWeek().toISOString();
      const validTo = endOfThisWeek().toISOString();
      const chirashiItems: ChirashiItem[] = items.map((it, i) => ({
        id: `scan_${Date.now().toString(36)}_${i}`,
        store: it.store,
        itemName: it.itemName,
        category: it.category,
        price: it.price,
        unit: it.unit,
        validFrom,
        validTo,
        source: "flyer_image",
      }));

      onScan(chirashiItems);
      setLastCount(chirashiItems.length);
      setStatus("idle");
    } catch (err) {
      console.error("[ChirashiScanner] failed:", err);
      showError();
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-gray-700">
        📷 チラシを読み取る
      </h2>
      <p className="mb-2 text-[11px] text-gray-500">
        チラシを撮影すると、AIが特売品目を読み取って一覧に追加します
      </p>

      <button
        type="button"
        onClick={openPicker}
        disabled={status === "loading"}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
      >
        {status === "loading" ? (
          <span className="inline-flex items-center gap-2">
            <Spinner />
            チラシを解析中...
          </span>
        ) : (
          <>📷 チラシを撮影して読み取る</>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />

      {status === "error" && (
        <p className="mt-2 text-center text-xs text-danger">
          読み取りに失敗しました。もう一度お試しください
        </p>
      )}

      {status === "idle" && lastCount > 0 && (
        <p className="mt-2 text-center text-xs font-semibold text-accent">
          ✓ {lastCount}件の特売を追加しました
        </p>
      )}

      {scannedCount > 0 && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
          <span>読み取り済みの特売：{scannedCount}件</span>
          <button
            type="button"
            onClick={onClear}
            className="font-semibold text-gray-400 hover:text-danger"
          >
            クリア
          </button>
        </div>
      )}
    </section>
  );
}

// ---- ローカルヘルパー（ReceiptScanner と同じ実装） ----

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

async function resizeAndEncode(
  file: File,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
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
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("failed to load image"));
    img.src = src;
  });
}
