"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ChevronDown,
    Copy,
    Download,
    FileCode,
    CheckCircle,
    Check
} from "lucide-react";
import { toast } from "sonner";
import type { FileContent, UploadJsonResponse } from "@/app/actions/upload-json-action";
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface GeneratedFilesDisplayProps {
    data: UploadJsonResponse;
    dictionary: {
        common: {
            copy?: string;
            download?: string;
            copied?: string;
        };
    };
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

export function GeneratedFilesDisplay({ data, dictionary }: GeneratedFilesDisplayProps) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyToClipboard = async (code: string, id: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedId(id);
        toast.success(dictionary.common.copied || "Kopyalandı!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter out non-array entries (like 'content' string)
    const fileGroups = Object.entries(data).filter(
        ([, files]) => Array.isArray(files) && files.length > 0
    ) as [string, FileContent[]][];

    if (fileGroups.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {fileGroups.map(([groupName, files]) => (
                <Card key={groupName}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2 capitalize">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            {groupName.replace(/([A-Z])/g, " $1").trim()}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({files.length} {files.length === 1 ? "file" : "files"})
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {files.map((file, index) => {
                            const fileName = file.fileName.split("/").pop() || file.fileName;
                            const itemId = `${groupName}-${index}`;
                            const isOpen = expanded === itemId;

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
