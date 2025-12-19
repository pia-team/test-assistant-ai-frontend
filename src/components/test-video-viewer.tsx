"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Play,
    Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-context";

interface TestVideoViewerProps {
    testId: string;
    creationId: string;
    testName?: string;
    status?: "passed" | "failed" | "running" | "pending" | "skipped";
    videoUrl?: string;
    error?: string;
    logs?: string[];
    onBack?: () => void;
}

export function TestVideoViewer({
    testId,
    creationId,
    testName: initialTestName = "Test Case",
    status: initialStatus = "passed",
    videoUrl: initialVideoUrl,
    error: initialError,
    logs: initialLogs = [],
    onBack,
}: TestVideoViewerProps) {
    const router = useRouter();
    const { dictionary } = useLocale();
    const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
    
    // State for test data (can be loaded from sessionStorage)
    const [testName, setTestName] = useState(initialTestName);
    const [status, setStatus] = useState(initialStatus);
    const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
    const [error, setError] = useState(initialError);
    const [logs, setLogs] = useState(initialLogs);

    // Load test data from sessionStorage if available
    useEffect(() => {
        const storedData = sessionStorage.getItem(`test-${testId}`);
        if (storedData) {
            try {
                const testData = JSON.parse(storedData);
                if (testData.name) setTestName(testData.name);
                if (testData.status) setStatus(testData.status);
                if (testData.videoUrl) setVideoUrl(testData.videoUrl);
                if (testData.error) setError(testData.error);
                if (testData.logs) setLogs(testData.logs);
            } catch (e) {
                console.error("Failed to parse test data from sessionStorage", e);
            }
        }
    }, [testId]);

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    const StatusIcon = status === "passed" ? CheckCircle2 : status === "failed" ? XCircle : AlertTriangle;
    const statusColor = status === "passed" ? "text-green-500" : status === "failed" ? "text-red-500" : "text-yellow-500";
    const statusBg = status === "passed" ? "bg-green-500/10" : status === "failed" ? "bg-red-500/10" : "bg-yellow-500/10";

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>
            </div>

            {/* Title */}
            <div className="flex items-center gap-3">
                <Badge variant="outline" className={cn("gap-1", statusColor, statusBg)}>
                    <StatusIcon className="w-3 h-3" />
                    {status === "passed" ? "Passed" : status === "failed" ? "Failed" : "Pending"}
                </Badge>
                <h2 className="text-xl font-semibold">{testName}</h2>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "code")}>
                <TabsList>
                    <TabsTrigger value="preview" className="gap-2">
                        <Play className="w-4 h-4" />
                        Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="gap-2">
                        <Code className="w-4 h-4" />
                        Code
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="mt-4">
                    {/* Video Player */}
                    <Card className="overflow-hidden bg-zinc-900">
                        <CardContent className="p-0">
                            <div className="aspect-video bg-black flex items-center justify-center min-h-[500px]">
                                {videoUrl ? (
                                    <video
                                        src={videoUrl}
                                        controls
                                        className="w-full h-full"
                                        poster="/video-placeholder.png"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-zinc-500">
                                        <Play className="w-16 h-16 mb-2" />
                                        <p className="text-sm">No video available</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="code" className="mt-4">
                    <Card className="overflow-hidden">
                        <CardContent className="p-0 bg-zinc-900">
                            <div className="p-3 border-b border-zinc-700 text-sm text-zinc-400">
                                Test Execution Logs ({logs.length} steps)
                            </div>
                            <ScrollArea className="h-[500px]">
                                <div className="p-4 space-y-1">
                                    {logs.length > 0 ? (
                                        logs.map((log, index) => (
                                            <div 
                                                key={index} 
                                                className={cn(
                                                    "text-sm font-mono py-1 px-2 rounded",
                                                    log.includes("✓") || log.includes("PASS") ? "text-green-400 bg-green-500/10" :
                                                    log.includes("✗") || log.includes("FAIL") || log.includes("Error") ? "text-red-400 bg-red-500/10" :
                                                    log.includes("▶") || log.includes("➡") ? "text-blue-400" :
                                                    "text-zinc-400"
                                                )}
                                            >
                                                {log}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-zinc-500 text-center py-8">
                                            No execution logs available
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Error Section */}
            {(error || status === "failed") && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                >
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border-l-4 border-red-500">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-red-500">Error</span>
                    </div>
                    <Card className="bg-zinc-900 border-red-500/30">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-red-400">Browser Console Logs:</p>
                                    <p className="text-sm text-red-300 mt-1">
                                        {error || "[ERROR] Failed to load resource: the server responded with a status of 404"}
                                    </p>
                                </div>
                            </div>
                            {logs.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {logs.map((log, index) => (
                                        <div key={index} className="text-sm text-zinc-400 font-mono">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}
