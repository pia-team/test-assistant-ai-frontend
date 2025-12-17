"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileJson, Loader2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GeneratedFilesDisplay } from "@/components/generated-files-display";
import { type UploadJsonResponse } from "@/app/actions/upload-json-action";
import {
    useActiveJob,
    useJobStatus,
    useStartUploadJsonJob,
    useClearJob,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";

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
            cardTitle?: string;
            supportedFormats?: string;
            processingInBackground?: string;
            jobAlreadyRunning?: string;
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("UPLOAD_JSON");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartUploadJsonJob();
    const clearJob = useClearJob("UPLOAD_JSON");
    const { isConnected } = useSocket();

    // Sync job status with active job - socket updates both caches
    const currentJob = jobStatus ?? activeJob;
    const isProcessing = isJobInProgress(currentJob);
    const isComplete = isJobComplete(currentJob);
    const isFailed = isJobFailed(currentJob);

    // Extract result from completed job
    const result: UploadJsonResponse | null = isComplete && currentJob?.result
        ? (currentJob.result as UploadJsonResponse)
        : null;

    // Track shown toasts to prevent duplicates
    const shownToastRef = useRef<string | null>(null);

    // Show toast on completion (only once per job)
    useEffect(() => {
        if (!currentJob?.id) return;
        
        if (isComplete && shownToastRef.current !== `complete-${currentJob.id}`) {
            shownToastRef.current = `complete-${currentJob.id}`;
            toast.success(dictionary.common.success);
        }
        if (isFailed && shownToastRef.current !== `failed-${currentJob.id}`) {
            shownToastRef.current = `failed-${currentJob.id}`;
            toast.error(currentJob.error || dictionary.uploadJson.uploadFailure || "Upload failed");
        }
    }, [isComplete, isFailed, currentJob?.id, currentJob?.error, dictionary]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json") || selectedFile.name.endsWith(".har")) {
            setFile(selectedFile);
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
            toast.success(`${dictionary.uploadJson.selectedFile || "Dosya seçildi:"} ${droppedFile.name}`);
        } else {
            toast.error(dictionary.uploadJson.validJsonOnly || "Lütfen geçerli bir JSON/HAR dosyası seçin");
        }
    }, [dictionary]);

    const handleUpload = () => {
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        startJobMutation.mutate(formData, {
            onError: (error) => {
                if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                    toast.warning(dictionary.uploadJson.jobAlreadyRunning || "Bu işlem zaten çalışıyor");
                } else {
                    toast.error(error.message || dictionary.uploadJson.uploadFailure || "Upload failed");
                }
            },
        });
    };

    const handleClearFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleNewUpload = () => {
        clearJob(currentJob?.id);
        setFile(null);
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

            {/* Processing Status Banner */}
            {isProcessing && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-blue-500/50 bg-blue-500/10">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                <div className="flex-1">
                                    <p className="font-medium text-blue-500">
                                        {dictionary.uploadJson.processingInBackground || "Arka planda işleniyor..."}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {dictionary.uploadJson.generating}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-blue-500">
                                    {currentJob?.status}
                                </Badge>
                            </div>
                            <Progress className="mt-3" value={currentJob?.status === "RUNNING" ? 50 : 10} />
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Error Banner */}
            {isFailed && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-red-500/50 bg-red-500/10">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                <div className="flex-1">
                                    <p className="font-medium text-red-500">İşlem Başarısız</p>
                                    <p className="text-sm text-muted-foreground">{currentJob?.error}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleNewUpload}>
                                    Yeniden Dene
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Upload Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">{dictionary.uploadJson.cardTitle}</CardTitle>
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
                            ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                        `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.har"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileChange}
                            disabled={isProcessing}
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
                                                disabled={isProcessing}
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
                                            {dictionary.uploadJson.supportedFormats}
                                        </span>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* Generate Button */}
                    {isComplete ? (
                        <Button
                            onClick={handleNewUpload}
                            className="w-full gap-2"
                            size="lg"
                            variant="outline"
                        >
                            <Upload className="w-4 h-4" />
                            Yeni Dosya Yükle
                        </Button>
                    ) : (
                        <Button
                            onClick={handleUpload}
                            disabled={isProcessing || !file || startJobMutation.isPending}
                            className="w-full gap-2"
                            size="lg"
                        >
                            {startJobMutation.isPending || isProcessing ? (
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
                    )}
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
