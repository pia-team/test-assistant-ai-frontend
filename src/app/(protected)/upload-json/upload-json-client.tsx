"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, FileJson, Loader2, X, AlertCircle, Plus, Tag as TagIcon, CheckCircle2, RefreshCw, Search, FolderOpen, FolderPlus, FileText, Rocket } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { GeneratedFilesDisplay } from "@/components/generated-files-display";
import { type UploadJsonResponse } from "@/app/actions/upload-json-action";
import { getAllTagsAction, getProjectFoldersAction } from "@/app/actions/tag-actions";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
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
            fileRequired?: string;
            fileNameRequired?: string;
            fileNameRegexError?: string;
            serverError?: string;
            jobAlreadyRunning?: string;
            tagNoSpace?: string;
            filesCreatedSuccess?: string;
            fileAndConfig?: string;
            fileAndConfigDesc?: string;
            tagManagement?: string;
            selected?: string;
            clickToChange?: string;
            dragFileHere?: string;
            clickToSelect?: string;
            fileNameLabel?: string;
            fileNamePlaceholder?: string;
            fileNameDescription?: string;
            addToExistingFolder?: string;
            selectFolderPlaceholder?: string;
            noSelection?: string;
            or?: string;
            createNewFolder?: string;
            folderNamePlaceholder?: string;
            searchOrAddTagPlaceholder?: string;
            noTagsSelected?: string;
            quickSelect?: string;
            noSavedTags?: string;
            generatedFiles?: string;
            uploadNewFile?: string;
            takingLonger?: string;
            checkConnection?: string;
            cancel?: string;
            retry?: string;
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

    const formSchema = z.object({
        file: z.instanceof(File, { message: dictionary.uploadJson.fileRequired || "Dosya yüklenmesi zorunludur" }),
        fileBaseName: z.string()
            .min(1, dictionary.uploadJson.fileNameRequired || "Dosya adı zorunludur")
            .regex(/^[a-zA-Z0-9_-]+$/, dictionary.uploadJson.fileNameRegexError || "Sadece harf, rakam, tire ve alt çizgi kullanılabilir"),
        tags: z.array(z.string()).min(1, dictionary.uploadJson.mandatoryTagsError || "En az bir etiket seçmelisiniz"),
        selectedProjectFolder: z.string().optional(),
        customFolderName: z.string().optional(),
    });

    type FormValues = z.infer<typeof formSchema>;

    // React Hook Form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fileBaseName: "",
            tags: [],
            selectedProjectFolder: "none",
            customFolderName: "",
        },
    });

    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState("");
    const [projectFolders, setProjectFolders] = useState<string[]>([]);
    const [selectedPreviousJobId, setSelectedPreviousJobId] = useState<string>("none");

    const parseErrorMessage = (msg: string) => {
        if (!msg) return "";
        try {
            if (msg.trim().startsWith('{')) {
                const parsed = JSON.parse(msg);
                return parsed.message || parsed.error || dictionary.uploadJson.serverError || "Sunucu hatası oluştu";
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

    // Job hooks
    const { data: previousJobsData } = useJobs(0, 50, "", "UPLOAD_JSON");
    const previousUploadJobs: Job[] = previousJobsData?.content || [];
    const { data: activeJob } = useActiveJob("UPLOAD_JSON");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartUploadJsonJob();
    const clearJob = useClearJob("UPLOAD_JSON");

    const currentJob = (jobStatus || activeJob) as Job | undefined;
    const [isViewingHistorical, setIsViewingHistorical] = useState(false);
    const displayedJob = isViewingHistorical && selectedPreviousJobId !== "none"
        ? previousUploadJobs.find(j => j.id === selectedPreviousJobId)
        : currentJob;

    const isProcessing = isJobInProgress(displayedJob);
    const isComplete = isJobComplete(displayedJob);
    const isFailed = isJobFailed(displayedJob);

    // Stuck detection logic
    const [isStuck, setIsStuck] = useState(false);
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isProcessing && displayedJob?.progress === 0) {
            timer = setTimeout(() => {
                setIsStuck(true);
            }, 30000); // 30 seconds
        } else {
            setIsStuck(false);
        }
        return () => clearTimeout(timer);
    }, [isProcessing, displayedJob?.progress]);


    const result: UploadJsonResponse | null = isComplete && displayedJob?.result
        ? (displayedJob.result as UploadJsonResponse)
        : null;

    // Toast logic
    const shownToastRef = useRef<string | null>(null);
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

    // File Handling with Auto-fill
    const processSelectedFile = useCallback((file: File) => {
        // Auto-fill fileBaseName if empty
        const currentBaseName = form.getValues("fileBaseName");
        if (!currentBaseName) {
            const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
            const sanitized = baseName.replace(/[^a-zA-Z0-9_-]/g, "_");
            form.setValue("fileBaseName", sanitized, { shouldValidate: true });
        }
        form.setValue("file", file, { shouldValidate: true });
        toast.success(`${dictionary.uploadJson.selectedFile || "Dosya seçildi:"} ${file.name}`);
    }, [form, dictionary]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json") || selectedFile.name.endsWith(".har")) {
            processSelectedFile(selectedFile);
        } else {
            toast.error(dictionary.uploadJson.validJsonOnly || "Lütfen geçerli bir JSON/HAR dosyası seçin");
        }
    }, [dictionary, processSelectedFile]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (!droppedFile) return;

        if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json") || droppedFile.name.endsWith(".har")) {
            processSelectedFile(droppedFile);
        } else {
            toast.error(dictionary.uploadJson.validJsonOnly || "Lütfen geçerli bir JSON/HAR dosyası seçin");
        }
    }, [dictionary, processSelectedFile]);

    const onSubmit = async (values: FormValues) => {
        const { file, tags, fileBaseName, customFolderName, selectedProjectFolder } = values;

        clearJob(currentJob?.id);
        setIsViewingHistorical(false);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("tags", tags.join(", "));

        const effectiveProjectName = customFolderName?.trim() || (selectedProjectFolder !== "none" ? selectedProjectFolder : "") || "";
        if (effectiveProjectName) {
            formData.append("projectName", effectiveProjectName);
        }

        formData.append("fileBaseName", fileBaseName.trim());

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

    const handleNewUpload = () => {
        clearJob(currentJob?.id);
        setIsViewingHistorical(false);
        setSelectedPreviousJobId("none");
        form.reset({
            fileBaseName: "",
            tags: [],
            selectedProjectFolder: "none",
            customFolderName: "",
            file: undefined,
        });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Tag Management
    const toggleTag = (tag: string) => {
        const currentTags = form.getValues("tags");
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        form.setValue("tags", newTags, { shouldValidate: true });
    };

    const handleAddCustomTag = () => {
        if (!customTag.trim()) return;
        let tagToAdd = customTag.trim();
        if (tagToAdd.includes(" ")) {
            toast.error(dictionary.uploadJson.tagNoSpace || "Etiket adında boşluk bulunamaz");
            return;
        }
        if (!tagToAdd.startsWith("@")) {
            tagToAdd = "@" + tagToAdd;
        }
        const currentTags = form.getValues("tags");
        if (!currentTags.includes(tagToAdd)) {
            form.setValue("tags", [...currentTags, tagToAdd], { shouldValidate: true });
        }
        setCustomTag("");
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500">
            {isComplete && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

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
            </motion.div>

            {/* Status Banners - Standardized */}
            <div className="mb-8">
                <AnimatePresence mode="wait">
                    {/* Processing */}
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
                                                    ? (fullDict.progressSteps as any)?.uploadJson?.[displayedJob.stepKey] || displayedJob.stepKey
                                                    : dictionary.uploadJson.processingInBackground}
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                </span>
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                                {displayedJob?.currentStep && displayedJob?.totalSteps
                                                    ? `Adım ${displayedJob.currentStep}/${displayedJob.totalSteps}`
                                                    : dictionary.uploadJson.generating || "İşleniyor..."}
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
                                        <p className="font-semibold text-amber-800 dark:text-amber-200">{dictionary.uploadJson.takingLonger || "İşlem Beklenenden Uzun Sürüyor"}</p>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">{dictionary.uploadJson.checkConnection || "Bağlantı kopmuş olabilir. Sayfayı yenilemeyi deneyin."}</p>
                                    </div>
                                    <Button onClick={handleNewUpload} variant="ghost" size="sm" className="text-amber-800 hover:bg-amber-100">
                                        {dictionary.uploadJson.cancel || "İptal Et"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* FAILED */}
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
                                            {dictionary.common.error || "Hata"}
                                        </h3>
                                        <p className="text-red-700 dark:text-red-300 font-medium font-mono text-sm bg-red-100/50 dark:bg-red-950/50 p-2 rounded">
                                            {parseErrorMessage(displayedJob?.error || "")}
                                        </p>
                                    </div>
                                    <Button onClick={handleNewUpload} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105">
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        {dictionary.uploadJson.uploadFailure && dictionary.uploadJson.uploadFailure.includes("tekrar") ? dictionary.uploadJson.uploadFailure : "Tekrar Dene"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* SUCCESS */}
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
                                            {dictionary.common.success} 🚀
                                        </h3>
                                        <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                                            Dosyalar başarıyla oluşturuldu.
                                        </p>
                                    </div>
                                    <Button onClick={handleNewUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
                                        <Upload className="mr-2 h-4 w-4" /> {dictionary.uploadJson.uploadNewFile || "Yeni Dosya Yükle"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LEFT COLUMN - File & Config */}
                        <div className="lg:col-span-7 space-y-8">
                            <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <CardTitle className="text-lg flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                                            <FileJson className="w-5 h-5" />
                                        </div>
                                        {dictionary.uploadJson.fileAndConfig || "Dosya ve Konfigürasyon"}
                                    </CardTitle>
                                    <CardDescription>
                                        {dictionary.uploadJson.fileAndConfigDesc || "Yüklemek istediğiniz HAR veya JSON dosyasını seçin."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    {/* Dropzone */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                                        className={`group relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-[1.02]" : "border-slate-200 dark:border-slate-800"
                                            } ${form.watch("file") ? "bg-slate-50 dark:bg-slate-900" : ""}`}
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
                                        <label htmlFor="file-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                            {form.watch("file") ? (
                                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
                                                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                                                        <FileText className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-lg text-slate-900 dark:text-slate-100">{form.watch("file").name}</p>
                                                        <p className="text-sm text-slate-500">{(form.watch("file").size / 1024).toFixed(1)} KB</p>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">{dictionary.uploadJson.clickToChange || "Değiştirmek için tıklayın"}</Badge>
                                                </motion.div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                                                        <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-lg text-slate-700 dark:text-slate-300">{dictionary.uploadJson.dragFileHere || "Dosyayı buraya sürükleyin"}</p>
                                                        <p className="text-sm text-slate-500">{dictionary.uploadJson.clickToSelect || "veya seçmek için tıklayın (.har, .json)"}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                        {/* Error Message Absolute */}
                                        {form.formState.errors.file && (
                                            <div className="absolute bottom-2 left-0 w-full text-center">
                                                <span className="text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/50 px-3 py-1 rounded-full">{form.formState.errors.file.message}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-6">
                                        <FormField
                                            control={form.control}
                                            name="fileBaseName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-base font-semibold text-slate-800 dark:text-slate-200">
                                                        {dictionary.uploadJson.fileNameLabel || "Dosya İsimlendirmesi"} <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                {...field}
                                                                className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-blue-500"
                                                                placeholder={dictionary.uploadJson.fileNamePlaceholder || "Örn: login_flow"}
                                                                disabled={isProcessing}
                                                            />
                                                            <FileText className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                                        </div>
                                                    </FormControl>
                                                    <FormDescription className="text-xs">
                                                        {dictionary.uploadJson.fileNameDescription || "Bu isim, oluşturulacak feature ve page dosyalarının prefix'i olacaktır. Dosya seçince otomatik dolar."}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                            <FormField
                                                control={form.control}
                                                name="selectedProjectFolder"
                                                render={({ field }) => (
                                                    <FormItem className={form.watch("customFolderName") ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                                                        <FormLabel className="flex items-center gap-2">
                                                            <FolderOpen className="w-4 h-4 text-slate-500" />
                                                            {dictionary.uploadJson.addToExistingFolder || "Mevcut Klasöre Ekle"}
                                                        </FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={isProcessing}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900">
                                                                    <SelectValue placeholder={dictionary.uploadJson.selectFolderPlaceholder || "Klasör seçiniz..."} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="none">{dictionary.uploadJson.noSelection || "Seçim Yok"}</SelectItem>
                                                                {projectFolders.map(folder => (
                                                                    <SelectItem key={folder} value={folder}>{folder}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="flex items-center justify-center text-xs font-bold text-slate-400 md:hidden">{dictionary.uploadJson.or || "- VEYA -"}</div>

                                            <FormField
                                                control={form.control}
                                                name="customFolderName"
                                                render={({ field }) => (
                                                    <FormItem className={form.watch("selectedProjectFolder") !== "none" ? "opacity-50 pointer-events-none transition-opacity" : "transition-opacity"}>
                                                        <FormLabel className="flex items-center gap-2">
                                                            <FolderPlus className="w-4 h-4 text-slate-500" />
                                                            {dictionary.uploadJson.createNewFolder || "Yeni Klasör Oluştur"}
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                className="h-11 bg-slate-50 dark:bg-slate-900"
                                                                placeholder={dictionary.uploadJson.folderNamePlaceholder || "Klasör adı giriniz..."}
                                                                disabled={isProcessing}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN - Tags */}
                        <div className="lg:col-span-5 space-y-8">
                            <Card className="h-full border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                                                <TagIcon className="w-5 h-5" />
                                            </div>
                                            {dictionary.uploadJson.tagManagement || "Etiket (Tag) Yönetimi"} <span className="text-red-500">*</span>
                                        </CardTitle>
                                        <Badge variant="outline" className="font-mono text-xs">{form.watch("tags").length} {dictionary.uploadJson.selected || "Seçildi"}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 flex flex-col gap-6">
                                    <FormField
                                        control={form.control}
                                        name="tags"
                                        render={() => (
                                            <FormItem className="flex-1 flex-col">
                                                <div className="relative mb-4">
                                                    <Input
                                                        value={customTag}
                                                        onChange={(e) => setCustomTag(e.target.value)}
                                                        placeholder={dictionary.uploadJson.searchOrAddTagPlaceholder || "Etiket arayın veya ekleyin (@smoke, @reg)..."}
                                                        className="h-11 pl-10 pr-12 bg-slate-50 dark:bg-slate-900 border-slate-200 focus:ring-indigo-500"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                handleAddCustomTag();
                                                            }
                                                        }}
                                                    />
                                                    <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="absolute right-1 top-1 h-9 w-9 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                                                        onClick={handleAddCustomTag}
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </Button>
                                                </div>

                                                {/* Selected Tags Area */}
                                                <div className="min-h-[100px] p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 mb-6">
                                                    {form.watch("tags").length === 0 ? (
                                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic">
                                                            <TagIcon className="w-8 h-8 mb-2 opacity-20" />
                                                            {dictionary.uploadJson.noTagsSelected || "Henüz etiket seçilmedi. En az bir tane zorunlu."}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            <AnimatePresence>
                                                                {form.watch("tags").map(tag => (
                                                                    <motion.div key={tag} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                                                        <Badge
                                                                            className="pl-3 pr-1 py-1.5 text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800 border-indigo-200 cursor-pointer flex items-center gap-1 group"
                                                                            onClick={() => toggleTag(tag)}
                                                                        >
                                                                            {tag}
                                                                            <span className="p-0.5 rounded-full bg-indigo-200/50 group-hover:bg-indigo-300/50 transition-colors">
                                                                                <X className="w-3 h-3" />
                                                                            </span>
                                                                        </Badge>
                                                                    </motion.div>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Suggested Tags */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{dictionary.uploadJson.quickSelect || "Hızlı Seçim"}</h4>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                                                        {existingTags.filter(t => !form.watch("tags").includes(t)).map(tag => (
                                                            <Badge
                                                                key={tag}
                                                                variant="outline"
                                                                className="cursor-pointer py-1.5 px-3 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-all border-slate-200 text-slate-600 dark:text-slate-400"
                                                                onClick={() => toggleTag(tag)}
                                                            >
                                                                <Plus className="w-3 h-3 mr-1.5 opacity-50" />
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {existingTags.length === 0 && (
                                                            <span className="text-sm text-slate-400">{dictionary.uploadJson.noSavedTags || "Kayıtlı etiket bulunamadı."}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <FormMessage className="mt-4" />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="mt-auto pt-6">
                                        <Button
                                            type="submit"
                                            disabled={isProcessing || startJobMutation.isPending}
                                            className={`w-full h-14 text-lg font-bold shadow-lg transition-all ${isProcessing
                                                ? "bg-slate-100 text-slate-400"
                                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-indigo-500/25 text-white transform hover:-translate-y-0.5"
                                                }`}
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <Loader2 className="animate-spin mr-3 h-5 w-5" />
                                                    {dictionary.uploadJson.generating || "İşleniyor..."}
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="mr-3 h-5 w-5" />
                                                    {dictionary.uploadJson.generate || "Testleri Oluştur"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </form>
            </Form>

            {/* Results */}
            {result && isComplete && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-12"
                >
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{dictionary.uploadJson.generatedFiles || "Oluşturulan Dosyalar"}</h2>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1" />
                    </div>
                    <GeneratedFilesDisplay data={result} dictionary={dictionary} onSuccessAll={handleNewUpload} />
                </motion.div>
            )}
        </div>
    );
}
