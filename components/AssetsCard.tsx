"use client";

// 所持金・収入を入力するカード
import { Card } from "./Card";
import type { Assets } from "@/lib/types";

interface Props {
  assets: Assets;
  onChange: (assets: Assets) => void;
}

export function AssetsCard({ assets, onChange }: Props) {
  // 合計所持金 = 通帳 + 現金 + 今月の収入
  const total = assets.bank + assets.cash + assets.income;

  // 共通の input ハンドラ。キーごとに値を差し替える
  const update = (key: keyof Assets, value: number) => {
    onChange({ ...assets, [key]: value });
  };

  return (
    <Card title="💰 所持金・収入">
      <div className="grid grid-cols-3 gap-2">
        <NumberField
          label="通帳"
          value={assets.bank}
          onChange={(v) => update("bank", v)}
        />
        <NumberField
          label="現金"
          value={assets.cash}
          onChange={(v) => update("cash", v)}
        />
        <NumberField
          label="今月の収入"
          value={assets.income}
          onChange={(v) => update("income", v)}
        />
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-600">合計所持金</span>
        <span className="text-2xl font-bold">
          ¥{total.toLocaleString("ja-JP")}
        </span>
      </div>
    </Card>
  );
}

// 数値入力フィールド（再利用）
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-xs text-gray-600">
      {label}
      <input
        type="number"
        inputMode="numeric"
        min={0}
        // 0 のときは空文字に見せて placeholder を出す
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        // マウスホイールで数値が勝手に変わるのを防ぐ
        onWheel={(e) => e.currentTarget.blur()}
        className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-base text-gray-900 outline-none focus:border-accent"
      />
    </label>
  );
}
