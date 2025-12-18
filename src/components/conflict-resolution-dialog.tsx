"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileCode, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConflictInfo {
    fileName: string;
    existingContent: string;
    newContent: string;
    backupPath?: string;
}

interface ConflictResolutionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conflicts: ConflictInfo[];
    onResolve: (overwrite: boolean) => void;
}

export function ConflictResolutionDialog({
    open,
    onOpenChange,
    conflicts,
    onResolve,
}: ConflictResolutionDialogProps) {
    const [expandedFile, setExpandedFile] = useState<string | null>(null);
    const [copiedFile, setCopiedFile] = useState<string | null>(null);

    const handleCopy = async (content: string, fileName: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedFile(fileName);
        setTimeout(() => setCopiedFile(null), 2000);
    };

    const handleOverwriteAll = () => {
        onResolve(true);
    };

    const handleCancel = () => {
        onResolve(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-500">
                        <AlertTriangle className="w-5 h-5" />
                        Çakışma Tespit Edildi
                    </DialogTitle>
                    <DialogDescription>
                        {conflicts.length} dosya zaten mevcut. Üzerine yazmak ister misiniz?
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[400px] pr-4">
                    <div className="space-y-3">
                        {conflicts.map((conflict) => {
                            const isExpanded = expandedFile === conflict.fileName;
                            const fileName = conflict.fileName.split("/").pop() || conflict.fileName;

                            return (
                                <div
                                    key={conflict.fileName}
                                    className="rounded-lg border bg-muted/30 overflow-hidden"
                                >
                                    <div
                                        onClick={() => setExpandedFile(isExpanded ? null : conflict.fileName)}
                                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <FileCode className="w-4 h-4 text-amber-500" />
                                            <div>
                                                <span className="font-medium text-sm">{fileName}</span>
                                                <p className="text-xs text-muted-foreground">
                                                    {conflict.fileName}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-amber-500 border-amber-500">
                                                Çakışma
                                            </Badge>
                                            {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4" />
                                            )}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="border-t"
                                            >
                                                <div className="p-3 space-y-3">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                Mevcut İçerik
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(conflict.existingContent, `${conflict.fileName}-existing`);
                                                                }}
                                                            >
                                                                {copiedFile === `${conflict.fileName}-existing` ? (
                                                                    <Check className="w-3 h-3" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <pre className="text-xs bg-red-500/10 p-2 rounded overflow-x-auto max-h-32">
                                                            {conflict.existingContent.slice(0, 500)}
                                                            {conflict.existingContent.length > 500 && "..."}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                Yeni İçerik
                                                            </span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCopy(conflict.newContent, `${conflict.fileName}-new`);
                                                                }}
                                                            >
                                                                {copiedFile === `${conflict.fileName}-new` ? (
                                                                    <Check className="w-3 h-3" />
                                                                ) : (
                                                                    <Copy className="w-3 h-3" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        <pre className="text-xs bg-green-500/10 p-2 rounded overflow-x-auto max-h-32">
                                                            {conflict.newContent.slice(0, 500)}
                                                            {conflict.newContent.length > 500 && "..."}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleCancel}>
                        İptal
                    </Button>
                    <Button
                        variant="default"
                        className="bg-amber-500 hover:bg-amber-600"
                        onClick={handleOverwriteAll}
                    >
                        Tümünü Üzerine Yaz (Yedekle)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ConflictResolutionDialog;
