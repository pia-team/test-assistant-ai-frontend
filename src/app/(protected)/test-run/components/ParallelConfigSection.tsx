"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";
import { Control, UseFormWatch } from "react-hook-form";

interface ParallelConfigSectionProps {
  control: Control<any>;
  watch: UseFormWatch<any>;
  isParallel: boolean;
  isProcessing: boolean;
  dictionary: any;
}

export function ParallelConfigSection({
  control,
  watch,
  isParallel,
  isProcessing,
  dictionary,
}: ParallelConfigSectionProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-slate-600 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          {dictionary.testRun.parallelExecution}
        </Label>
        <FormField
          control={control}
          name="isParallel"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={isProcessing}
                  className="scale-75 origin-right"
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
      {isParallel && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="pt-2 px-1"
        >
          <div className="flex justify-between items-center mb-2">
            <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              {dictionary.testRun.threadCount}
            </Label>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
              {watch("threads")}
            </span>
          </div>
          <FormField
            control={control}
            name="threads"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Slider
                    min={1}
                    max={10}
                    step={1}
                    value={[Number(field.value)]}
                    onValueChange={(vals: number[]) => field.onChange(vals[0])}
                    className="cursor-pointer py-2"
                    disabled={isProcessing}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
