"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileJson, Loader2, X, AlertCircle, Plus, Tag as TagIcon, CheckCircle2, RefreshCw, Search, User } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { GeneratedFilesDisplay } from "@/components/generated-files-display";
import { type UploadJsonResponse } from "@/app/actions/upload-json-action";
import { getAllTagsAction, getProjectFoldersAction } from "@/app/actions/tag-actions";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    useActiveJob,
    useJobStatus,
    useStartUploadJsonJob,
    useClearJob,
    useJobs,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
    type Job,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import { useLocale } from "@/components/locale-context";

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
            selectTags?: string;
            addCustomTag?: string;
            tagsDescription?: string;
            folderNameLabel?: string;
            selectExistingFolder?: string;
            historicalUploads?: string;
            mandatoryTagsError?: string;
            searchPlaceholder?: string;
            unnamedUpload?: string;
            unknownUploader?: string;
        };
        common: {
            error: string;
            success: string;
            copy?: string;
            download?: string;
            copied?: string;
            none?: string;
        };
    };
}

export function UploadJsonClient({ dictionary }: UploadJsonClientProps) {
    const { dictionary: fullDict } = useLocale();
    const { width, height } = useWindowSize();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState("");

    const [projectFolders, setProjectFolders] = useState<string[]>([]);
    const [selectedProjectFolder, setSelectedProjectFolder] = useState<string>("none");
    const [customFolderName, setCustomFolderName] = useState("");
    const [selectedPreviousJobId, setSelectedPreviousJobId] = useState<string>("none");
    const [historicalSearch, setHistoricalSearch] = useState("");

    const parseErrorMessage = (msg: string) => {
        if (!msg) return "";
        try {
            if (msg.trim().startsWith('{')) {
                const parsed = JSON.parse(msg);
                return parsed.message || parsed.error || "Sunucu hatası oluştu";
            }
        } catch (e) { }
        return msg;
    };

    // Fetch existing tags and folders
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [tags, folders] = await Promise.all([
                    getAllTagsAction(),
                    getProjectFoldersAction()
                ]);
                setExistingTags(tags || []);
                setProjectFolders(folders || []);
            } catch (error) {
                console.error("Failed to fetch initial data:", error);
            }
        };
        fetchData();
    }, []);

    // Fetch previous uploads
    const { data: previousJobsData } = useJobs(0, 50, "", "UPLOAD_JSON");
    const previousUploadJobs: Job[] = previousJobsData?.content || [];

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("UPLOAD_JSON");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartUploadJsonJob();
    const clearJob = useClearJob("UPLOAD_JSON");
    const { isConnected } = useSocket();

    // Sync job status with active job - socket updates both caches
    const currentJob = (jobStatus || activeJob) as Job | undefined;

    // Check if we are viewing a historical job or a new one
    const [isViewingHistorical, setIsViewingHistorical] = useState(false);
    const displayedJob = isViewingHistorical && selectedPreviousJobId !== "none"
        ? previousUploadJobs.find(j => j.id === selectedPreviousJobId)
        : currentJob;

    const isProcessing = isJobInProgress(displayedJob);
    const isComplete = isJobComplete(displayedJob);
    const isFailed = isJobFailed(displayedJob);

    // Extract result from completed job
    const result: UploadJsonResponse | null = isComplete && displayedJob?.result
        ? (displayedJob.result as UploadJsonResponse)
        : null;

    // ... rest of the logic ...

    // Stuck detection logic
    const [isStuck, setIsStuck] = useState(false);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isProcessing && currentJob?.progress === 0) {
            timer = setTimeout(() => {
                setIsStuck(true);
            }, 30000); // 30 seconds
        } else {
            setIsStuck(false);
        }
        return () => clearTimeout(timer);
    }, [isProcessing, currentJob?.progress]);

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
            toast.error(parseErrorMessage(currentJob.error || "") || dictionary.uploadJson.uploadFailure || "Upload failed");
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

        // Mandatory Tags Validation
        if (selectedTags.length === 0) {
            toast.error(dictionary.uploadJson.mandatoryTagsError || "Lütfen en az bir etiket seçin!");
            return;
        }

        // Clear previous job state before starting a new one
        clearJob(currentJob?.id);
        setIsViewingHistorical(false);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("tags", selectedTags.join(", "));

        const effectiveProjectName = customFolderName.trim() || (selectedProjectFolder !== "none" ? selectedProjectFolder : "");
        if (effectiveProjectName) {
            formData.append("projectName", effectiveProjectName);
        }

        startJobMutation.mutate(formData, {
            onError: (error) => {
                if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                    toast.warning(dictionary.uploadJson.jobAlreadyRunning || "Bu işlem zaten çalışıyor");
                } else {
                    const friendlyError = parseErrorMessage(error.message);
                    toast.error(friendlyError || dictionary.uploadJson.uploadFailure || "Upload failed");
                }
            },
        });
    };

    const handlePreviousJobSelect = (jobId: string) => {
        setSelectedPreviousJobId(jobId);
        setIsViewingHistorical(jobId !== "none");
        if (jobId !== "none") {
            const job = previousUploadJobs.find(j => j.id === jobId);
            if (job && job.request) {
                // Optionally restore tags or other data from the job request if needed
            }
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleAddCustomTag = () => {
        if (!customTag.trim()) return;

        let tagToAdd = customTag.trim();
        if (!tagToAdd.startsWith("@")) {
            tagToAdd = "@" + tagToAdd;
        }

        if (!selectedTags.includes(tagToAdd)) {
            setSelectedTags(prev => [...prev, tagToAdd]);
        }
        setCustomTag("");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddCustomTag();
        }
    };

    const handleClearFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleNewUpload = () => {
        clearJob(currentJob?.id);
        setIsViewingHistorical(false);
        setSelectedPreviousJobId("none");
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSuccessAll = () => {
        handleNewUpload();
        setSelectedTags([]);
        setCustomTag("");
        setCustomFolderName("");
        setSelectedProjectFolder("none");
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500">
            {isComplete && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        {dictionary.uploadJson.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                        {dictionary.uploadJson.subtitle}
                    </p>
                </div>

                {/* Historical Uploads Dropdown */}
                {previousUploadJobs.length > 0 && (
                    <div className="flex flex-col gap-1.5 min-w-[300px]">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            {dictionary.uploadJson.historicalUploads || "Past Uploads"}
                        </label>
                        <Select value={selectedPreviousJobId} onValueChange={handlePreviousJobSelect}>
                            <SelectTrigger className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-800 h-10 w-full">
                                <SelectValue placeholder="Select previous upload" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px] w-[350px]">
                                <div className="p-2 border-b sticky top-0 bg-popover z-10">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder={dictionary.uploadJson.searchPlaceholder || "Search by file or user..."}
                                            value={historicalSearch}
                                            onChange={(e) => setHistoricalSearch(e.target.value)}
                                            className="pl-8 h-9 text-sm focus-visible:ring-indigo-500/20"
                                            onClick={(e) => e.stopPropagation()}
                                            step={undefined}
                                        />
                                    </div>
                                </div>
                                <SelectItem value="none">{dictionary.common.none || "None"}</SelectItem>
                                {previousUploadJobs
                                    .filter(job => {
                                        const searchTerm = historicalSearch.toLowerCase();
                                        const fileName = ((job.request as any)?.fileName || "").toLowerCase();
                                        const userName = (job.username || job.user?.fullName || job.user?.username || "").toLowerCase();
                                        return fileName.includes(searchTerm) || userName.includes(searchTerm);
                                    })
                                    .slice(0, 50)
                                    .map((job) => {
                                        const uploaderName = job.user?.fullName || job.username || job.user?.username || dictionary.uploadJson.unknownUploader || "Unknown";
                                        return (
                                            <SelectItem key={job.id} value={job.id} className="py-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="font-semibold text-sm truncate max-w-[180px]">
                                                            {(job.request as any)?.fileName || dictionary.uploadJson.unnamedUpload || "Unnamed Upload"}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {new Date(job.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        <User className="w-3 h-3" />
                                                        <span className="truncate">{uploaderName}</span>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </motion.div>

            {/* Status Banners Area */}
            <div className="mb-8">
                <AnimatePresence mode="wait">
                    {/* Processing Status Banner */}
                    {isProcessing && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            exit={{ opacity: 0, height: 0, scale: 0.95 }}
                            transition={{ type: "spring", bounce: 0.3 }}
                        >
                            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
                                <CardContent className="p-6">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                                            <div className="relative p-3 bg-white dark:bg-slate-800 rounded-full shadow-md">
                                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                {displayedJob?.stepKey
                                                    ? (fullDict.progressSteps as Record<string, Record<string, string>>)?.uploadJson?.[displayedJob.stepKey] || displayedJob.stepKey
                                                    : dictionary.uploadJson.processingInBackground || "Arka planda işleniyor..."}
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                </span>
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                                {displayedJob?.stepKey && displayedJob?.currentStep && displayedJob?.totalSteps
                                                    ? `Adım ${displayedJob.currentStep}/${displayedJob.totalSteps}`
                                                    : "İşlem devam ediyor..."}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                                %{displayedJob?.progress || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-3 bg-blue-100 dark:bg-blue-950/50 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${displayedJob?.progress || 0}%` }}
                                            transition={{ ease: "easeInOut" }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Stuck Warning */}
                    {isStuck && !isFailed && !isComplete && (
                        <motion.div
                            key="stuck"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="mt-4"
                        >
                            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full text-amber-600">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-amber-800 dark:text-amber-200">İşlem Beklenenden Uzun Sürüyor</p>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">Bağlantı kopmuş olabilir. Sayfayı yenilemeyi deneyin.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="bg-white/50 border-amber-300 text-amber-800 hover:bg-amber-100">
                                            <RefreshCw className="w-3 h-3 mr-2" /> Yenile
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={handleNewUpload} className="text-amber-800 hover:bg-amber-100">
                                            İptal Et
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Error Banner */}
                    {isFailed && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, rotateX: -90 }}
                            animate={{ opacity: 1, rotateX: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 overflow-hidden relative">
                                <div className="absolute left-0 top-0 w-1 h-full bg-red-500" />
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                        <AlertCircle className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
                                            İşlem Başarısız
                                        </h3>
                                        <p className="text-red-700 dark:text-red-300 font-medium font-mono text-sm bg-red-100/50 dark:bg-red-950/50 p-2 rounded">
                                            {parseErrorMessage(displayedJob?.error || "")}
                                        </p>
                                    </div>
                                    <Button onClick={handleNewUpload} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Yeniden Dene
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Success Banner */}
                    {isComplete && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                        >
                            <Card className="border-0 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                                <CardContent className="p-6 relative z-10 flex items-center gap-5">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-emerald-400/30 blur-xl rounded-full" />
                                        <div className="p-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full text-white shadow-lg">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                                            İşlem Başarıyla Tamamlandı! 🚀
                                        </h3>
                                        <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                                            Testler oluşturuldu.
                                        </p>
                                    </div>
                                    <Button onClick={handleNewUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
                                        <Upload className="w-4 h-4 mr-2" />
                                        Yeni Dosya
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upload Card */}
                <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-300 hover:shadow-2xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white">
                                <FileJson className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block">{dictionary.uploadJson.cardTitle}</span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 block mt-0.5">JSON veya HAR formatında</span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Folder Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    {dictionary.uploadJson.folderNameLabel || "Custom Folder Name"}
                                </label>
                                <Input
                                    value={customFolderName}
                                    onChange={(e) => setCustomFolderName(e.target.value)}
                                    placeholder="Enter new folder name..."
                                    className="bg-muted/50"
                                    disabled={isProcessing}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    {dictionary.uploadJson.selectExistingFolder || "Select Existing Folder"}
                                </label>
                                <Select value={selectedProjectFolder} onValueChange={setSelectedProjectFolder}>
                                    <SelectTrigger className="bg-muted/50">
                                        <SelectValue placeholder="Select folder" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{dictionary.common.none || "None"}</SelectItem>
                                        {projectFolders.map(folder => (
                                            <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

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
                    </CardContent>
                </Card>

                {/* Right Side Card for Tags & Generate */}
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-slate-900/5 dark:ring-white/10">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TagIcon className="w-5 h-5 text-indigo-500" />
                            Tags Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Tag Selection */}
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <p className="text-xs text-muted-foreground">
                                    {dictionary.uploadJson.tagsDescription || "Oluşturulacak testlere eklemek istediğiniz Cucumber etiketlerini seçin"}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                <AnimatePresence>
                                    {selectedTags.map(tag => (
                                        <motion.div
                                            key={tag}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.8 }}
                                        >
                                            <Badge
                                                variant="default"
                                                className="px-3 py-1 gap-1 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                                onClick={() => toggleTag(tag)}
                                            >
                                                {tag}
                                                <X className="w-3 h-3 hover:text-red-300" />
                                            </Badge>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    value={customTag}
                                    onChange={(e) => setCustomTag(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={dictionary.uploadJson.addCustomTag || "Yeni etiket ekle... (@smoke)"}
                                    disabled={isProcessing}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleAddCustomTag}
                                    disabled={isProcessing || !customTag.trim()}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>

                            {existingTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {existingTags.filter(tag => !selectedTags.includes(tag)).slice(0, 10).map(tag => (
                                        <Badge
                                            key={tag}
                                            variant="outline"
                                            className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 transition-colors"
                                            onClick={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            )}
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
            </div>

            {/* Results */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                >
                    <GeneratedFilesDisplay data={result} dictionary={dictionary} onSuccessAll={handleSuccessAll} />
                </motion.div>
            )}
        </div>
    );
}
