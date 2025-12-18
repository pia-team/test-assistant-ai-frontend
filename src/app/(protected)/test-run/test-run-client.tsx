"use client";

import { useState, useEffect, useRef } from "react";
import { useLocale } from "@/components/locale-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { 
    Play, 
    Terminal, 
    Info, 
    Loader2, 
    AlertCircle, 
    Settings2, 
    Zap, 
    Server,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Tag,
    Cpu
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TestReportViewer } from "@/components/test-report-viewer";
import { ReportSection } from "@/components/report-section";
import {
    useActiveJob,
    useJobStatus,
    useStartRunTestsJob,
    useClearJob,
    useStartOpenReportJob,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
    isJobStopped,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import { Eye, EyeOff, Globe } from "lucide-react";
import { 
    getPlaywrightConfig, 
    updatePlaywrightConfig,
    type PlaywrightConfig 
} from "@/app/actions/playwright-config-actions";

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

const BROWSER_OPTIONS = [
    { value: "chromium", label: "Chrome", icon: "🌐" },
    { value: "firefox", label: "Firefox", icon: "🦊" },
    { value: "webkit", label: "Safari (WebKit)", icon: "🧭" },
];

export function TestRunClient({ dictionary }: TestRunClientProps) {
    const { dictionary: fullDict } = useLocale();
    const [tags, setTags] = useState("");
    const [env, setEnv] = useState("dev");
    const [isParallel, setIsParallel] = useState(true);
    const [threads, setThreads] = useState(5);
    const [browser, setBrowser] = useState("chromium");
    const [headless, setHeadless] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewJobId, setViewJobId] = useState<string | null>(null);
    
    // Config state
    const [showPassword, setShowPassword] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [config, setConfig] = useState<PlaywrightConfig>({
        baseLoginUrl: '',
        username: '',
        password: '',
    });

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("RUN_TESTS");
    const { isConnected } = useSocket();
    
    // Sync viewJobId with activeJob if running
    useEffect(() => {
        if (activeJob?.id && !viewJobId) {
            setViewJobId(activeJob.id);
        }
    }, [activeJob, viewJobId]);

    // Load config when environment changes
    useEffect(() => {
        const loadConfig = async () => {
            setConfigLoading(true);
            try {
                const data = await getPlaywrightConfig(env);
                setConfig({
                    baseLoginUrl: data.baseLoginUrl || '',
                    username: data.username || '',
                    password: data.password || '',
                });
            } catch (error) {
                // Config doesn't exist yet, use empty values
                setConfig({
                    baseLoginUrl: '',
                    username: '',
                    password: '',
                });
            } finally {
                setConfigLoading(false);
            }
        };
        loadConfig();
    }, [env]);

    const { data: jobStatus } = useJobStatus(viewJobId);
    const startJobMutation = useStartRunTestsJob();
    const clearJob = useClearJob("RUN_TESTS");

    // Sync job status with active job - socket updates both caches
    const currentJob = jobStatus || activeJob;
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

    const handleRun = async () => {
        if (!tags.trim()) return;
        
        // Validate config
        if (!config.baseLoginUrl || !config.username || !config.password) {
            toast.error("URL, kullanıcı adı ve şifre zorunludur");
            return;
        }

        setError(null);
        
        // Save config first
        try {
            await updatePlaywrightConfig({
                ...config,
                environment: env,
            });
            toast.success(`${env}.json config kaydedildi`);
        } catch (err: any) {
            toast.error(`Config kaydedilemedi: ${err.message}`);
            return;
        }

        startJobMutation.mutate(
            {
                tags,
                env,
                isParallel,
                threads: isParallel ? threads : null,
                browser,
                headless,
            },
            {
                onSuccess: (job) => {
                    setViewJobId(job.id);
                },
                onError: (err) => {
                    if (err.message.startsWith("JOB_ALREADY_RUNNING:")) {
                        const activeJobData = JSON.parse(err.message.replace("JOB_ALREADY_RUNNING:", ""));
                        setViewJobId(activeJobData.id);
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
        setViewJobId(null);
    };

    const isStopped = isJobStopped(currentJob);

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

            {/* Status Banners */}
            <AnimatePresence mode="wait">
                {isProcessing && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-blue-500/50 bg-blue-500/10">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    <div className="flex-1">
                                        <p className="font-medium text-blue-500">
                                            {currentJob?.stepKey 
                                                ? (fullDict.progressSteps as Record<string, Record<string, string>>)?.runTests?.[currentJob.stepKey] || currentJob.stepKey
                                                : dictionary.testRun.processingInBackground || "Testler çalıştırılıyor..."}
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

                {(error || isFailed) && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-red-500/50 bg-red-500/10">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-red-500" />
                                    <div className="flex-1">
                                        <p className="font-medium text-red-500">Test Çalıştırma Başarısız</p>
                                        <p className="text-sm text-muted-foreground">{error || currentJob?.error}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleNewRun} className="gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        Yeniden Dene
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {isComplete && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-green-500/50 bg-green-500/10">
                            <CardContent className="py-4">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    <div className="flex-1">
                                        <p className="font-medium text-green-500">Testler Tamamlandı</p>
                                        <p className="text-sm text-muted-foreground">Test sonuçları aşağıda görüntüleniyor</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleNewRun} className="gap-2">
                                        <Play className="w-4 h-4" />
                                        Yeni Test
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Grid Layout */}
            <div className="grid lg:grid-cols-5 gap-6">
                {/* Configuration Card - Left Side */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
                                <Settings2 className="w-4 h-4 text-white" />
                            </div>
                            {dictionary.testRun.testConfiguration || "Test Yapılandırması"}
                        </CardTitle>
                        <CardDescription>
                            Test çalıştırma parametrelerini yapılandırın
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Tags Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <Tag className="w-4 h-4" />
                                    {dictionary.testRun.enterTags}
                                </Label>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground">
                                            <Info className="w-3 h-3 mr-1" />
                                            {dictionary.testRun.tagsGuide}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{dictionary.testRun.tagsGuide}</DialogTitle>
                                            <DialogDescription>Cucumber tag ifadelerini kullanarak testleri filtreleyin</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-3 mt-4">
                                            <div className="p-3 bg-muted rounded-lg space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">@smoke</code>
                                                    <span className="text-sm text-muted-foreground">Smoke testlerini çalıştır</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">@regression and not @slow</code>
                                                    <span className="text-sm text-muted-foreground">Karmaşık mantık</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <code className="px-2 py-1 bg-background rounded text-sm font-mono">@login or @signup</code>
                                                    <span className="text-sm text-muted-foreground">Eşleşen herhangi biri</span>
                                                </div>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <Input
                                placeholder="@smoke, @regression, @api..."
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleRun()}
                                disabled={isProcessing}
                                className="font-mono"
                            />
                        </div>

                        <Separator />

                        {/* Environment */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Server className="w-4 h-4" />
                                {dictionary.testRun.environment}
                            </Label>
                            <Select value={env} onValueChange={setEnv} disabled={isProcessing}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ENV_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${
                                                    opt.value === 'prod' ? 'bg-red-500' :
                                                    opt.value === 'staging' ? 'bg-yellow-500' :
                                                    opt.value === 'uat' ? 'bg-blue-500' :
                                                    'bg-green-500'
                                                }`} />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Environment Config */}
                        <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                            <Label className="flex items-center gap-2 text-sm font-medium">
                                <Globe className="w-4 h-4" />
                                Test Ortamı Bilgileri
                            </Label>
                            
                            {configLoading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    <span className="text-sm text-muted-foreground">Yükleniyor...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">Login URL</Label>
                                        <Input
                                            placeholder="https://example.com/login"
                                            value={config.baseLoginUrl}
                                            onChange={(e) => setConfig({ ...config, baseLoginUrl: e.target.value })}
                                            disabled={isProcessing}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Kullanıcı Adı</Label>
                                            <Input
                                                placeholder="username"
                                                value={config.username}
                                                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                                                disabled={isProcessing}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">Şifre</Label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="••••••••"
                                                    value={config.password}
                                                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                                                    disabled={isProcessing}
                                                    className="h-8 text-sm pr-8"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-8 w-8 px-2"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Browser Selection */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                                Tarayıcı
                            </Label>
                            <Select value={browser} onValueChange={setBrowser} disabled={isProcessing}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BROWSER_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <span>{opt.icon}</span>
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            
                            {/* Headless Mode */}
                            <div className="flex items-center justify-between pt-2">
                                <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                                    <Eye className="w-4 h-4" />
                                    Headless Mod
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={headless}
                                        onCheckedChange={setHeadless}
                                        disabled={isProcessing}
                                    />
                                    <Badge variant={headless ? "secondary" : "default"} className="text-xs">
                                        {headless ? "Arka Plan" : "Görünür"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Parallel Execution */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <Zap className="w-4 h-4" />
                                    {dictionary.testRun.parallelExecution}
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={isParallel}
                                        onCheckedChange={setIsParallel}
                                        disabled={isProcessing}
                                    />
                                    <Badge variant={isParallel ? "default" : "secondary"} className="text-xs">
                                        {isParallel ? dictionary.testRun.enabled : dictionary.testRun.disabled}
                                    </Badge>
                                </div>
                            </div>
                            
                            {isParallel && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Cpu className="w-4 h-4" />
                                        {dictionary.testRun.threadCount}
                                    </Label>
                                    <Select
                                        value={threads.toString()}
                                        onValueChange={(v) => setThreads(parseInt(v))}
                                        disabled={isProcessing}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {THREAD_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label} thread
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </motion.div>
                            )}
                        </div>

                        <Separator />

                        {/* Run Button */}
                        <Button
                            onClick={isComplete || isFailed ? handleNewRun : handleRun}
                            disabled={isProcessing || (!tags.trim() && !isComplete && !isFailed) || startJobMutation.isPending}
                            className="w-full gap-2"
                            size="lg"
                            variant={isComplete || isFailed ? "outline" : "default"}
                        >
                            {startJobMutation.isPending || isProcessing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {dictionary.testRun.running}
                                </>
                            ) : isComplete || isFailed ? (
                                <>
                                    <RefreshCw className="w-4 h-4" />
                                    Yeni Test Çalıştır
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    {dictionary.testRun.runTests}
                                </>
                            )}
                        </Button>

                        {/* Test Report Section - Only show after successful test completion */}
                        {isComplete && result && (
                            <>
                                <Separator />
                                <ReportSection />
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Results Card - Right Side */}
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <Terminal className="w-4 h-4 text-white" />
                            </div>
                            Test Sonuçları
                        </CardTitle>
                        <CardDescription>
                            Test çalıştırma sonuçları ve raporlar
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result?.logs ? (
                            <TestReportViewer logs={result.logs} tags={tags} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-[400px]">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                        opacity: [0.5, 0.8, 0.5],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 flex items-center justify-center mb-4"
                                >
                                    <Terminal className="w-12 h-12 text-primary opacity-60" />
                                </motion.div>
                                <h5 className="font-semibold text-muted-foreground">
                                    {dictionary.testRun.readyToExecute}
                                </h5>
                                <p className="text-sm text-muted-foreground/70 text-center max-w-[300px] mt-1">
                                    {dictionary.testRun.readyToExecuteDesc || "Tag girerek testleri çalıştırabilirsiniz"}
                                </p>
                                {isConnected ? (
                                    <Badge variant="outline" className="mt-4 text-green-500 border-green-500/50">
                                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                        Gerçek zamanlı bağlantı aktif
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="mt-4 text-yellow-500 border-yellow-500/50">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                        Bağlantı bekleniyor...
                                    </Badge>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
