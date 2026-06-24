"use client";

// 音声入力ボタン。Web Speech API（SpeechRecognition）を使う。
// Chrome/Edge/Android Chrome 等が対象。未対応ブラウザでは何も描画しない。

import { useEffect, useRef, useState } from "react";
import {
  isVoiceInputSupported,
  parseVoiceInput,
} from "@/lib/voiceInput";
import type { Category } from "@/lib/types";

interface Props {
  // 認識成功時に呼ばれる（ExpenseForm のフォームに反映される）
  onResult: (amount: number, category: Category, memo: string) => void;
}

type Status = "idle" | "listening" | "success" | "error";

// SpeechRecognition は非標準なので最低限の型だけ宣言
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type Ctor = new () => SpeechRecognitionLike;

export function VoiceInput({ onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 親から渡される最新コールバックを参照
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // 初回のみ：対応判定 + 認識器のセットアップ
  useEffect(() => {
    if (!isVoiceInputSupported()) return;
    setSupported(true);

    const w = window as unknown as {
      SpeechRecognition?: Ctor;
      webkitSpeechRecognition?: Ctor;
    };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return;

    const rec = new Recognition();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      const parsed = parseVoiceInput(text);
      if (parsed) {
        onResultRef.current(parsed.amount, parsed.category, parsed.memo);
        setStatus("success");
        setHint(`「${text}」を入力したよ`);
      } else {
        setStatus("error");
        setHint("『コンビニで500円』のように話してみて");
      }
      scheduleClear();
    };

    rec.onerror = (e) => {
      setStatus("error");
      if (e.error === "not-allowed") {
        setHint("マイクの許可が必要です");
      } else if (e.error === "no-speech") {
        setHint("音声が検出できませんでした");
      } else {
        setHint("音声認識に失敗しました");
      }
      scheduleClear();
    };

    rec.onend = () => {
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  // ヒント表示を3秒で消す
  const scheduleClear = () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      setHint(null);
      setStatus("idle");
    }, 3000);
  };

  const start = () => {
    if (!supported || status === "listening") return;
    setHint(null);
    setStatus("listening");
    try {
      recRef.current?.start();
    } catch {
      setStatus("error");
      setHint("音声認識を開始できませんでした");
      scheduleClear();
    }
  };

  // 未対応ブラウザでは何も出さない（親側で grid を 1 列に倒す）
  if (!supported) return null;

  const label =
    status === "listening" ? (
      <span className="inline-flex items-center gap-1.5">
        <span className="animate-pulse">🎤</span> 聞いてる…
      </span>
    ) : (
      <>🎤 音声で入力</>
    );

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={status === "listening"}
        className={
          "w-full rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition active:scale-[0.98] " +
          (status === "listening"
            ? "border-accent bg-accent/10 text-accent"
            : "border-gray-200 bg-white text-gray-700 hover:border-accent hover:text-accent disabled:opacity-60")
        }
      >
        {label}
      </button>
      {hint && (
        <p
          className={
            "mt-2 text-center text-xs " +
            (status === "error" ? "text-danger" : "text-gray-500")
          }
        >
          {hint}
        </p>
      )}
    </div>
  );
}
