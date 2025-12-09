"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { FullScreenLoader } from "@/components/ui/full-screen-loader";
import { Play, Terminal, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { runTestsAction } from "@/app/actions/test-actions";
import { TestReportViewer } from "@/components/test-report-viewer";

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
        };
        common: {
            error: string;
            success: string;
            close: string;
        };
    };
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
    const [logs, setLogs] = useState("");
    const [error, setError] = useState<string | null>(null);

    const runTestsMutation = useMutation({
        mutationFn: runTestsAction,
        onSuccess: (data) => {
            setLogs((prev) => prev + data.logs + "\n");
            setLogs((prev) => prev + dictionary.testRun.readyToExecute + " COMPLETE.\n");
            toast.success(dictionary.common.success);
        },
        onError: (err: Error) => {
            setError(err.message || "An error occurred while running tests.");
            setLogs((prev) => prev + `Error: ${err.message}\n`);
            toast.error(err.message);
        },
    });

    const handleRun = () => {
        if (!tags.trim()) return;

        setError(null);
        setLogs(`${dictionary.testRun.running}\n`);
        setLogs((prev) => prev + `Executing: npx cucumber-js --tags "${tags}"\n`);
        setLogs(
            (prev) =>
                prev +
                `Environment: ${env}, Parallel: ${isParallel}${isParallel ? `, Threads: ${threads}` : ""}\n\n`
        );

        runTestsMutation.mutate({
            tags,
            env,
            isParallel,
            threads: isParallel ? threads : null,
        });
    };

    return (
        <>
            {/* Full Screen Loading Overlay */}
            <FullScreenLoader
                isLoading={runTestsMutation.isPending}
                message={dictionary.testRun.running}
            />

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
                                <Select value={env} onValueChange={setEnv} disabled={runTestsMutation.isPending}>
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
                                        disabled={runTestsMutation.isPending}
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
                                    disabled={!isParallel || runTestsMutation.isPending}
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
                                onKeyDown={(e) => e.key === "Enter" && !runTestsMutation.isPending && handleRun()}
                                disabled={runTestsMutation.isPending}
                            />
                            <Button
                                onClick={handleRun}
                                disabled={runTestsMutation.isPending || !tags.trim()}
                                className="gap-2 px-6 min-w-[140px] transition-all"
                                size="lg"
                            >
                                {runTestsMutation.isPending ? (
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
                        </div>
                    </CardContent>
                </Card>

                {/* Error Alert */}
                {error && (
                    <Card className="border-red-500/50 bg-red-500/10">
                        <CardContent className="py-3 text-red-500">{error}</CardContent>
                    </Card>
                )}

                {/* Report Viewer / Empty State */}
                <div className="mt-4">
                    {logs ? (
                        <TestReportViewer logs={logs} tags={tags} />
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
        </>
    );
}
