"use client";

import { LayoutDashboard, Layers } from "lucide-react";
import { TestResultsTable } from "@/components/test-results-table";

interface ResultsSectionProps {
  testCreations: any[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  handlePageChange: (page: number) => void;
  testRunsLoading: boolean;
  dictionary: any;
  fullDict: any;
}

export function ResultsSection({
  testCreations,
  currentPage,
  totalPages,
  totalElements,
  handlePageChange,
  testRunsLoading,
  dictionary,
  fullDict,
}: ResultsSectionProps) {
  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 rounded-xl p-6 min-h-[600px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-indigo-500" />
          {dictionary.testRun.testResults || "Test Sonuçları & Geçmiş"}
        </h2>
      </div>

      <TestResultsTable
        creations={testCreations}
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={handlePageChange}
        isLoading={testRunsLoading}
      />

      {(!testCreations || testCreations.length === 0) && !testRunsLoading && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">
            {fullDict.testRun.noResults || "Henüz Test Koşulmadı"}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2">
            {fullDict.testRun?.noResultsDescription ||
              "Soldaki panelden proje ve etiket seçerek ilk testinizi başlatın."}
          </p>
        </div>
      )}
    </div>
  );
}
