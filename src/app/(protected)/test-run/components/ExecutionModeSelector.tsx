"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderClosed, Globe } from "lucide-react";

interface ExecutionModeSelectorProps {
  dictionary: any;
}

export function ExecutionModeSelector({
  dictionary,
}: ExecutionModeSelectorProps) {
  return (
    <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
      <TabsTrigger
        value="specific"
        className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all duration-300 font-medium"
      >
        <FolderClosed className="w-4 h-4 mr-2 text-indigo-500" />
        {dictionary.testRun.specificFile || "Dosya Bazlı"}
      </TabsTrigger>
      <TabsTrigger
        value="global"
        className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 data-[state=active]:shadow-sm transition-all duration-300 font-medium"
      >
        <Globe className="w-4 h-4 mr-2 text-blue-500" />
        {dictionary.testRun.globalTag || "Global Tag"}
      </TabsTrigger>
    </TabsList>
  );
}
