"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/components/locale-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Rocket,
    Globe,
    FileCode,
    Loader2,
    Download,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    RefreshCw,
    Upload
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import SyntaxHighlighter from "react-syntax-highlighter";
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import {
    useActiveJob,
    useJobStatus,
    useStartGenerateTestsJob,
    useClearJob,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";

// Zod schema for generate tests form validation
const generateTestsFormSchema = z.object({
    url: z.string().min(1, "URL zorunludur").url("Geçerli bir URL giriniz"),
    hasFeatureFile: z.boolean(),
    hasAPITests: z.boolean(),
    hasTestPayload: z.boolean(),
    hasSwaggerTest: z.boolean(),
});

type GenerateTestsFormValues = z.infer<typeof generateTestsFormSchema>;

interface GenerateTestsClientProps {
    dictionary: {
        generateTests: {
            title: string;
            subtitle: string;
            configuration: string;
            targetUrl: string;
            targetUrlPlaceholder: string;
            jsonSchema: string;
            jsonSchemaPlaceholder: string;
            outputOptions: string;
            featureFile: string;
            apiTests: string;
            testPayload: string;
            swaggerTests: string;
            generateTestSuite: string;
            generating: string;
            readyToGenerate: string;
            readyToGenerateDesc: string;
            testsGeneratedSuccess?: string;
            errorGeneratingTests?: string;
            download?: string;
            generatedResults?: string;
            processingInBackground?: string;
            jobAlreadyRunning?: string;
            newGenerate?: string;
            urlExample?: string;
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

interface GeneratedResult {
    featureFile?: string;
    apiTests?: string;
    testPayload?: string;
    swaggerTests?: string;
}

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

// Swagger URL validation - accepts common Swagger/OpenAPI URL patterns
const isValidSwaggerUrl = (url: string): boolean => {
    if (!url.trim()) return false;

    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const href = urlObj.href.toLowerCase();

        // Check for common Swagger/OpenAPI patterns
        const swaggerPatterns = [
            /swagger/i,
            /openapi/i,
            /api-docs/i,
            /\.json$/i,
            /\.yaml$/i,
            /\.yml$/i,
            /v2\/api-docs/i,
            /v3\/api-docs/i,
        ];

        return swaggerPatterns.some(pattern => pattern.test(pathname) || pattern.test(href));
    } catch {
        return false;
    }
};

export function GenerateTestsClient({ dictionary }: GenerateTestsClientProps) {
    const { dictionary: fullDict } = useLocale();
    const { width, height } = useWindowSize();
    const [copiedTab, setCopiedTab] = useState<string | null>(null);

    // React Hook Form setup with Zod validation
    const form = useForm<GenerateTestsFormValues>({
        resolver: zodResolver(generateTestsFormSchema),
        defaultValues: {
            url: "",
            hasFeatureFile: true,
            hasAPITests: true,
            hasTestPayload: false,
            hasSwaggerTest: false,
        },
    });

    const { watch, setValue, handleSubmit, formState: { errors } } = form;
    const url = watch("url");
    const hasFeatureFile = watch("hasFeatureFile");
    const hasAPITests = watch("hasAPITests");
    const hasTestPayload = watch("hasTestPayload");
    const hasSwaggerTest = watch("hasSwaggerTest");

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("GENERATE_TESTS");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartGenerateTestsJob();
    const clearJob = useClearJob("GENERATE_TESTS");
    const { isConnected } = useSocket();



    // Sync job status with active job - socket updates both caches
    const currentJob = jobStatus ?? activeJob;
    const isProcessing = isJobInProgress(currentJob);
    const isComplete = isJobComplete(currentJob);
    const isFailed = isJobFailed(currentJob);

    // Extract result from completed job
    const result: GeneratedResult | null = isComplete && currentJob?.result
        ? (currentJob.result as GeneratedResult)
        : null;

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

    // Track shown toasts to prevent duplicates
    const shownToastRef = useRef<string | null>(null);

    // Show toast on completion (only once per job)
    useEffect(() => {
        if (!currentJob?.id) return;

        if (isComplete && shownToastRef.current !== `complete-${currentJob.id}`) {
            shownToastRef.current = `complete-${currentJob.id}`;
            toast.success(dictionary.generateTests.testsGeneratedSuccess || dictionary.common.success);
        }
        if (isFailed && shownToastRef.current !== `failed-${currentJob.id}`) {
            shownToastRef.current = `failed-${currentJob.id}`;
            toast.error(parseErrorMessage(currentJob.error || "") || dictionary.generateTests.errorGeneratingTests || dictionary.common.error);
        }
    }, [isComplete, isFailed, currentJob?.id, currentJob?.error, dictionary]);

    // Handle URL change with validation
    const handleUrlChange = (value: string) => {
        setValue("url", value);
    };

    const onSubmit = (data: GenerateTestsFormValues) => {
        if (!isValidSwaggerUrl(data.url)) {
            form.setError("url", { message: "Lütfen geçerli bir Swagger/OpenAPI URL'si girin" });
            return;
        }

        // Clear previous job state before starting a new one to prevent UI sticking
        clearJob(currentJob?.id);

        startJobMutation.mutate(
            {
                url: data.url,
                jsonSchema: "",
                hasFeatureFile: data.hasFeatureFile,
                hasAPITests: data.hasAPITests,
                hasTestPayload: data.hasTestPayload,
                hasSwaggerTest: data.hasSwaggerTest,
            },
            {
                onError: (error) => {
                    if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                        toast.warning(dictionary.generateTests.jobAlreadyRunning || "Bu işlem zaten çalışıyor");
                    } else {
                        toast.error(parseErrorMessage(error.message));
                    }
                },
            }
        );
    };

    const handleGenerate = handleSubmit(onSubmit);

    const handleNewGeneration = () => {
        clearJob(currentJob?.id);
    };

    const copyToClipboard = async (content: string, tab: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedTab(tab);
        toast.success(dictionary.common.copied || "Kopyalandı!");
        setTimeout(() => setCopiedTab(null), 2000);
    };

    const canGenerate = url.trim() && isValidSwaggerUrl(url) && !isProcessing && !errors.url;

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
                        {dictionary.generateTests.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                        {dictionary.generateTests.subtitle}
                    </p>
                </div>
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
                                                {currentJob?.stepKey
                                                    ? (fullDict.progressSteps as Record<string, Record<string, string>>)?.generateTests?.[currentJob.stepKey] || currentJob.stepKey
                                                    : dictionary.generateTests.processingInBackground || "Arka planda işleniyor..."}
                                                <span className="flex h-2 w-2 relative">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                </span>
                                            </h3>
                                            <p className="text-slate-600 dark:text-slate-400 font-medium">
                                                {currentJob?.stepKey && currentJob?.currentStep && currentJob?.totalSteps
                                                    ? `Adım ${currentJob.currentStep}/${currentJob.totalSteps}`
                                                    : "İşlem devam ediyor..."}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
                                                %{currentJob?.progress || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-3 bg-blue-100 dark:bg-blue-950/50 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${currentJob?.progress || 0}%` }}
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
                                        <Button variant="ghost" size="sm" onClick={handleNewGeneration} className="text-amber-800 hover:bg-amber-100">
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
                                            {parseErrorMessage(currentJob?.error || "")}
                                        </p>
                                    </div>
                                    <Button onClick={handleNewGeneration} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105">
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
                                            Testler üretildi.
                                        </p>
                                    </div>
                                    <Button onClick={handleNewGeneration} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
                                        <Rocket className="w-4 h-4 mr-2" />
                                        Yeni Test
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="grid lg:grid-cols-5 gap-6">
                {/* Configuration Card - Left Side */}
                <Card className="lg:col-span-2 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-slate-900/5 dark:ring-white/10 transition-all duration-300 hover:shadow-2xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 text-white">
                                <Rocket className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block">{dictionary.generateTests.configuration}</span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 block mt-0.5">Test parametrelerini belirleyin</span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Target URL - Swagger Only */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                {dictionary.generateTests.targetUrl}
                                <span className="text-xs text-muted-foreground/60">(Swagger/OpenAPI)</span>
                            </Label>
                            <Input
                                placeholder={dictionary.generateTests.targetUrlPlaceholder}
                                value={url}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                disabled={isProcessing}
                                className={errors.url ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                            {errors.url && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.url.message}
                                </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                                Örnek: https://api.example.com/swagger.json, /v2/api-docs, /openapi.yaml
                            </p>
                        </div>

                        {/* Output Options */}
                        <div className="space-y-3">
                            <Label className="text-muted-foreground">
                                {dictionary.generateTests.outputOptions}
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasFeatureFile}
                                        onCheckedChange={(v) => setValue("hasFeatureFile", v)}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.featureFile}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasAPITests}
                                        onCheckedChange={(v) => setValue("hasAPITests", v)}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.apiTests}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasTestPayload}
                                        onCheckedChange={(v) => setValue("hasTestPayload", v)}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.testPayload}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasSwaggerTest}
                                        onCheckedChange={(v) => setValue("hasSwaggerTest", v)}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.swaggerTests}</Label>
                                </div>
                            </div>
                        </div>

                        {/* Generate Button */}
                        {isComplete ? (
                            <Button
                                onClick={handleNewGeneration}
                                className="w-full gap-2"
                                size="lg"
                                variant="outline"
                            >
                                <Rocket className="w-4 h-4" />
                                {dictionary.generateTests.newGenerate || "Yeni Test Üret"}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleGenerate}
                                disabled={!canGenerate || startJobMutation.isPending}
                                className="w-full gap-2"
                                size="lg"
                            >
                                {startJobMutation.isPending || isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {dictionary.generateTests.generating}
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="w-4 h-4" />
                                        {dictionary.generateTests.generateTestSuite}
                                    </>
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Results Card - Right Side */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg">{dictionary.generateTests.generatedResults}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!result ? (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center h-[400px]">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-4"
                                >
                                    <FileCode className="w-12 h-12 text-primary opacity-60" />
                                </motion.div>
                                <h5 className="font-semibold text-muted-foreground">
                                    {dictionary.generateTests.readyToGenerate}
                                </h5>
                                <p className="text-sm text-muted-foreground/70 text-center max-w-[300px] mt-1">
                                    {dictionary.generateTests.readyToGenerateDesc}
                                </p>
                            </div>
                        ) : (
                            /* Results Tabs */
                            <Tabs defaultValue="feature" className="w-full">
                                <TabsList className="w-full justify-start mb-4">
                                    {hasFeatureFile && result.featureFile && (
                                        <TabsTrigger value="feature">{dictionary.generateTests.featureFile}</TabsTrigger>
                                    )}
                                    {hasAPITests && result.apiTests && (
                                        <TabsTrigger value="api">{dictionary.generateTests.apiTests}</TabsTrigger>
                                    )}
                                    {hasTestPayload && result.testPayload && (
                                        <TabsTrigger value="payload">{dictionary.generateTests.testPayload}</TabsTrigger>
                                    )}
                                    {hasSwaggerTest && result.swaggerTests && (
                                        <TabsTrigger value="swagger">{dictionary.generateTests.swaggerTests}</TabsTrigger>
                                    )}
                                </TabsList>

                                {hasFeatureFile && result.featureFile && (
                                    <TabsContent value="feature">
                                        <ResultPanel
                                            content={result.featureFile}
                                            fileName="feature.feature"
                                            dictionary={dictionary}
                                            tabKey="feature"
                                            copiedTab={copiedTab}
                                            onCopy={copyToClipboard}
                                            onDownload={downloadFile}
                                        />
                                    </TabsContent>
                                )}
                                {hasAPITests && result.apiTests && (
                                    <TabsContent value="api">
                                        <ResultPanel
                                            content={result.apiTests}
                                            fileName="apiTests.json"
                                            dictionary={dictionary}
                                            tabKey="api"
                                            copiedTab={copiedTab}
                                            onCopy={copyToClipboard}
                                            onDownload={downloadFile}
                                        />
                                    </TabsContent>
                                )}
                                {hasTestPayload && result.testPayload && (
                                    <TabsContent value="payload">
                                        <ResultPanel
                                            content={result.testPayload}
                                            fileName="testPayload.json"
                                            dictionary={dictionary}
                                            tabKey="payload"
                                            copiedTab={copiedTab}
                                            onCopy={copyToClipboard}
                                            onDownload={downloadFile}
                                        />
                                    </TabsContent>
                                )}
                                {hasSwaggerTest && result.swaggerTests && (
                                    <TabsContent value="swagger">
                                        <ResultPanel
                                            content={result.swaggerTests}
                                            fileName="swaggerTests.json"
                                            dictionary={dictionary}
                                            tabKey="swagger"
                                            copiedTab={copiedTab}
                                            onCopy={copyToClipboard}
                                            onDownload={downloadFile}
                                        />
                                    </TabsContent>
                                )}
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

interface ResultPanelProps {
    content: string;
    fileName: string;
    dictionary: GenerateTestsClientProps["dictionary"];
    tabKey: string;
    copiedTab: string | null;
    onCopy: (content: string, tab: string) => void;
    onDownload: (fileName: string, content: string) => void;
}

const getLanguageFromFileName = (fileName: string): string => {
    if (fileName.endsWith(".feature")) return "gherkin";
    if (fileName.endsWith(".json")) return "json";
    return "javascript";
};

function ResultPanel({ content, fileName, dictionary, tabKey, copiedTab, onCopy, onDownload }: ResultPanelProps) {
    return (
        <div className="space-y-3">
            <div className="h-[350px] w-full rounded-lg border overflow-hidden">
                <SyntaxHighlighter
                    language={getLanguageFromFileName(fileName)}
                    style={atomOneDark}
                    customStyle={{
                        margin: 0,
                        padding: "1rem",
                        height: "100%",
                        fontSize: "0.875rem",
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                >
                    {content}
                </SyntaxHighlighter>
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onCopy(content, tabKey)}
                >
                    {copiedTab === tabKey ? (
                        <Check className="w-4 h-4 text-green-500" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                    {dictionary.common.copy || "Kopyala"}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => onDownload(fileName, content)}
                >
                    <Download className="w-4 h-4" />
                    {dictionary.common.download || "İndir"}
                </Button>
            </div>
        </div>
    );
}
