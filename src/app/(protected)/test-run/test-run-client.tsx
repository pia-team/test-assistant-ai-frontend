"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { TestResultsTable, type TestCreation, type TestItem } from "@/components/test-results-table";
import { parseLogsToDashboardData } from "@/lib/log-parser";
import { ReportSection } from "@/components/report-section";
import {
    useActiveJob,
    useJobStatus,
    useStartRunTestsJob,
    useClearJob,
    useStartOpenReportJob,
    useTestRuns,
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    getProjectsAction,
    getTagsByProjectAction
} from "@/app/actions/tag-actions";
import {
    Search,
    ChevronDown,
    Filter,
    FolderClosed,
    X
} from "lucide-react";

// Zod schema for test run form validation
const testRunFormSchema = z.object({
    tags: z.string().min(1, "En az bir tag girilmelidir"),
    env: z.string().min(1, "Ortam seçilmelidir"),
    browser: z.string().min(1, "Tarayıcı seçilmelidir"),
    headless: z.boolean(),
    isParallel: z.boolean(),
    threads: z.number().min(0).max(10),
    baseLoginUrl: z.string().url("Geçerli bir URL giriniz"),
    username: z.string().min(1, "Kullanıcı adı zorunludur"),
    password: z.string().min(1, "Şifre zorunludur"),
});

