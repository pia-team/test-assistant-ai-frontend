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
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <h1 className="text-3xl font-bold">{dictionary.generateTests.title}</h1>
                <p className="text-muted-foreground">{dictionary.generateTests.subtitle}</p>
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
                                        {currentJob?.stepKey
                                            ? (fullDict.progressSteps as Record<string, Record<string, string>>)?.generateTests?.[currentJob.stepKey] || currentJob.stepKey
                                            : dictionary.generateTests.processingInBackground || "Arka planda işleniyor..."}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {currentJob?.stepKey && currentJob?.currentStep && currentJob?.totalSteps
                                            ? `Adım ${currentJob.currentStep}/${currentJob.totalSteps} - %${currentJob.progress || 0}`
                                            : `%${currentJob?.progress || 0} tamamlandı`}
                                    </p>
                                </div>
                                <Badge variant="outline" className="text-blue-500 font-mono">
                                    %{currentJob?.progress || 0}
                                </Badge>
                            </div>
                            <Progress className="mt-3" value={currentJob?.progress || 0} />
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {isStuck && !isFailed && !isComplete && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="border-orange-500/50 bg-orange-500/10 mb-6">
                        <CardContent className="py-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-orange-500/20">
                                    <AlertCircle className="w-5 h-5 text-orange-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-orange-500">İşlem beklenenden uzun sürüyor</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Süreç %0'da takılmış olabilir. Lütfen sayfayı yenilemeyi veya işlemi tekrar başlatmayı deneyin.
                                    </p>
                                    <div className="flex gap-3 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/30 text-orange-600"
                                            onClick={() => window.location.reload()}
                                        >
                                            Sayfayı Yenile
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleNewGeneration}
                                        >
                                            Yeniden Başlat
                                        </Button>
                                    </div>
                                </div>
                            </div>
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
                                    <p className="text-sm text-muted-foreground">{parseErrorMessage(currentJob?.error || "")}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleNewGeneration}>
                                    Yeniden Dene
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <div className="grid lg:grid-cols-5 gap-6">
                {/* Configuration Card - Left Side */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                                <Rocket className="w-4 h-4 text-white" />
                            </div>
                            {dictionary.generateTests.configuration}
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
