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
import { WeeklyComparisonCard } from "@/components/WeeklyComparisonCard";
import { MonthlySummaryCard } from "@/components/MonthlySummaryCard";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { LinkageNotification } from "@/components/LinkageNotification";
import { CheapForecast } from "@/components/CheapForecast";
import { QuickPresetEditor } from "@/components/QuickPresetEditor";
import { BottomNav, type TabId } from "@/components/BottomNav";

import type { Assets, Expense, QuickPreset } from "@/lib/types";
import {
  DEFAULT_QUICK_PRESETS,
  migrateQuickPresets,
} from "@/lib/defaultPresets";
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "@/lib/storage";
import { generateAIComments, type AIComment } from "@/lib/aiComment";
import { endOfThisWeek, startOfThisWeek, toDateInputValue } from "@/lib/date";
import { DUMMY_PRICE_NEWS, type PriceNews } from "@/lib/priceNews";
import { DUMMY_PRICE_PREDICTIONS } from "@/lib/pricePrediction";
import { generateSavingsAdvice } from "@/lib/savingsAdvice";

// 初期値（初回起動時はすべて 0）
const INITIAL_ASSETS: Assets = { bank: 0, cash: 0, income: 0 };

export default function Page() {
  // ----- state -----
  const [hydrated, setHydrated] = useState(false);
  const [assets, setAssets] = useState<Assets>(INITIAL_ASSETS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [weeklyBudget, setWeeklyBudget] = useState<number>(0);

  // 記録ストリーク用：ユーザーが「支出を追加」した日付の集合（重複なし、YYYY-MM-DD）
  const [recordDates, setRecordDates] = useState<string[]>([]);

  // 先週比較用：先週合計支出のミラー保存。実値は expenses から都度計算する。
  // setLastWeekTotal は localStorage 同期に使うので setter は保持
  const [, setLastWeekTotal] = useState<number>(0);

  // ユーザーカスタムのクイック入力プリセット
  const [quickPresets, setQuickPresets] =
    useState<QuickPreset[]>(DEFAULT_QUICK_PRESETS);
  // プリセット編集モーダルの開閉
  const [presetEditorOpen, setPresetEditorOpen] = useState(false);

  // 現在開いているタブ
  const [activeTab, setActiveTab] = useState<TabId>("home");

  // 物価高ニュース：起動時は DUMMY を表示、その後 /api/price-news で実データに差し替え
  const [priceNews, setPriceNews] = useState<PriceNews[]>(DUMMY_PRICE_NEWS);

  // ----- 初回マウント時に localStorage からロード -----
  useEffect(() => {
    const loadedExpenses = loadFromStorage<Expense[]>(STORAGE_KEYS.expenses, []);
    const loadedDates = loadFromStorage<string[]>(STORAGE_KEYS.recordDates, []);

    setAssets(loadFromStorage<Assets>(STORAGE_KEYS.assets, INITIAL_ASSETS));
    setExpenses(loadedExpenses);
    setWeeklyBudget(loadFromStorage<number>(STORAGE_KEYS.weeklyBudget, 0));

    // 既存ユーザー向けマイグレーション：recordDates が空でも既存 expense があれば
    // その date から初期化してストリークが途切れないようにする
    if (loadedDates.length === 0 && loadedExpenses.length > 0) {
      setRecordDates(Array.from(new Set(loadedExpenses.map((e) => e.date))));
    } else {
      setRecordDates(loadedDates);
    }
    setLastWeekTotal(loadFromStorage<number>(STORAGE_KEYS.lastWeekTotal, 0));

    // クイック入力プリセット：保存済みデータを読み込み、必要なら旧形式から変換
    // （以前は { label: "🍚 自炊" } 形式だったので、現在の { icon, name } に移行する）
    const rawPresets = loadFromStorage<unknown>(
      STORAGE_KEYS.quickPresets,
      null,
    );
    setQuickPresets(
      rawPresets === null ? DEFAULT_QUICK_PRESETS : migrateQuickPresets(rawPresets),
    );

    setHydrated(true);
  }, []);

  // ----- Google News RSS から実データ取得（失敗時は DUMMY のまま） -----
  useEffect(() => {
    let cancelled = false;
    fetch("/api/price-news")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setPriceNews(data as PriceNews[]);
        }
        // 取得失敗 or 空配列なら DUMMY のまま（壊さない）
      })
      .catch(() => {
        /* keep dummy */
      });
    return () => {
      cancelled = true;
    };
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

  // recordDates も localStorage に同期
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.recordDates, recordDates);
  }, [recordDates, hydrated]);

  // クイック入力プリセットを localStorage に同期
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(STORAGE_KEYS.quickPresets, quickPresets);
  }, [quickPresets, hydrated]);

  // ----- 派生値 -----
  const {
    weeklyExpenses,
    weeklySpent,
    lastWeekSpent,
    monthlyTotal,
    weeklyRecordCount,
    aiComments,
    savingsAdvices,
  } = useMemo(() => {
    const thisStart = startOfThisWeek();
    const thisEnd = endOfThisWeek();
    // 先週の範囲 = 今週開始日 - 7日 〜 今週開始日
    const lastStart = new Date(thisStart);
    lastStart.setDate(lastStart.getDate() - 7);

    // 当月の YYYY-MM プレフィックス（"2026-06" のような形）
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    // 今週分・先週分の支出を切り分け
    const wexp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= thisStart && d < thisEnd;
    });
    const lastExp = expenses.filter((e) => {
      const d = new Date(e.date);
      return d >= lastStart && d < thisStart;
    });

    // 当月分の合計支出（補足表示用）
    const monthly = expenses
      .filter((e) => e.date.startsWith(monthPrefix))
      .reduce((sum, e) => sum + e.amount, 0);

    const spent = wexp.reduce((sum, e) => sum + e.amount, 0);
    const lastSpent = lastExp.reduce((sum, e) => sum + e.amount, 0);

    // 今週内の「ユニーク記録日」数（ストリーク用）
    const weekRecordSet = new Set<string>();
    for (const ds of recordDates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) continue;
      const d = new Date(ds);
      if (d >= thisStart && d < thisEnd) weekRecordSet.add(ds);
    }

    // 基本コメント
    const baseComments = generateAIComments(wexp, weeklyBudget);

    // 先週比較コメント（先週0件なら出さない）
    let comparison: AIComment | null = null;
    if (lastSpent > 0) {
      const diff = spent - lastSpent;
      const absDiff = Math.abs(diff).toLocaleString("ja-JP");
      if (diff < 0) {
        comparison = {
          tone: "good",
          message: `先週より¥${absDiff}節約できています！`,
        };
      } else if (diff > 0) {
        comparison = {
          tone: "warn",
          message: `先週より¥${absDiff}多く使っています。`,
        };
      } else {
        comparison = {
          tone: "info",
          message: "先週と同じ支出ペースです。",
        };
      }
    }

    const allComments = comparison
      ? [comparison, ...baseComments]
      : baseComments;

    const advices = generateSavingsAdvice(
      wexp,
      DUMMY_PRICE_PREDICTIONS,
      weeklyBudget,
    );

    return {
      weeklyExpenses: wexp,
      weeklySpent: spent,
      lastWeekSpent: lastSpent,
      monthlyTotal: monthly,
      weeklyRecordCount: weekRecordSet.size,
      aiComments: allComments,
      savingsAdvices: advices,
    };
  }, [expenses, weeklyBudget, recordDates]);

  // 計算した先週合計を localStorage にミラー保存（仕様：localStorageに保存しておく）
  useEffect(() => {
    if (!hydrated) return;
    setLastWeekTotal(lastWeekSpent);
    saveToStorage(STORAGE_KEYS.lastWeekTotal, lastWeekSpent);
  }, [lastWeekSpent, hydrated]);

  // ----- ハンドラ -----
  // 支出を追加すると同時に「今日記録した」事実も recordDates に積む（重複排除）
  const addExpense = (e: Expense) => {
    setExpenses((prev) => [...prev, e]);
    const today = toDateInputValue(new Date());
    setRecordDates((prev) => (prev.includes(today) ? prev : [...prev, today]));
  };
  const deleteExpense = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  // ホームのクイック入力ボタン：ワンタップで即記録（確認ステップなし）
  const handleQuickAdd = (preset: QuickPreset) => {
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

  // ----- Empty State の判定 -----
  // A: 完全初回（支出 0 件 & 予算未設定）
  const isFirstVisit = expenses.length === 0 && weeklyBudget <= 0;
  // B: 予算は設定済みだが支出 0 件
  const hasNoRecords = expenses.length === 0 && weeklyBudget > 0;

  // CTA: 週予算入力欄にスクロール＋フォーカス
  // ※ WeeklyBudget 内の input に id="weekly-budget-input" を付与済み
  const focusBudgetInput = () => {
    const el = document.getElementById("weekly-budget-input");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // スクロール完了を少し待ってからフォーカス（モバイルでキーボード表示が暴れないように）
    setTimeout(() => el.focus(), 350);
  };

  return (
    <>
      <main className="mx-auto max-w-md px-4 py-6 pb-32">
        {/* === タイトルヘッダー（全タブ共通） === */}
        <header className="mb-4">
          <h1 className="text-xl font-bold">
            AI家計簿 <span className="text-xs text-gray-500">v5</span>
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            物価高時代の節約をAIがサポート
          </p>
        </header>

        <div className="space-y-4">
          {/* === ホームタブ === */}
          {activeTab === "home" && (
            <>
              {isFirstVisit ? (
                // ===== Empty State A：完全初回ユーザー =====
                // 「まず週予算を決めてみよう」をメインに据え、他のホームUIは出さない
                <>
                  <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <div className="text-5xl" aria-hidden>
                      💰
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-gray-900">
                      まず週予算を決めてみよう
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      予算を設定すると、AIが使いすぎを教えてくれます
                    </p>
                    <button
                      type="button"
                      onClick={focusBudgetInput}
                      className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.97]"
                    >
                      週予算を設定する
                      <span aria-hidden>→</span>
                    </button>
                  </section>

                  {/* 入力欄は同じページに残す（CTA のスクロール先） */}
                  <WeeklyBudget
                    weeklyBudget={weeklyBudget}
                    weeklySpent={weeklySpent}
                    monthlyTotal={monthlyTotal}
                    onChangeBudget={setWeeklyBudget}
                  />
                </>
              ) : (
                // ===== 通常レイアウト（hasNoRecords のときは中央を Empty State B に差し替え） =====
                <>
                  {/* 電子マネー連携：連携済みサービスから取り込み候補があれば通知 */}
                  <LinkageNotification onRecord={addExpense} />

                  {/* 記録ストリーク：今週の記録日数。3日以上で🔥継続中バッジ */}
                  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div>
                      <p className="text-xs text-gray-500">記録ストリーク</p>
                      <p className="mt-0.5 text-sm text-gray-700">
                        今週
                        <span className="mx-1 text-lg font-bold text-accent">
                          {weeklyRecordCount}
                        </span>
                        回記録
                      </p>
                    </div>
                    {weeklyRecordCount >= 3 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                        🔥 継続中
                      </span>
                    )}
                  </div>

                  <WeeklyBudget
                    weeklyBudget={weeklyBudget}
                    weeklySpent={weeklySpent}
                    monthlyTotal={monthlyTotal}
                    onChangeBudget={setWeeklyBudget}
                  />

                  {hasNoRecords ? (
                    // ===== Empty State B：予算済み・記録ゼロ =====
                    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                      <div className="text-4xl" aria-hidden>
                        ✨
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-gray-900">
                        今週の記録はまだありません
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        下のクイック入力でさっそく記録してみよう
                      </p>
                    </section>
                  ) : (
                    <AICommentCard comments={aiComments} />
                  )}

                  {/* AI予測：もうすぐ安くなる食材をちらっと表示（節約のヒント） */}
                  <CheapForecast />

                  {/* クイック入力：タップで今日の支出を即記録 */}
                  {/* hasNoRecords のときは pulse する accent リングを重ねて誘導 */}
                  <div className="relative">
                    <Card title="⚡ クイック入力">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          タップで今日の支出をワンタップ記録
                        </p>
                        <button
                          type="button"
                          onClick={() => setPresetEditorOpen(true)}
                          className="text-[11px] font-semibold text-accent hover:underline"
                        >
                          ✏️ 編集
                        </button>
                      </div>

                      {quickPresets.length === 0 ? (
                        // プリセット 0 件のときの案内
                        <button
                          type="button"
                          onClick={() => setPresetEditorOpen(true)}
                          className="w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-accent hover:text-accent active:scale-[0.97]"
                        >
                          + プリセットを追加
                        </button>
                      ) : (
                        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                          {quickPresets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleQuickAdd(p)}
                              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:border-accent hover:text-accent active:scale-[0.97]"
                            >
                              {p.icon} {p.name}
                              <span className="ml-1 text-[10px] opacity-80">
                                ¥{p.amount}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                    {hasNoRecords && (
                      <div
                        className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl ring-2 ring-accent"
                        aria-hidden
                      />
                    )}
                  </div>

                  {/* 記録 0 件のときは件数表示を出さない（Empty State B と重複するため） */}
                  {!hasNoRecords && (
                    <p className="text-center text-xs text-gray-400">
                      今週の支出: {weeklyExpenses.length} 件
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* === 記録タブ ===（ExpenseForm 内に ReceiptScanner を含む） */}
          {activeTab === "record" && (
            <>
              <ExpenseForm
                onAdd={addExpense}
                presets={quickPresets}
                onEditPresets={() => setPresetEditorOpen(true)}
              />
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
              {/* 先週vs今週カテゴリ別比較 + 大学生平均ライン + フランクなAIトーン */}
              <WeeklyComparisonCard expenses={expenses} />
              <MonthlySummaryCard
                expenses={expenses}
                weeklyBudget={weeklyBudget}
              />
            </>
          )}

          {/* === 物価タブ === */}
          {activeTab === "price" && (
            <>
              <PriceNewsCard news={priceNews} />
              <PricePredictionCard predictions={DUMMY_PRICE_PREDICTIONS} />
              <SavingsAdviceCard advices={savingsAdvices} />
            </>
          )}
        </div>
      </main>

      {/* === クイック入力プリセット編集モーダル === */}
      {presetEditorOpen && (
        <QuickPresetEditor
          presets={quickPresets}
          onSave={(next) => {
            setQuickPresets(next);
            setPresetEditorOpen(false);
          }}
          onClose={() => setPresetEditorOpen(false)}
        />
      )}

      {/* === ボトムナビゲーション（共通コンポーネント、5タブ） === */}
      <BottomNav activeId={activeTab} onSelectInPageTab={setActiveTab} />
    </>
  );
}
