"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Info, Search, Loader2, XCircle } from "lucide-react";
import { Control } from "react-hook-form";

interface TagSelectorSectionProps {
  control: Control<any>;
  selectedProject: string;
  tagLogic: "and" | "or" | "custom";
  setTagLogic: (logic: "and" | "or" | "custom") => void;
  tagSearch: string;
  setTagSearch: (search: string) => void;
  tagsLoading: boolean;
  filteredTags: string[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearSelection: () => void;
  dictionary: any;
  fullDict: any;
}

export function TagSelectorSection({
  control,
  selectedProject,
  tagLogic,
  setTagLogic,
  tagSearch,
  setTagSearch,
  tagsLoading,
  filteredTags,
  selectedTags,
  toggleTag,
  clearSelection,
  dictionary,
  fullDict,
}: TagSelectorSectionProps) {
  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {dictionary.testRun.selectTags || "Etiketler"}
          </Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 text-slate-400 hover:text-indigo-500"
              >
                <Info className="w-3 h-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dictionary.testRun.tagsGuide}</DialogTitle>
                <DialogDescription>
                  {dictionary.testRun.readyToExecuteDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                      @smoke
                    </code>
                    <span className="text-sm text-muted-foreground">
                      {fullDict.testRun?.tagsGuideSmoke ||
                        "Smoke testlerini çalıştır"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                      @regression and not @slow
                    </code>
                    <span className="text-sm text-muted-foreground">
                      {fullDict.testRun?.tagsGuideComplex || "Karmaşık mantık"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">
                      @login or @signup
                    </code>
                    <span className="text-sm text-muted-foreground">
                      {fullDict.testRun?.tagsGuideAny ||
                        "Eşleşen herhangi biri"}
                    </span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex gap-1">
          {["and", "or", "custom"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setTagLogic(mode as any)}
              className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md transition-all ${
                tagLogic === mode
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {tagLogic !== "custom" ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={dictionary.testRun.searchTags || "Etiket ara..."}
              className="w-full pl-9 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500/20"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[140px] overflow-y-auto pr-1 flex flex-wrap gap-2 pt-1 custom-scrollbar min-h-[60px]">
            {tagsLoading ? (
              <div className="w-full h-full flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
              </div>
            ) : filteredTags.length > 0 ? (
              filteredTags
                .filter((t) =>
                  t.toLowerCase().includes(tagSearch.toLowerCase()),
                )
                .map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    onClick={() => toggleTag(tag)}
                    className={`cursor-pointer px-2.5 py-1 text-xs border transition-all duration-200 select-none ${
                      selectedTags.includes(tag)
                        ? "bg-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-500/20 hover:bg-indigo-600"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {tag}
                  </Badge>
                ))
            ) : (
              <p className="w-full text-center text-xs text-slate-400 py-4 italic">
                {selectedProject
                  ? dictionary.testRun.noTagsFound || "Etiket bulunamadı."
                  : dictionary.testRun.selectProjectFirst || "Proje seçin."}
              </p>
            )}
          </div>
        </>
      ) : (
        <FormField
          control={control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  {...field}
                  value={String(field.value)}
                  placeholder="@custom and @query"
                  className="w-full font-mono text-sm bg-white dark:bg-slate-900"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Selected Tags Preview */}
      {selectedTags.length > 0 && tagLogic !== "custom" && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          {selectedTags.map((tag, i) => (
            <Badge
              key={tag}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 px-2 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50"
            >
              {tag}
              {i < selectedTags.length - 1 && (
                <span className="ml-1 px-1 rounded bg-slate-200 dark:bg-slate-700 text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {tagLogic}
                </span>
              )}
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="ml-auto h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-600 self-center"
          >
            {dictionary.testRun.clear || "Temizle"}
          </Button>
        </div>
      )}
    </div>
  );
}
