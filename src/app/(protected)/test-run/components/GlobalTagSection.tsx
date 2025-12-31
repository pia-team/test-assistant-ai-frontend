"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Globe, Search, Zap, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GlobalTagSectionProps {
  globalTagInput: string;
  setGlobalTagInput: (val: string) => void;
  globalTags: string[];
  handleAddGlobalTag: () => void;
  handleRemoveGlobalTag: (tag: string) => void;
  clearGlobalTags: () => void;
  isProcessing: boolean;
  dictionary: any;
}

export function GlobalTagSection({
  globalTagInput,
  setGlobalTagInput,
  globalTags,
  handleAddGlobalTag,
  handleRemoveGlobalTag,
  clearGlobalTags,
  isProcessing,
  dictionary,
}: GlobalTagSectionProps) {
  return (
    <div className="space-y-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="space-y-1">
        <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
          <Globe className="w-4 h-4 text-blue-500" />
          {dictionary.testRun.globalTag || "Global Tag"}
        </Label>
        <p className="text-[10px] text-slate-400">
          {dictionary.testRun.globalTagDesc ||
            "Proje veya dosya ayrımı olmaksızın, bu etiketlere sahip tüm testleri çalıştırır. (OR mantığı ile)"}
        </p>
      </div>

      {/* Tag Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          value={globalTagInput}
          onChange={(e) => setGlobalTagInput(e.target.value)}
          placeholder={
            dictionary.testRun.searchTags ||
            "Etiket ekleyin (örn: smoke, regression)..."
          }
          className="w-full h-10 pl-9 pr-12 font-mono text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-blue-500/20"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddGlobalTag();
            }
          }}
          disabled={isProcessing}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="absolute right-1 top-1 h-8 w-8 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
          onClick={handleAddGlobalTag}
          disabled={isProcessing}
        >
          <Zap className="w-4 h-4" />
        </Button>
      </div>

      {/* Selected Tags Display */}
      <div className="min-h-[80px] p-3 bg-white dark:bg-slate-900/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
        {globalTags.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic py-4">
            <Globe className="w-6 h-6 mb-2 opacity-30" />
            {dictionary.testRun.noTagsAdded || "Henüz etiket eklenmedi"}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {globalTags.map((tag) => (
                <motion.div
                  key={tag}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                >
                  <Badge
                    className="pl-3 pr-1 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800 border-blue-200 dark:border-blue-700 cursor-pointer flex items-center gap-1 group"
                    onClick={() => handleRemoveGlobalTag(tag)}
                  >
                    {tag}
                    <span className="p-0.5 rounded-full bg-blue-200/50 group-hover:bg-blue-300/50 dark:bg-blue-700/50 dark:group-hover:bg-blue-600/50 transition-colors ml-1">
                      <XCircle className="w-3 h-3" />
                    </span>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Clear All Button */}
      {globalTags.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearGlobalTags}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <XCircle className="w-3 h-3 mr-1" />
            {dictionary.testRun.clearAll || "Tümünü Temizle"}
          </Button>
        </div>
      )}
    </div>
  );
}
