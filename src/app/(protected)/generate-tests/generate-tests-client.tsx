"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import {
    Rocket,
    Globe,
    Code,
    FileCode,
    Loader2,
    Download,
    Copy,
    Check
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { generateTestsAction } from "@/app/actions/test-actions";

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
    const [result, setResult] = useState<GeneratedResult | null>(null);
    const [copiedTab, setCopiedTab] = useState<string | null>(null);

    const generateMutation = useMutation({
        mutationFn: generateTestsAction,
        onSuccess: (data) => {
            setResult(data as GeneratedResult);
            toast.success(dictionary.generateTests.testsGeneratedSuccess || dictionary.common.success);
        },
        onError: (error: Error) => {
            toast.error(error.message || dictionary.generateTests.errorGeneratingTests || dictionary.common.error);
        },
    });

    const handleGenerate = () => {
        generateMutation.mutate({
            url,
            jsonSchema,
            hasFeatureFile,
            hasAPITests,
            hasTestPayload,
            hasSwaggerTest,
        });
    };

    const copyToClipboard = async (content: string, tab: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedTab(tab);
        toast.success(dictionary.common.copied || "Kopyalandı!");
        setTimeout(() => setCopiedTab(null), 2000);
    };

    const canGenerate = url.trim() || jsonSchema.trim();

    return (
        <>
            {/* Full Screen Loading Overlay */}
            <FullScreenLoader
                isLoading={generateMutation.isPending}
                message={dictionary.generateTests.generating}
            />

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
                                    disabled={generateMutation.isPending}
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
                                    disabled={generateMutation.isPending}
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
                                            disabled={generateMutation.isPending}
                                        />
                                        <Label className="font-normal">{dictionary.generateTests.featureFile}</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={hasAPITests}
                                            onCheckedChange={setHasAPITests}
                                            disabled={generateMutation.isPending}
                                        />
                                        <Label className="font-normal">{dictionary.generateTests.apiTests}</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={hasTestPayload}
                                            onCheckedChange={setHasTestPayload}
                                            disabled={generateMutation.isPending}
                                        />
                                        <Label className="font-normal">{dictionary.generateTests.testPayload}</Label>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={hasSwaggerTest}
                                            onCheckedChange={setHasSwaggerTest}
                                            disabled={generateMutation.isPending}
                                        />
                                        <Label className="font-normal">{dictionary.generateTests.swaggerTests}</Label>
                                    </div>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={generateMutation.isPending || !canGenerate}
                                className="w-full gap-2"
                                size="lg"
                            >
                                {generateMutation.isPending ? (
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
                        </CardContent>
                    </Card>

                    {/* Results Card - Right Side */}
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-lg">Generated Results</CardTitle>
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
        </>
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

function ResultPanel({ content, fileName, dictionary, tabKey, copiedTab, onCopy, onDownload }: ResultPanelProps) {
    return (
        <div className="space-y-3">
            <ScrollArea className="h-[350px] w-full rounded-lg border bg-muted/30 p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap">{content}</pre>
            </ScrollArea>
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
