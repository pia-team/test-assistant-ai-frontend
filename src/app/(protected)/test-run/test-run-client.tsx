"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Play, Terminal, Info, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { TestReportViewer } from "@/components/test-report-viewer";
import {
    useActiveJob,
    useJobStatus,
    useStartRunTestsJob,
    useClearJob,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
} from "@/lib/use-job";

interface TestRunClientProps {
    dictionary: {
        testRun: {
            title: string;
            subtitle: string;
            enterTags: string;
            runTests: string;
            running: string;
            tagsGuide: string;
            readyToExecute: string;
            readyToExecuteDesc?: string;
            environment: string;
            parallelExecution: string;
            threadCount: string;
            enabled: string;
            disabled: string;
            testConfiguration?: string;
            processingInBackground?: string;
            jobAlreadyRunning?: string;
        };
        common: {
            error: string;
            success: string;
            close: string;
        };
    };
}

interface TestRunResult {
    status: string;
    logs: string;
    reportUrl: string;
}

const ENV_OPTIONS = [
    { value: "uat", label: "UAT" },
    { value: "test", label: "Test" },
    { value: "dev", label: "Development" },
    { value: "staging", label: "Staging" },
    { value: "prod", label: "Production" },
];

const THREAD_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
    value: i.toString(),
    label: i.toString(),
}));

export function TestRunClient({ dictionary }: TestRunClientProps) {
    const [tags, setTags] = useState("");
    const [env, setEnv] = useState("uat");
    const [isParallel, setIsParallel] = useState(true);
    const [threads, setThreads] = useState(5);
    const [error, setError] = useState<string | null>(null);

    // Job hooks
    const { data: activeJob } = useActiveJob("RUN_TESTS");
    const { data: jobStatus } = useJobStatus(activeJob?.id);
    const startJobMutation = useStartRunTestsJob();
    const clearJob = useClearJob("RUN_TESTS");

    // Sync job status with active job
    const currentJob = jobStatus ?? activeJob;
    const isProcessing = isJobInProgress(currentJob);
    const isComplete = isJobComplete(currentJob);
    const isFailed = isJobFailed(currentJob);

    // Extract result from completed job
    const result: TestRunResult | null = isComplete && currentJob?.result
        ? (currentJob.result as TestRunResult)
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
            setError(currentJob.error || "Testler çalıştırılırken bir hata oluştu.");
            toast.error(currentJob.error || dictionary.common.error);
        }
    }, [isComplete, isFailed, currentJob?.id, currentJob?.error, dictionary]);

    const handleRun = () => {
        if (!tags.trim()) return;

        setError(null);
        startJobMutation.mutate(
            {
                tags,
                env,
                isParallel,
                threads: isParallel ? threads : null,
            },
            {
                onError: (err) => {
                    if (err.message.startsWith("JOB_ALREADY_RUNNING:")) {
                        toast.warning(dictionary.testRun.jobAlreadyRunning || "Bu işlem zaten çalışıyor");
                    } else {
                        setError(err.message);
                        toast.error(err.message);
                    }
                },
            }
        );
    };

    const handleNewRun = () => {
        clearJob(currentJob?.id);
        setError(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
            >
                <h1 className="text-3xl font-bold">{dictionary.testRun.title}</h1>
                <p className="text-muted-foreground">{dictionary.testRun.subtitle}</p>
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
                                        {dictionary.testRun.processingInBackground || "Arka planda çalışıyor..."}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {dictionary.testRun.running}
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

            {/* Controls */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{dictionary.testRun.testConfiguration}</CardTitle>

                        {/* Tags Guide Modal */}
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                                    <Info className="w-4 h-4" />
                                    {dictionary.testRun.tagsGuide}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{dictionary.testRun.tagsGuide}</DialogTitle>
                                    <DialogDescription>{dictionary.testRun.enterTags}</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 mt-4">
                                    <div className="flex items-center gap-2">
                                        <code className="px-2 py-1 bg-muted rounded text-sm">@smoke</code>
                                        <span className="text-sm text-muted-foreground">- Run smoke tests</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="px-2 py-1 bg-muted rounded text-sm">
                                            @regression and not @slow
                                        </code>
                                        <span className="text-sm text-muted-foreground">- Complex logic</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="px-2 py-1 bg-muted rounded text-sm">@login or @signup</code>
                                        <span className="text-sm text-muted-foreground">- Run either matching</span>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Parameters Grid */}
                    <div className="grid sm:grid-cols-3 gap-4">
                        {/* Environment */}
                        <div className="space-y-2">
                            <Label>{dictionary.testRun.environment}</Label>
                            <Select value={env} onValueChange={setEnv} disabled={isProcessing}>
                                <SelectTrigger className="transition-opacity">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENV_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Parallel Execution */}
                        <div className="space-y-2">
                            <Label>{dictionary.testRun.parallelExecution}</Label>
                            <div className="flex items-center gap-3 h-10">
                                <Switch
                                    checked={isParallel}
                                    onCheckedChange={setIsParallel}
                                    disabled={isProcessing}
                                />
                                <Badge variant={isParallel ? "default" : "secondary"}>
                                    {isParallel ? dictionary.testRun.enabled : dictionary.testRun.disabled}
                                </Badge>
                            </div>
                        </div>

                        {/* Thread Count */}
                        <div className="space-y-2">
                            <Label>{dictionary.testRun.threadCount}</Label>
                            <Select
                                value={threads.toString()}
                                onValueChange={(v) => setThreads(parseInt(v))}
                                disabled={!isParallel || isProcessing}
                            >
                                <SelectTrigger className={!isParallel ? "opacity-50" : ""}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {THREAD_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Tags Input + Run Button */}
                    <div className="flex gap-3">
                        <Input
                            placeholder={dictionary.testRun.enterTags}
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="flex-1"
                            onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleRun()}
                            disabled={isProcessing}
                        />
                        {isComplete ? (
                            <Button
                                onClick={handleNewRun}
                                className="gap-2 px-6 min-w-[140px]"
                                size="lg"
                                variant="outline"
                            >
                                <Play className="w-4 h-4" />
                                Yeni Test
                            </Button>
                        ) : (
                            <Button
                                onClick={handleRun}
                                disabled={isProcessing || !tags.trim() || startJobMutation.isPending}
                                className="gap-2 px-6 min-w-[140px] transition-all"
                                size="lg"
                            >
                                {startJobMutation.isPending || isProcessing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {dictionary.testRun.running}
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4" />
                                        {dictionary.testRun.runTests}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {(error || isFailed) && (
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
                                    <p className="text-sm text-muted-foreground">{error || currentJob?.error}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleNewRun}>
                                    Yeniden Dene
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Report Viewer / Empty State */}
            <div className="mt-4">
                {result?.logs ? (
                    <TestReportViewer logs={result.logs} tags={tags} />
                ) : (
                    <Card className="text-center py-12 border-dashed">
                        <CardContent>
                            <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h5 className="font-medium text-muted-foreground">
                                {dictionary.testRun.readyToExecute}
                            </h5>
                            <p className="text-sm text-muted-foreground/70 mt-1">
                                {dictionary.testRun.readyToExecuteDesc}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