type TestRunFormValues = z.infer<typeof testRunFormSchema>;

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
            newTest?: string;
            testResults?: string;
            testResultsDesc?: string;
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
    const [error, setError] = useState<string | null>(null);
    const [viewJobId, setViewJobId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("run");
    const [currentPage, setCurrentPage] = useState(0);

    // Tag management state
    const [projects, setProjects] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [tagLogic, setTagLogic] = useState<"and" | "or" | "custom">("and");
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [tagsLoading, setTagsLoading] = useState(false);
    const [tagSearch, setTagSearch] = useState("");

    // Fetch paginated test run jobs from backend
    const { data: testRunsData, isLoading: testRunsLoading } = useTestRuns(currentPage, 10);

    console.log(testRunsData)
    // Derive testCreations from testRunsData
    const testCreations = useMemo(() => {
        if (!testRunsData?.content) return [];

        return testRunsData.content
            .map((job) => {
                const request = (job as any).request || (job as any).requestData;
                const result = (job as any).result || (job as any).resultData;
                const jobTags = request?.tags || "";

                // Parse logs if available
                let tests: TestItem[] = [];
                if (result?.logs) {
                    const dashboardData = parseLogsToDashboardData(result.logs, jobTags);
                    if (dashboardData) {
                        tests = dashboardData.testCases.map((tc) => ({
                            id: tc.id,
                            name: tc.title,
                            type: tc.browser,
                            status: tc.status === "PASSED" ? "passed" : tc.status === "FAILED" ? "failed" : "skipped",
                            modifiedAt: new Date(job.createdAt).toLocaleString(),
                            createdBy: job.username || "System",
                            videoUrl: tc.video || undefined,
                            error: tc.errors.join("\n") || undefined,
                            logs: tc.steps.map((s) => s.content),
                        }));
                    }
                }

                return {
                    id: job.id,
                    name: jobTags ? (jobTags.startsWith('@') ? jobTags : `@${jobTags}`) : (request?.env?.toUpperCase() || 'Test Run'),
                    status: job.status.toLowerCase() as any,
                    environment: request?.env || "dev",
                    project: request?.project || "N/A",
                    createdAt: job.createdAt ? new Date(job.createdAt).toLocaleString('tr-TR') : "N/A",
                    tests: tests,
                };
            });
    }, [testRunsData]);

    // Handle page change
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // React Hook Form setup with Zod validation
    const form = useForm<TestRunFormValues>({
        resolver: zodResolver(testRunFormSchema),
        defaultValues: {
            tags: "",
            env: "dev",
            browser: "chromium",
            headless: true,
            isParallel: true,
            threads: 5,
            baseLoginUrl: "",
            username: "",
            password: "",
        },
    });

    const { watch, setValue, handleSubmit, formState: { errors }, control, getValues } = form;

    // Only watch fields that need to trigger UI changes
    const env = watch("env");
    const isParallel = watch("isParallel");
    const headless = watch("headless");
    const tags = watch("tags"); // Need to watch for button disabled state

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("RUN_TESTS");
    const { isConnected, subscribeToJob, unsubscribeFromJob } = useSocket();

    // Subscribe to job updates for real-time status updates
    useEffect(() => {
        if (!viewJobId) return;

        subscribeToJob(viewJobId, {
            onStarted: () => {
                // Status updates are now handled by React Query cache invalidation
            },
            onProgress: (data) => {
                console.log("[TestRun] Job progress:", data);
            },
            onCompleted: () => {
                // Status updates are now handled by React Query cache invalidation
            },
        });
    }, [viewJobId]);

    // Fetch projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            setProjectsLoading(true);
            try {
                const data = await getProjectsAction();
                setProjects(data);
                if (data.length > 0) {
                    // Don't auto-select if we want user to see all tags maybe?
                    // Or auto-select first one.
                }
            } catch (err: any) {
                console.error("Failed to fetch projects:", err);
                toast.error("Projeler yüklenemedi");
            } finally {
                setProjectsLoading(false);
            }
        };
        fetchProjects();
    }, []);

    // Fetch tags when project changes
    useEffect(() => {
        const fetchTags = async () => {
            if (!selectedProject) {
                setAvailableTags([]);
                return;
            }
            setTagsLoading(true);
            try {
                const data = await getTagsByProjectAction(selectedProject);
                setAvailableTags(data);
            } catch (err: any) {
                console.error("Failed to fetch tags:", err);
                toast.error("Etiketler yüklenemedi");
            } finally {
                setTagsLoading(false);
            }
        };
        fetchTags();
    }, [selectedProject]);

    // Update form tags when selection or logic changes
    useEffect(() => {
        if (tagLogic === "custom") return;

        if (selectedTags.length === 0) {
            setValue("tags", "", { shouldValidate: true });
            return;
        }

        const tagString = selectedTags.join(` ${tagLogic} `);
        setValue("tags", tagString, { shouldValidate: true });
    }, [selectedTags, tagLogic, setValue]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const clearSelection = () => {
        setSelectedTags([]);
        if (tagLogic === "custom") {
            setValue("tags", "", { shouldValidate: true });
        }
    };
    // Subscribe to job updates for real-time status updates
    useEffect(() => {
        if (!viewJobId) return;

        subscribeToJob(viewJobId, {
            onStarted: () => {
                // Status updates are now handled by React Query cache invalidation
            },
            onProgress: (data) => {
                console.log("[TestRun] Job progress:", data);
            },
            onCompleted: () => {
                // Status updates are now handled by React Query cache invalidation
            },
            onFailed: () => {
                // Status updates are now handled by React Query cache invalidation
            },
        });

        return () => {
            unsubscribeFromJob(viewJobId);
        };
    }, [viewJobId, subscribeToJob, unsubscribeFromJob]);

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
                setValue("baseLoginUrl", data.baseLoginUrl || "");
                setValue("username", data.username || "");
                setValue("password", data.password || "");
            } catch (error) {
                // Config doesn't exist yet, use empty values
                setValue("baseLoginUrl", "");
                setValue("username", "");
                setValue("password", "");
            } finally {
                setConfigLoading(false);
            }
        };
        loadConfig();
    }, [env, setValue]);

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

    // Parse logs and update testCreations when job completes
    useEffect(() => {
        if (!result?.logs || !viewJobId) return;

        const dashboardData = parseLogsToDashboardData(result.logs, tags);
        if (!dashboardData) return;

        // Convert parsed test cases to TestItem format
        const tests: TestItem[] = dashboardData.testCases.map((tc) => ({
            id: tc.id,
            name: tc.title,
            type: tc.browser,
            status: tc.status === "PASSED" ? "passed" : tc.status === "FAILED" ? "failed" : "skipped",
            modifiedAt: new Date().toLocaleString(),
            createdBy: "System",
            videoUrl: tc.video || undefined,
            error: tc.errors.join("\n") || undefined,
            logs: tc.steps.map((s) => s.content),
        }));

        // Test data updates are now handled by React Query cache invalidation
    }, [result?.logs, viewJobId, tags]);

    const onSubmit = async (data: TestRunFormValues) => {
        setError(null);

        // Save config first
        try {
            await updatePlaywrightConfig({
                baseLoginUrl: data.baseLoginUrl,
                username: data.username,
                password: data.password,
                environment: data.env,
            });
            toast.success(`${data.env}.json config kaydedildi`);
        } catch (err: any) {
            toast.error(`Config kaydedilemedi: ${err.message}`);
            return;
        }

        startJobMutation.mutate(
            {
                tags: data.tags,
                env: data.env,
                project: selectedProject,
                isParallel: data.isParallel,
                threads: data.isParallel ? data.threads : null,
                browser: data.browser,
                headless: data.headless,
            },
            {
                onSuccess: (job) => {
                    setViewJobId(job.id);
                    // Add new test creation to the table
                    const newCreation: TestCreation = {
                        id: job.id,
                        name: `${data.env.toUpperCase()} - ${data.tags} - ${new Date().toLocaleString()}`,
                        status: "running",
                        environment: data.env,
                        project: selectedProject,
                        createdAt: new Date().toISOString(),
                        tests: [],
                    };
                    // New test creation is now handled by React Query cache invalidation
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

    const handleRun = handleSubmit(onSubmit);

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
                                        <p className="font-medium text-red-500">{fullDict.testRun?.testFailed || "Test Çalıştırma Başarısız"}</p>
                                        <p className="text-sm text-muted-foreground">{error || currentJob?.error}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleNewRun} className="gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        {fullDict.testRun?.retry || "Yeniden Dene"}
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
                                        <p className="font-medium text-green-500">{fullDict.progressSteps?.runTests?.completed || "Testler Tamamlandı"}</p>
                                        <p className="text-sm text-muted-foreground">{dictionary.testRun.testResultsDesc || "Test sonuçları aşağıda görüntüleniyor"}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleNewRun} className="gap-2">
                                        <Play className="w-4 h-4" />
                                        {dictionary.testRun.newTest || "Yeni Test"}
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
                            {dictionary.testRun.subtitle}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <Form {...form}>
                            {/* Tags Input */}
                            {/* Project and Tags Input */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-muted-foreground">
                                            <FolderClosed className="w-4 h-4" />
                                            JSON Projesi (Feature Klasörü)
                                        </Label>
                                    </div>
                                    <Select
                                        value={selectedProject}
                                        onValueChange={setSelectedProject}
                                        disabled={isProcessing || projectsLoading}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Proje seçin" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {projects.map((p) => (
                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="flex items-center gap-2 text-muted-foreground">
                                            <Tag className="w-4 h-4" />
                                            Cucumber Etiketleri
                                        </Label>
                                        {selectedTags.length > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearSelection}
                                                className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <X className="w-3 h-3 mr-1" />
                                                Temizle
                                            </Button>
                                        )}
                                    </div>

                                    {/* Tag Selection UI */}
                                    <div className="border rounded-lg bg-muted/30 p-3 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Etiket ara..."
                                                    className="pl-8 h-9"
                                                    value={tagSearch}
                                                    onChange={(e) => setTagSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex border rounded-md p-0.5 bg-background">
                                                <Button
                                                    type="button"
                                                    variant={tagLogic === "and" ? "secondary" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => setTagLogic("and")}
                                                >
                                                    AND
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={tagLogic === "or" ? "secondary" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => setTagLogic("or")}
                                                >
                                                    OR
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={tagLogic === "custom" ? "secondary" : "ghost"}
                                                    size="sm"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => setTagLogic("custom")}
                                                >
                                                    CUSTOM
                                                </Button>
                                            </div>
                                        </div>

                                        {tagLogic !== "custom" ? (
                                            <div className="max-h-[160px] overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                                                {tagsLoading ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : availableTags.filter(t => t.toLowerCase().includes(tagSearch.toLowerCase())).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {availableTags
                                                            .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                                                            .map((tag) => (
                                                                <Badge
                                                                    key={tag}
                                                                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                                                                    className={`cursor-pointer hover:border-primary transition-colors ${selectedTags.includes(tag)
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "bg-background hover:bg-muted"
                                                                        }`}
                                                                    onClick={() => toggleTag(tag)}
                                                                >
                                                                    {tag}
                                                                </Badge>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-center py-8 text-sm text-muted-foreground">
                                                        {selectedProject ? "Bu projede etiket bulunamadı" : "Önce bir proje seçin"}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2 py-2">
                                                <Label className="text-xs text-muted-foreground">Manuel Etiket Girişi</Label>
                                                <FormField<TestRunFormValues>
                                                    control={control}
                                                    name="tags"
                                                    render={({ field }: any) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    placeholder="@smoke and (not @slow)"
                                                                    className="font-mono text-sm"
                                                                    disabled={isProcessing}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    * Custom modunda etiketleri, 'and', 'or', 'not' ve parantez kullanarak manuel olarak girebilirsiniz.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Preview of constructed tags */}
                                    <div className="p-3 bg-muted rounded-lg border border-dashed border-muted-foreground/30">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-medium uppercase text-muted-foreground">Oluşturulan Filtre</span>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] text-muted-foreground">
                                                        <Info className="w-3 h-3 mr-1" />
                                                        Rehber
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>{dictionary.testRun.tagsGuide}</DialogTitle>
                                                        <DialogDescription>{dictionary.testRun.readyToExecuteDesc}</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-3 mt-4">
                                                        <div className="p-3 bg-muted rounded-lg space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <code className="px-2 py-1 bg-background rounded text-sm font-mono">@smoke</code>
                                                                <span className="text-sm text-muted-foreground">{fullDict.testRun?.tagsGuideSmoke || "Smoke testlerini çalıştır"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <code className="px-2 py-1 bg-background rounded text-sm font-mono">@regression and not @slow</code>
                                                                <span className="text-sm text-muted-foreground">{fullDict.testRun?.tagsGuideComplex || "Karmaşık mantık"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <code className="px-2 py-1 bg-background rounded text-sm font-mono">@login or @signup</code>
                                                                <span className="text-sm text-muted-foreground">{fullDict.testRun?.tagsGuideAny || "Eşleşen herhangi biri"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                        <div className="min-h-[24px]">
                                            <div className="flex flex-wrap gap-1.5 items-center">
                                                {tagLogic === "custom" ? (
                                                    <span className="font-mono text-sm text-primary break-all">
                                                        {tags || <span className="text-muted-foreground italic text-xs">Henüz etiket girilmedi...</span>}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {selectedTags.map((tag, index) => (
                                                            <div key={tag} className="flex items-center gap-1.5">
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-6 gap-1 pr-1 pl-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer group"
                                                                    onClick={() => toggleTag(tag)}
                                                                >
                                                                    {tag}
                                                                    <X className="w-3 h-3 text-muted-foreground group-hover:text-destructive" />
                                                                </Badge>
                                                                {index < selectedTags.length - 1 && (
                                                                    <span className="text-[10px] font-bold text-muted-foreground/40 px-0.5">
                                                                        {tagLogic.toUpperCase()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {selectedTags.length === 0 && (
                                                            <span className="text-muted-foreground italic text-xs">Henüz etiket seçilmedi...</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <FormField<TestRunFormValues>
                                        control={control}
                                        name="tags"
                                        render={({ field }: any) => (
                                            <FormItem>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Environment */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <Server className="w-4 h-4" />
                                    {dictionary.testRun.environment}
                                </Label>
                                <Select value={env} onValueChange={(v) => setValue("env", v)} disabled={isProcessing}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ENV_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${opt.value === 'prod' ? 'bg-red-500' :
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
                                    {fullDict.testRun?.environmentInfo || "Test Ortamı Bilgileri"}
                                </Label>

                                {configLoading ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        <span className="text-sm text-muted-foreground">{fullDict.common?.loading || "Yükleniyor..."}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <FormField<TestRunFormValues>
                                            control={control}
                                            name="baseLoginUrl"
                                            render={({ field }: any) => (
                                                <FormItem className="space-y-1">
                                                    <FormLabel className="text-xs text-muted-foreground">Login URL</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            placeholder="https://example.com/login"
                                                            disabled={isProcessing}
                                                            className="h-8 text-sm"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField<TestRunFormValues>
                                                control={control}
                                                name="username"
                                                render={({ field }: any) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-xs text-muted-foreground">{fullDict.playwrightConfig?.username || "Kullanıcı Adı"}</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                placeholder="username"
                                                                disabled={isProcessing}
                                                                className="h-8 text-sm"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField<TestRunFormValues>
                                                control={control}
                                                name="password"
                                                render={({ field }: any) => (
                                                    <FormItem className="space-y-1">
                                                        <FormLabel className="text-xs text-muted-foreground">{fullDict.playwrightConfig?.password || "Şifre"}</FormLabel>
                                                        <div className="relative">
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    type={showPassword ? 'text' : 'password'}
                                                                    placeholder="••••••••"
                                                                    disabled={isProcessing}
                                                                    className="h-8 text-sm pr-8"
                                                                />
                                                            </FormControl>
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
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Browser Selection */}
                            <div className="space-y-3">
                                <Label className="flex items-center gap-2 text-muted-foreground">
                                    <Globe className="w-4 h-4" />
                                    {fullDict.testRun?.browser || "Tarayıcı"}
                                </Label>
                                <FormField<TestRunFormValues>
                                    control={control}
                                    name="browser"
                                    render={({ field }: any) => (
                                        <Select value={field.value} onValueChange={field.onChange} disabled={isProcessing}>
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
                                    )}
                                />

                                {/* Headless Mode */}
                                <div className="flex items-center justify-between pt-2">
                                    <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                                        <Eye className="w-4 h-4" />
                                        {fullDict.testRun?.headlessMode || "Headless Mod"}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={headless}
                                            onCheckedChange={(v) => setValue("headless", v)}
                                            disabled={isProcessing}
                                        />
                                        <Badge variant={headless ? "secondary" : "default"} className="text-xs">
                                            {headless ? (fullDict.testRun?.headlessBackground || "Arka Plan") : (fullDict.testRun?.headlessVisible || "Görünür")}
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
                                            onCheckedChange={(v) => setValue("isParallel", v)}
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
                                        <FormField<TestRunFormValues>
                                            control={control}
                                            name="threads"
                                            render={({ field }: any) => (
                                                <Select
                                                    value={field.value.toString()}
                                                    onValueChange={(v) => field.onChange(parseInt(v))}
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
                                            )}
                                        />
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
                                        {fullDict.testRun?.newRun || "Yeni Test Çalıştır"}
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
                        </Form>
                    </CardContent>
                </Card>

                {/* Results Card - Right Side */}
                <div className="lg:col-span-3">
                    <TestResultsTable
                        creations={testCreations}
                        currentPage={currentPage}
                        totalPages={testRunsData?.totalPages || 0}
                        totalElements={testRunsData?.totalElements || 0}
                        onPageChange={handlePageChange}
                        isLoading={testRunsLoading}
                    />
                </div>
            </div>
        </div>
    );
}
