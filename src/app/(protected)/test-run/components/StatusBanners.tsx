"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusBannersProps {
  isProcessing: boolean;
  isStuck: boolean;
  isComplete: boolean;
  isStopped: boolean;
  isFailed: boolean;
  hasFailures: boolean;
  currentJob: any;
  error: any;
  dictionary: any;
  fullDict: any;
  handleNewRun: () => void;
  parseErrorMessage: (msg: string) => string;
}

export function StatusBanners({
  isProcessing,
  isStuck,
  isComplete,
  isStopped,
  isFailed,
  hasFailures,
  currentJob,
  error,
  dictionary,
  fullDict,
  handleNewRun,
  parseErrorMessage,
}: StatusBannersProps) {
  return (
    <div className="mb-8">
      <AnimatePresence mode="wait">
        {isProcessing && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                    <div className="relative p-3 bg-white dark:bg-slate-800 rounded-full shadow-md">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {currentJob?.stepKey
                        ? (
                            fullDict.progressSteps as Record<
                              string,
                              Record<string, string>
                            >
                          )?.runTests?.[currentJob.stepKey] ||
                          currentJob.stepKey
                        : dictionary.testRun.processingInBackground ||
                          "Testler çalıştırılıyor..."}
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 font-medium">
                      {currentJob?.stepKey &&
                      currentJob?.currentStep &&
                      currentJob?.totalSteps
                        ? `${dictionary.testRun.step || "Adım"} ${currentJob.currentStep}/${currentJob.totalSteps}`
                        : dictionary.testRun.processing ||
                          "İşlem devam ediyor..."}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                      %{currentJob?.progress || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-4 h-3 bg-blue-100 dark:bg-blue-950/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentJob?.progress || 0}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isStuck && !error && !isFailed && !isComplete && (
          <motion.div
            key="stuck"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-4"
          >
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-800 dark:text-amber-200">
                    {dictionary.testRun.stuckTitle ||
                      "İşlem Beklenenden Uzun Sürüyor"}
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {dictionary.testRun.stuckDesc ||
                      "Bağlantı kopmuş olabilir. Sayfayı yenilemeyi deneyin."}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="bg-white/50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-2" />{" "}
                    {fullDict.common.refresh || "Yenile"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewRun}
                    className="text-amber-800 hover:bg-amber-100"
                  >
                    {fullDict.common.cancel || "İptal Et"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isComplete && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Card
              className={cn(
                "border-0 shadow-xl overflow-hidden relative group",
                hasFailures
                  ? "bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30"
                  : "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30",
              )}
            >
              <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div
                className={cn(
                  "absolute top-0 left-0 w-full h-1",
                  hasFailures
                    ? "bg-gradient-to-r from-orange-400 to-amber-500"
                    : "bg-gradient-to-r from-emerald-400 to-teal-500",
                )}
              />
              <CardContent className="p-6 relative z-10 flex items-center gap-5">
                <div className="relative">
                  <div
                    className={cn(
                      "absolute inset-0 blur-xl rounded-full",
                      hasFailures ? "bg-orange-400/30" : "bg-emerald-400/30",
                    )}
                  />
                  <div
                    className={cn(
                      "p-3 rounded-full text-white shadow-lg",
                      hasFailures
                        ? "bg-gradient-to-br from-orange-400 to-amber-500"
                        : "bg-gradient-to-br from-emerald-400 to-teal-500",
                    )}
                  >
                    {hasFailures ? (
                      <AlertCircle className="w-8 h-8" />
                    ) : (
                      <CheckCircle2 className="w-8 h-8" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3
                    className={cn(
                      "text-xl font-bold",
                      hasFailures
                        ? "text-orange-900 dark:text-orange-100"
                        : "text-emerald-900 dark:text-emerald-100",
                    )}
                  >
                    {hasFailures
                      ? dictionary.testRun?.completedWithFailures ||
                        "İşlem Hatalarla Tamamlandı"
                      : dictionary.testRun?.successMessage ||
                        "İşlem Başarıyla Tamamlandı! 🚀"}
                  </h3>
                  <p
                    className={cn(
                      "font-medium",
                      hasFailures
                        ? "text-orange-700 dark:text-orange-300"
                        : "text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {hasFailures
                      ? dictionary.testRun?.someTestsFailed ||
                        "Bazı testler başarısız oldu."
                      : dictionary.testRun?.allTestsPassed ||
                        "Tüm testler başarıyla sonuçlandı."}
                  </p>
                </div>
                <Button
                  onClick={handleNewRun}
                  className={cn(
                    "text-white shadow-lg transition-transform hover:scale-105",
                    hasFailures
                      ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/30"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30",
                  )}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {dictionary.testRun?.newRun || "Yeni Test"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isStopped && (
          <motion.div
            key="aborted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 overflow-hidden relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-orange-500" />
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200">
                    {dictionary.testRun?.aborted || "İşlem İptal Edildi"}
                  </h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">
                    {dictionary.testRun?.readyToExecuteDesc ||
                      "Test yürütme durduruldu."}
                  </p>
                </div>
                <Button
                  onClick={handleNewRun}
                  variant="outline"
                  className="border-orange-200 hover:bg-orange-100 text-orange-800 transition-all hover:scale-105"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {dictionary.testRun?.newRun || "Yeni Test"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isFailed && (
          <motion.div
            key="error"
            initial={{ opacity: 0, rotateX: -90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 overflow-hidden relative">
              <div className="absolute left-0 top-0 w-1 h-full bg-red-500" />
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
                    {dictionary.testRun?.testRunFailed || "İşlem Başarısız"}
                  </h3>
                  <p className="text-red-700 dark:text-red-300 font-medium font-mono text-sm bg-red-100/50 dark:bg-red-950/50 p-2 rounded">
                    {parseErrorMessage(currentJob?.error || "")}
                  </p>
                </div>
                <Button
                  onClick={handleNewRun}
                  className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {dictionary.testRun?.retry || "Yeniden Dene"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
