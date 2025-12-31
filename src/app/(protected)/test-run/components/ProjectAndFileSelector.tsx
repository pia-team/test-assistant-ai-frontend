"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  FolderClosed,
  FileJson,
  Loader2,
  ChevronDown,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ProjectAndFileSelectorProps {
  selectedProject: string;
  projects: string[];
  isProcessing: boolean;
  projectsLoading: boolean;
  filesLoading: boolean;
  availableFeatureFiles: string[];
  selectedFeatureFiles: string[];
  handleProjectChange: (project: string) => void;
  toggleFeatureFile: (file: string) => void;
  setSelectedFeatureFiles: (files: string[]) => void;
  dictionary: any;
}

export function ProjectAndFileSelector({
  selectedProject,
  projects,
  isProcessing,
  projectsLoading,
  filesLoading,
  availableFeatureFiles,
  selectedFeatureFiles,
  handleProjectChange,
  toggleFeatureFile,
  setSelectedFeatureFiles,
  dictionary,
}: ProjectAndFileSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
          <FolderClosed className="w-4 h-4 text-indigo-500" />
          {dictionary.testRun.projectAndTags || "PROJE & ETİKETLER"}
        </Label>

        <Select
          value={selectedProject}
          onValueChange={handleProjectChange}
          disabled={isProcessing || projectsLoading}
        >
          <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 hover:border-indigo-300 transition-colors">
            <SelectValue
              placeholder={dictionary.testRun.selectProject || "Proje Seçin"}
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p} value={p} className="cursor-pointer">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Feature File Selection */}
      {selectedProject && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
            <FileJson className="w-4 h-4 text-emerald-500" />
            {dictionary.testRun.featureFile || "Feature Dosyası"}
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              disabled={isProcessing || filesLoading}
            >
              <Button
                variant="outline"
                className="w-full h-11 justify-between bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 hover:border-emerald-300 transition-colors px-3 font-normal"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex-shrink-0">
                    {filesLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <FileJson className="w-4 h-4 text-emerald-500" />
                    )}
                  </div>
                  <span className="truncate text-sm">
                    {selectedFeatureFiles.length === 0
                      ? dictionary.testRun.selectFile || "Dosya Seçin"
                      : selectedFeatureFiles.length === 1
                        ? selectedFeatureFiles[0]
                        : `${selectedFeatureFiles.length} ${dictionary.testRun.filesSelected || "Dosya Seçildi"}`}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2 z-[100]">
              <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase px-2 py-1.5 flex items-center justify-between">
                <span>
                  {dictionary.testRun.featureFiles || "Feature Dosyaları"}
                </span>
                {selectedFeatureFiles.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFeatureFiles([]);
                    }}
                    className="h-6 px-1.5 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {dictionary.testRun.clear || "Temizle"}
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700 my-1" />
              {availableFeatureFiles.map((file) => (
                <DropdownMenuCheckboxItem
                  key={file}
                  checked={selectedFeatureFiles.includes(file)}
                  onCheckedChange={() => toggleFeatureFile(file)}
                  className="cursor-pointer rounded-lg mb-0.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors data-[state=checked]:text-indigo-600 dark:data-[state=checked]:text-indigo-400 font-mono text-sm"
                  onSelect={(e) => e.preventDefault()}
                >
                  {file}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Selected Files Badge Area */}
          {selectedFeatureFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-[100px] overflow-y-auto p-1 custom-scrollbar">
              {selectedFeatureFiles.map((file) => (
                <Badge
                  key={file}
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 flex items-center gap-1 py-0.5 pr-1 pl-2 text-[11px]"
                >
                  {file}
                  <button
                    onClick={() => toggleFeatureFile(file)}
                    className="hover:bg-emerald-200 dark:hover:bg-emerald-800 rounded-full p-0.5 transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {availableFeatureFiles.length === 0 && !filesLoading && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {dictionary.testRun.noFilesFound ||
                "Bu grupta henüz feature dosyası yok"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
