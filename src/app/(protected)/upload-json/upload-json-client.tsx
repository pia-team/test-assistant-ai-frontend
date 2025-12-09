"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileJson, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { uploadJsonAction, type UploadJsonResponse } from "@/app/actions/upload-json-action";
import { GeneratedFilesDisplay } from "@/components/generated-files-display";

interface UploadJsonClientProps {
    dictionary: {
        uploadJson: {
            title: string;
            subtitle: string;
            dropzone: string;
            generate: string;
            generating: string;
            selectedFile?: string;
            validJsonOnly?: string;
            uploadFailure?: string;
            networkError?: string;
            noStepsReturned?: string;
        };
        common: {
            error: string;
            success: string;
            copy?: string;
            download?: string;
            copied?: string;
        };
    };
}

export function UploadJsonClient({ dictionary }: UploadJsonClientProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState<UploadJsonResponse | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            return uploadJsonAction(formData);
        },
        onSuccess: (data) => {
            setResult(data);
            toast.success(dictionary.common.success);
        },
        onError: (error: Error) => {
            toast.error(error.message || dictionary.uploadJson.uploadFailure || "Upload failed");
        },
    });

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json") || selectedFile.name.endsWith(".har")) {
            setFile(selectedFile);
            setResult(null);
            toast.success(`${dictionary.uploadJson.selectedFile || "Dosya seçildi:"} ${selectedFile.name}`);
        } else {
            toast.error(dictionary.uploadJson.validJsonOnly || "Lütfen geçerli bir JSON/HAR dosyası seçin");
        }
    }, [dictionary]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (!droppedFile) return;

        if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json") || droppedFile.name.endsWith(".har")) {
            setFile(droppedFile);
            setResult(null);
            toast.success(`${dictionary.uploadJson.selectedFile || "Dosya seçildi:"} ${droppedFile.name}`);
        } else {
            toast.error(dictionary.uploadJson.validJsonOnly || "Lütfen geçerli bir JSON/HAR dosyası seçin");
        }
    }, [dictionary]);

    const handleUpload = () => {
        if (!file) return;
        uploadMutation.mutate(file);
    };

    const handleClearFile = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <h1 className="text-3xl font-bold">{dictionary.uploadJson.title}</h1>
                <p className="text-muted-foreground">{dictionary.uploadJson.subtitle}</p>
            </motion.div>

            {/* Upload Card */}
            <Card className="relative overflow-hidden">
                {/* Loading Overlay */}
                {uploadMutation.isPending && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center"
                    >
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-sm font-medium">{dictionary.uploadJson.generating}</span>
                            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-primary rounded-full"
                                    initial={{ width: "0%" }}
                                    animate={{ width: "100%" }}
                                    transition={{ duration: 30, ease: "linear" }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                <CardHeader>
                    <CardTitle className="text-lg">JSON / HAR Dosyası</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Dropzone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        className={`
                            border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                            ${isDragging
                                ? "border-primary bg-primary/5 scale-[1.02]"
                                : "border-border hover:border-primary/50 hover:bg-muted/30"
                            }
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.har"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                            <div className="flex flex-col items-center gap-3">
                                {file ? (
                                    <>
                                        <div className="relative">
                                            <FileJson className="w-12 h-12 text-primary" />
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleClearFile();
                                                }}
                                                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <span className="font-medium">{file.name}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className={`w-12 h-12 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                                        <span className="text-muted-foreground">
                                            {dictionary.uploadJson.dropzone}
                                        </span>
                                        <span className="text-xs text-muted-foreground/70">
                                            JSON veya HAR dosyaları desteklenir
                                        </span>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending || !file}
                        className="w-full gap-2"
                        size="lg"
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {dictionary.uploadJson.generating}
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                {dictionary.uploadJson.generate}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Results */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <GeneratedFilesDisplay data={result} dictionary={dictionary} />
                </motion.div>
            )}
        </div>
    );
}
