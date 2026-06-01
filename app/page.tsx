"use client";

// アプリのメインページ。4タブ構成（ホーム / 記録 / レポート / 物価）。
// 画面下部に固定ボトムナビでタブ切り替え。state は useState のみ。

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { WeeklyBudget } from "@/components/WeeklyBudget";
import { AICommentCard } from "@/components/AICommentCard";
import { PriceNewsCard } from "@/components/PriceNewsCard";
import { PricePredictionCard } from "@/components/PricePredictionCard";
import { SavingsAdviceCard } from "@/components/SavingsAdviceCard";
import { WeeklyReportCard } from "@/components/WeeklyReportCard";
import { MonthlySummaryCard } from "@/components/MonthlySummaryCard";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";

import type { Assets, Expense } from "@/lib/types";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";
import { generateAIComments } from "@/lib/aiComment";
import { endOfThisWeek, startOfThisWeek, toDateInputValue } from "@/lib/date";
import { DUMMY_PRICE_NEWS } from "@/lib/priceNews";
import { DUMMY_PRICE_PREDICTIONS } from "@/lib/pricePrediction";
import { generateSavingsAdvice } from "@/lib/savingsAdvice";

// 初期値（初回起動時はすべて 0）
const INITIAL_ASSETS: Assets = { bank: 0, cash: 0, income: 0 };

// ----- タブ定義 -----
type TabId = "home" | "record" | "report" | "price";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "home",   label: "ホーム",     icon: "🏠" },
  { id: "record", label: "記録",       icon: "📝" },
  { id: "report", label: "レポート",   icon: "📊" },
  { id: "price",  label: "物価",       icon: "📈" },
];

// ----- ホームタブのクイック入力プリセット -----
// ExpenseForm.tsx の QUICK_PRESETS と同じデータ。
// ホームではワンタップで即記録するため、こちらにも独立に定義する。
const QUICK_PRESETS = [
  { label: "🍚 自炊",     amount: 500,  category: "食費",     memo: "自炊" },
  { label: "🍜 外食",     amount: 1000, category: "外食",     memo: "外食" },
  { label: "🏪 コンビニ", amount: 500,  category: "コンビニ", memo: "コンビニ" },
  { label: "🚃 交通",     amount: 200,  category: "交通",     memo: "" },
  { label: "☕ カフェ",   amount: 600,  category: "外食",     memo: "カフェ" },
] as const;

export default function Page() {
  // ----- state -----
  const [hydrated, setHydrated] = useState(false);
  const [assets, setAssets] = useState<Assets>(INITIAL_ASSETS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [weeklyBudget, setWeeklyBudget] = useState<number>(0);

  // 現在開いているタブ
  const [activeTab, setActiveTab] = useState<TabId>("home");

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

  // ----- 派生値 -----
  const { weeklyExpenses, weeklySpent, aiComments, savingsAdvices } = useMemo(() => {
    const start = startOfThisWeek();
    const end = endOfThisWeek();

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

  // ホームのクイック入力ボタン：ワンタップで即記録（確認ステップなし）
  const handleQuickAdd = (preset: (typeof QUICK_PRESETS)[number]) => {
    addExpense({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      amount: preset.amount,
      category: preset.category,
      memo: preset.memo,
      date: toDateInputValue(new Date()),
    });
  };

  // assets を実質読み取り専用にしているが、state と localStorage 同期は仕様により維持。
  // 未使用警告を避けるため明示的に void で参照しておく
  void assets;
  void setAssets;

  return (
    <>
      <main className="mx-auto max-w-md px-4 py-6 pb-32">
        {/* === タイトルヘッダー（全タブ共通） === */}
        <header className="mb-4">
          <h1 className="text-xl font-bold">
            AI家計簿 <span className="text-xs text-gray-500">v1</span>
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            物価高時代の節約をAIがサポート
          </p>
        </header>

        <div className="space-y-4">
          {/* === ホームタブ === */}
          {activeTab === "home" && (
            <>
              <WeeklyBudget
                weeklyBudget={weeklyBudget}
                weeklySpent={weeklySpent}
                onChangeBudget={setWeeklyBudget}
              />
              <AICommentCard comments={aiComments} />

              {/* クイック入力：タップで今日の支出を即記録 */}
              <Card title="⚡ クイック入力">
                <p className="mb-2 text-xs text-gray-500">
                  タップで今日の支出をワンタップ記録
                </p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {QUICK_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleQuickAdd(p)}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-accent hover:text-accent active:scale-[0.97]"
                    >
                      {p.label}
                      <span className="ml-1 text-[10px] opacity-80">
                        ¥{p.amount}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <p className="text-center text-xs text-gray-400">
                今週の支出: {weeklyExpenses.length} 件
              </p>
            </>
          )}

          {/* === 記録タブ ===（ExpenseForm 内に ReceiptScanner を含む） */}
          {activeTab === "record" && (
            <>
              <ExpenseForm onAdd={addExpense} />
              <ExpenseList expenses={expenses} onDelete={deleteExpense} />
            </>
          )}

          {/* === レポートタブ === */}
          {activeTab === "report" && (
            <>
              <WeeklyReportCard
                weeklyExpenses={weeklyExpenses}
                weeklyBudget={weeklyBudget}
                weeklySpent={weeklySpent}
              />
              <MonthlySummaryCard
                expenses={expenses}
                weeklyBudget={weeklyBudget}
              />
            </>
          )}

          {/* === 物価タブ === */}
          {activeTab === "price" && (
            <>
              <PriceNewsCard news={DUMMY_PRICE_NEWS} />
              <PricePredictionCard predictions={DUMMY_PRICE_PREDICTIONS} />
              <SavingsAdviceCard advices={savingsAdvices} />
            </>
          )}
        </div>
      </main>

      {/* === ボトムナビゲーション（全タブ共通・画面下固定） === */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white"
        // iPhone のホームインジケータ領域（safe area）ぶんパディングを足す
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="主要ナビゲーション"
      >
        <div className="mx-auto flex max-w-md">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition " +
                  (isActive
                    ? "text-accent"
                    : "text-gray-400 hover:text-gray-600")
                }
              >
                <span className="text-xl leading-none" aria-hidden>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
