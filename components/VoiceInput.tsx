"use client";

// 音声入力ボタン。Web Speech API（SpeechRecognition）を使う。
// Chrome/Edge/Android Chrome + iOS Safari(14.5+) が対象。
//
// 【iOS Safari 対応の重要ポイント】
//   ・SpeechRecognition インスタンスは事前に作らず、ユーザーがボタンを
//     タップした「その瞬間」に生成する。これが iOS のユーザー操作要件に必要。
//   ・エラー時は原因コードを画面に出して、権限/HTTPS/ネットワークなどの
//     どこで詰まっているか切り分けやすくする。

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

// SpeechRecognition の最低限のインタフェース（型定義が標準に無いため自前で）
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  abort(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type Ctor = new () => SpeechRecognitionLike;

export function VoiceInput({ onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [hint, setHint] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const currentRecRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 親から渡される最新コールバックを ref で追跡
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  // マウント後に対応判定
  useEffect(() => {
    setSupported(isVoiceInputSupported());
  }, []);

  // 進行中の認識セッションをクリーンアップ（アンマウント時）
  useEffect(() => {
    return () => {
      if (currentRecRef.current) {
        try {
          currentRecRef.current.abort();
        } catch {
          /* noop */
        }
      }
    };
  }, []);

  // ヒント表示を数秒で消す
  const scheduleClear = () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => {
      setHint(null);
      setStatus("idle");
    }, 4000);
  };

  // ★ボタンクリックで SpeechRecognition を「その場で」生成 → start する
  // iOS Safari はユーザー操作の同一 event loop で instantiate が必要なため
  const start = () => {
    if (status === "listening") return;

    const w = window as unknown as {
      SpeechRecognition?: Ctor;
      webkitSpeechRecognition?: Ctor;
    };
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      setStatus("error");
      setHint("このブラウザは音声認識に対応していません");
      scheduleClear();
      return;
    }

    // 前セッションが残っていれば中断
    if (currentRecRef.current) {
      try {
        currentRecRef.current.abort();
      } catch {
        /* noop */
      }
    }

    const rec: SpeechRecognitionLike = new Recognition();
    rec.lang = "ja-JP";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      const parsed = parseVoiceInput(text);
      if (parsed) {
        onResultRef.current(parsed.amount, parsed.category, parsed.memo);
        setStatus("success");
        setHint(`「${text}」を入力したよ`);
      } else if (text) {
        // 聞き取れたが金額が抽出できなかった場合、聞き取り内容を出してヒント
        setStatus("error");
        setHint(`「${text}」— 金額が読み取れませんでした。「〜円」を含めて話してね`);
      } else {
        setStatus("error");
        setHint("『コンビニで500円』のように話してみて");
      }
      scheduleClear();
    };

    rec.onerror = (e) => {
      setStatus("error");
      const errCode = e?.error ?? "unknown";
      if (errCode === "not-allowed" || errCode === "service-not-allowed") {
        setHint("マイクの許可が必要です。ブラウザ設定を確認して");
      } else if (errCode === "no-speech") {
        setHint("音声が検出できませんでした。もう一度話してみて");
      } else if (errCode === "network") {
        setHint("ネットワーク接続を確認してください");
      } else if (errCode === "audio-capture") {
        setHint("マイクにアクセスできません");
      } else if (errCode === "aborted") {
        // 中断は静かに閉じる（エラー表示しない）
        setStatus("idle");
        setHint(null);
        return;
      } else {
        setHint(`音声認識に失敗（${errCode}）`);
      }
      scheduleClear();
    };

    rec.onend = () => {
      // まだ「listening」のままなら idle に戻す（結果もエラーも無く終わった）
      setStatus((s) => (s === "listening" ? "idle" : s));
    };

    currentRecRef.current = rec;
    setHint(null);
    setStatus("listening");

    try {
      rec.start();
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : String(err);
      setHint(`開始エラー: ${msg}`);
      scheduleClear();
    }
  };

  // 未対応ブラウザでは何も表示しない（親側で grid が 1 列に倒れる）
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
            "mt-2 text-center text-xs leading-snug " +
            (status === "error" ? "text-danger" : "text-gray-500")
          }
        >
          {hint}
        </p>
      )}
    </div>
  );
}
