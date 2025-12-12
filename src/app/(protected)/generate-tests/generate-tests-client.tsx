"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Rocket,
    Globe,
    Code,
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

export function GenerateTestsClient({ dictionary }: GenerateTestsClientProps) {
    const [url, setUrl] = useState("");
    const [jsonSchema, setJsonSchema] = useState("");
    const [hasFeatureFile, setHasFeatureFile] = useState(true);
    const [hasAPITests, setHasAPITests] = useState(true);
    const [hasTestPayload, setHasTestPayload] = useState(false);
    const [hasSwaggerTest, setHasSwaggerTest] = useState(false);
    const [copiedTab, setCopiedTab] = useState<string | null>(null);

    // Job hooks
    const { data: activeJob } = useActiveJob("GENERATE_TESTS");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartGenerateTestsJob();
    const clearJob = useClearJob("GENERATE_TESTS");

    // Sync job status with active job
    const currentJob = jobStatus ?? activeJob;
    const isProcessing = isJobInProgress(currentJob);
    const isComplete = isJobComplete(currentJob);
    const isFailed = isJobFailed(currentJob);

    // Extract result from completed job
    const result: GeneratedResult | null = isComplete && currentJob?.result
        ? (currentJob.result as GeneratedResult)
        : null;

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
            toast.error(currentJob.error || dictionary.generateTests.errorGeneratingTests || dictionary.common.error);
        }
    }, [isComplete, isFailed, currentJob?.id, currentJob?.error, dictionary]);

    const handleGenerate = () => {
        startJobMutation.mutate(
            {
                url,
                jsonSchema,
                hasFeatureFile,
                hasAPITests,
                hasTestPayload,
                hasSwaggerTest,
            },
            {
                onError: (error) => {
                    if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                        toast.warning(dictionary.generateTests.jobAlreadyRunning || "Bu işlem zaten çalışıyor");
                    } else {
                        toast.error(error.message);
                    }
                },
            }
        );
    };

    const handleNewGeneration = () => {
        clearJob(currentJob?.id);
    };

    const copyToClipboard = async (content: string, tab: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedTab(tab);
        toast.success(dictionary.common.copied || "Kopyalandı!");
        setTimeout(() => setCopiedTab(null), 2000);
    };

    const canGenerate = (url.trim() || jsonSchema.trim()) && !isProcessing;

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
                                        {dictionary.generateTests.processingInBackground || "Arka planda işleniyor..."}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {dictionary.generateTests.generating}
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
                        {/* Target URL */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                {dictionary.generateTests.targetUrl}
                            </Label>
                            <Input
                                placeholder={dictionary.generateTests.targetUrlPlaceholder}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isProcessing}
                            />
                        </div>

                        {/* JSON Schema */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Code className="w-4 h-4" />
                                {dictionary.generateTests.jsonSchema}
                            </Label>
                            <Textarea
                                placeholder={dictionary.generateTests.jsonSchemaPlaceholder}
                                value={jsonSchema}
                                onChange={(e) => setJsonSchema(e.target.value)}
                                rows={5}
                                className="font-mono text-sm"
                                disabled={isProcessing}
                            />
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
                                        onCheckedChange={setHasFeatureFile}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.featureFile}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasAPITests}
                                        onCheckedChange={setHasAPITests}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.apiTests}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasTestPayload}
                                        onCheckedChange={setHasTestPayload}
                                        disabled={isProcessing}
                                    />
                                    <Label className="font-normal">{dictionary.generateTests.testPayload}</Label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hasSwaggerTest}
                                        onCheckedChange={setHasSwaggerTest}
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
                                Yeni Test Üret
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
