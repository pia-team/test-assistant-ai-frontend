import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  Copy,
  Download,
  FileCode,
  CheckCircle,
  Check,
  FolderInput,
  Edit2,
  Save,
  X as CloseIcon,
  AlertCircle,
  Info,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type {
  FileContent,
  UploadJsonResponse,
} from "@/app/actions/upload-json-action";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { InjectToProjectButton } from "./inject-to-project-button";
import { useLocale } from "@/components/locale-context";
import { useCodeInjection } from "@/hooks/useCodeInjection";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";

interface GeneratedFilesDisplayProps {
  data: UploadJsonResponse;
  dictionary: {
    common: {
      copy?: string;
      download?: string;
      copied?: string;
      edit?: string;
      save?: string;
      cancel?: string;
    };
  };
  onSuccessAll?: () => void;
}

const getLanguageFromFileName = (fileName: string): string => {
  if (!fileName) return "javascript";
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    java: "java",
    py: "python",
    json: "json",
    feature: "gherkin",
    xml: "xml",
    html: "html",
    css: "css",
    sql: "sql",
  };
  return map[ext] || "javascript";
};

const downloadFile = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export function GeneratedFilesDisplay({
  data,
  dictionary,
  onSuccessAll,
}: GeneratedFilesDisplayProps) {
  const { dictionary: fullDict } = useLocale();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localData, setLocalData] = useState<UploadJsonResponse>(data);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const {
    inject,
    injectWithOverwrite,
    isInjecting,
    progress,
    conflicts,
    hasConflicts,
    reset: resetInjection,
  } = useCodeInjection({
    onSuccess: () => {
      toast.success(fullDict.injection.allFilesAdded, {
        id: "bulk-injection-success",
      });
      setExpanded(null);
      // Auto close after success
      setTimeout(() => {
        setShowPreviewModal(false);
        onSuccessAll?.();
        resetInjection();
      }, 1500);
    },
    onError: (error) => {
      toast.error(error.message || fullDict.injection.errorAdding);
    },
    onConflict: () => {
      setShowConflicts(true);
    },
  });

  // Update local data when props change
  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const copyToClipboard = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(dictionary.common.copied || "Kopyalandı!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateCode = (
    groupName: string,
    index: number,
    newCode: string,
  ) => {
    setLocalData((prev) => {
      const newData = { ...prev };
      const group = newData[groupName];
      if (Array.isArray(group)) {
        const newGroup = [...group];
        newGroup[index] = { ...newGroup[index], code: newCode };
        newData[groupName] = newGroup;
      } else if (group && typeof group === "object") {
        newData[groupName] = { ...group, code: newCode };
      }
      return newData;
    });
  };

  // Map and filter entries to handle both arrays and single objects
  const fileGroups = Object.entries(localData)
    .filter(([key]) => !["message", "status", "id"].includes(key)) // Exclude common non-file fields
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, value] as [string, FileContent[]];
      }
      if (
        value &&
        typeof value === "object" &&
        "fileName" in value &&
        "code" in value
      ) {
        return [key, [value as FileContent]] as [string, FileContent[]];
      }
      return null;
    })
    .filter(
      (group): group is [string, FileContent[]] =>
        group !== null && group[1].length > 0,
    );

  if (fileGroups.length === 0) {
    return null;
  }

  // Flatten all files for "inject all" button
  const allFiles = fileGroups.flatMap(([, files]) => files);

  const getStepLabel = (stepKey: string) => {
    const stepLabels: Record<string, string> = {
      preparingFiles:
        fullDict.injection.preparingFiles || "Dosyalar hazırlanıyor...",
      writingFiles: fullDict.injection.writingFiles || "Dosyalar yazılıyor...",
      updatingDependencies:
        fullDict.injection.updatingDependencies ||
        "Bağımlılıklar güncelleniyor...",
      completed: fullDict.injection.completed || "Tamamlandı",
    };
    return stepLabels[stepKey] || stepKey;
  };

  const handleBulkInject = () => {
    if (allFiles.length === 0) return;
    inject(allFiles);
  };

  const handleResolveConflicts = (overwrite: boolean) => {
    setShowConflicts(false);
    if (overwrite) {
      injectWithOverwrite(allFiles);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inject All Button with Preview */}
      {allFiles.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowPreviewModal(true)}
            className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/20"
          >
            <FolderInput className="w-4 h-4" />
            {`${fullDict.injection.addAllToProject} (${allFiles.length} ${fullDict.injection.files})`}
          </Button>
        </div>
      )}

      {/* Bulk Injection Preview Modal */}
      <Dialog
        open={showPreviewModal}
        onOpenChange={(open) => {
          if (!isInjecting) {
            setShowPreviewModal(open);
            if (!open) resetInjection();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isInjecting || progress ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  {fullDict.injection.inProgress || "Processing..."}
                </>
              ) : (
                <>
                  <Info className="w-5 h-5 text-indigo-500" />
                  {fullDict.injection.injectionPreview || "Injection Preview"}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isInjecting || progress
                ? fullDict.injection.progress ||
                  "Please wait while files are being injected."
                : fullDict.injection.reviewFiles ||
                  "Review the files that will be added to your project."}
            </DialogDescription>
          </DialogHeader>

          {isInjecting || progress ? (
            <div className="flex-1 py-8 space-y-6">
              <div className="space-y-2 text-center">
                <div className="flex justify-between text-sm font-medium px-1">
                  <span className="text-muted-foreground">
                    {!progress
                      ? fullDict.injection.preparingFiles || "Hazırlanıyor..."
                      : progress.progress === 100
                        ? fullDict.injection.completed
                        : progress.currentIndex && progress.currentIndex > 0
                          ? `${fullDict.injection.step || "Step"} ${progress.currentIndex}`
                          : fullDict.injection.preparingFiles}
                  </span>
                  <span className="text-indigo-600 font-bold">
                    %{progress?.progress || 0}
                  </span>
                </div>
                <Progress value={progress?.progress || 0} className="h-2.5" />
              </div>

              <AnimatePresence mode="wait">
                {!progress && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <Loader2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {fullDict.injection.preparingFiles ||
                          "Dosyalar hazırlanıyor..."}
                      </p>
                    </div>
                  </motion.div>
                )}
                {progress?.currentFile && progress.progress !== 100 && (
                  <motion.div
                    key={progress.currentFile}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 shadow-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-widest mb-0.5">
                        {progress.progress === 100 ? "COMPLETED" : "PROCESSING"}
                      </p>
                      <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">
                        {getStepLabel(progress.currentFile)}
                      </p>
                    </div>
                  </motion.div>
                )}
                {progress?.progress === 100 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-3 py-4 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="font-bold text-green-700 dark:text-green-500">
                      {fullDict.injection.completed || "Successful!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {fullDict.injection.successMessage.replace(
                        "{count}",
                        String(allFiles.length),
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 my-4 pr-3 border rounded-lg bg-muted/20">
                <div className="p-4 space-y-3">
                  {fileGroups.map(([groupName, files]) => (
                    <div key={groupName} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {groupName.replace(/([A-Z])/g, " $1").trim()} (
                        {files.length})
                      </h4>
                      <ul className="space-y-1 pl-3">
                        {files.map((file, i) => (
                          <li
                            key={i}
                            className="text-sm flex items-center gap-2 text-slate-600 dark:text-slate-300 py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                          >
                            <FileCode className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate flex-1">
                              {file.fileName}
                            </span>
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                              {(file.code.length / 1024).toFixed(1)} KB
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={isInjecting}
                >
                  {dictionary.common.cancel ||
                    fullDict.common.cancel ||
                    "Cancel"}
                </Button>
                <Button
                  onClick={handleBulkInject}
                  disabled={allFiles.length === 0 || isInjecting}
                  className="gap-2 min-w-[150px]"
                >
                  {isInjecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {fullDict.injection.adding || "Adding..."}
                    </>
                  ) : (
                    fullDict.injection.confirmAndInject ||
                    "Confirm & Inject All"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConflictResolutionDialog
        open={showConflicts}
        onOpenChange={setShowConflicts}
        conflicts={conflicts}
        onResolve={handleResolveConflicts}
      />

      {fileGroups.map(([groupName, files]) => (
        <Card key={groupName}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 capitalize">
                <CheckCircle className="w-5 h-5 text-green-500" />
                {groupName.replace(/([A-Z])/g, " $1").trim()}
                <span className="text-sm font-normal text-muted-foreground">
                  ({files.length}{" "}
                  {files.length === 1
                    ? fullDict.injection.file
                    : fullDict.injection.files}
                  )
                </span>
              </CardTitle>
              <InjectToProjectButton
                files={files}
                variant="outline"
                size="sm"
                label={fullDict.injection.addGroupToProject}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file, index) => {
              const fileName = file.fileName.split("/").pop() || file.fileName;
              const itemId = `${groupName}-${index}`;
              const isOpen = expanded === itemId;
              const isEditing = editingId === itemId;

              return (
                <motion.div
                  key={itemId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-lg border bg-muted/30 overflow-hidden"
                >
                  {/* Header */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : itemId)}
                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileCode className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{fileName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action buttons */}
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-500 hover:text-blue-600"
                          onClick={() => {
                            if (isEditing) {
                              setEditingId(null);
                            } else {
                              setEditingId(itemId);
                              setExpanded(itemId);
                            }
                          }}
                        >
                          {isEditing ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Edit2 className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyToClipboard(file.code, itemId)}
                        >
                          {copiedId === itemId ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadFile(fileName, file.code)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Chevron */}
                      <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Code content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="border-t">
                          {isEditing ? (
                            <div className="p-4 bg-slate-900">
                              <Textarea
                                className="min-h-[300px] font-mono text-sm bg-slate-800 text-slate-100 border-slate-700"
                                value={file.code}
                                onChange={(e) =>
                                  handleUpdateCode(
                                    groupName,
                                    index,
                                    e.target.value,
                                  )
                                }
                              />
                              <div className="flex justify-end mt-2 gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => setEditingId(null)}
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  {fullDict.common.done || "Done"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <SyntaxHighlighter
                              language={getLanguageFromFileName(fileName)}
                              style={atomOneDark}
                              customStyle={{
                                margin: 0,
                                padding: "1rem",
                                fontSize: "0.875rem",
                                borderRadius: 0,
                              }}
                              wrapLines={true}
                              wrapLongLines={true}
                            >
                              {file.code}
                            </SyntaxHighlighter>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
