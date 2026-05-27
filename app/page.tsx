"use client";

// アプリのメインページ（1ページ構成）。
// 各カードコンポーネントを並べ、state と localStorage 同期だけここで管理する。

import { useEffect, useMemo, useState } from "react";
import { WeeklyBudget } from "@/components/WeeklyBudget";
import { AICommentCard } from "@/components/AICommentCard";
import { PriceNewsCard } from "@/components/PriceNewsCard";
import { PricePredictionCard } from "@/components/PricePredictionCard";
import { SavingsAdviceCard } from "@/components/SavingsAdviceCard";
import { AssetsCard } from "@/components/AssetsCard";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";

import type { Assets, Expense } from "@/lib/types";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";
import { generateAIComments } from "@/lib/aiComment";
import { endOfThisWeek, startOfThisWeek } from "@/lib/date";
import { DUMMY_PRICE_NEWS } from "@/lib/priceNews";
import { DUMMY_PRICE_PREDICTIONS } from "@/lib/pricePrediction";
import { generateSavingsAdvice } from "@/lib/savingsAdvice";

// 初期値（初回起動時はすべて 0）
const INITIAL_ASSETS: Assets = { bank: 0, cash: 0, income: 0 };

export default function Page() {
  // ----- state -----
  // 「マウント後に localStorage から読み込んだか」のフラグ。
  // これが false の間は localStorage への書き戻しを行わない（初期化で空保存になるのを防ぐ）
  const [hydrated, setHydrated] = useState(false);

  const [assets, setAssets] = useState<Assets>(INITIAL_ASSETS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [weeklyBudget, setWeeklyBudget] = useState<number>(0);

  // ----- 初回マウント時に localStorage からロード -----
  useEffect(() => {
    setAssets(loadFromStorage<Assets>(STORAGE_KEYS.assets, INITIAL_ASSETS));
    setExpenses(loadFromStorage<Expense[]>(STORAGE_KEYS.expenses, []));
    setWeeklyBudget(loadFromStorage<number>(STORAGE_KEYS.weeklyBudget, 0));
    setHydrated(true);
  }, []);

  // ----- 変更があったら localStorage に保存 -----
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.assets, assets);
  }, [assets, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.expenses, expenses);
  }, [expenses, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.weeklyBudget, weeklyBudget);
  }, [weeklyBudget, hydrated]);

  // ----- 派生値（今週の支出 / AIコメント / 節約アドバイス） -----
  const { weeklyExpenses, weeklySpent, aiComments, savingsAdvices } = useMemo(() => {
    const start = startOfThisWeek();
    const end = endOfThisWeek();

    // 今週分だけフィルタ
    const wexp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d < end;
    });

    const spent = wexp.reduce((sum, e) => sum + e.amount, 0);
    const comments = generateAIComments(wexp, weeklyBudget);
    const advices = generateSavingsAdvice(
      wexp,
      DUMMY_PRICE_PREDICTIONS,
      weeklyBudget,
    );

    return {
      weeklyExpenses: wexp,
      weeklySpent: spent,
      aiComments: comments,
      savingsAdvices: advices,
    };
  }, [expenses, weeklyBudget]);

  // ----- ハンドラ -----
  const addExpense = (e: Expense) => setExpenses((prev) => [...prev, e]);
  const deleteExpense = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-24">
      {/* 1. タイトル */}
      <header className="mb-4">
        <h1 className="text-xl font-bold">
          AI家計簿 <span className="text-xs text-gray-500">v1</span>
        </h1>
        <p className="mt-0.5 text-xs text-gray-500">
          物価高時代の節約をAIがサポート
        </p>
      </header>

      <div className="space-y-4">
        {/* 2. 今週あといくら表示（最重要） */}
        <WeeklyBudget
          weeklyBudget={weeklyBudget}
          weeklySpent={weeklySpent}
          onChangeBudget={setWeeklyBudget}
        />

        {/* 3. AIコメント */}
        <AICommentCard comments={aiComments} />

        {/* 4. 物価高ニュース（新） */}
        <PriceNewsCard news={DUMMY_PRICE_NEWS} />

        {/* 5. 値上がり予測（新） */}
        <PricePredictionCard predictions={DUMMY_PRICE_PREDICTIONS} />

        {/* 6. 節約アドバイスAI（新・中心体験） */}
        <SavingsAdviceCard advices={savingsAdvices} />

        {/* 7. 所持金エリア */}
        <AssetsCard assets={assets} onChange={setAssets} />

        {/* 8. 支出入力フォーム */}
        <ExpenseForm onAdd={addExpense} />

        {/* 9. 支出一覧 */}
        <ExpenseList expenses={expenses} onDelete={deleteExpense} />

        {/* 補足：今週の支出件数を小さく表示 */}
        <p className="text-center text-xs text-gray-400">
          今週の支出: {weeklyExpenses.length} 件
        </p>
      </div>
    </main>
  );
}
