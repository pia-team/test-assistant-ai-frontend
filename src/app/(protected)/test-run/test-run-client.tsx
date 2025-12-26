"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/components/locale-context";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
    Info,
    Loader2,
    AlertCircle,
    Settings2,
    Zap,
    CheckCircle2,
    XCircle,
    RefreshCw,
    ExternalLink,
    Layers,
    Rocket,
    LayoutDashboard,
    Search,
    FolderClosed,
    Eye,
    EyeOff,
    Globe,
    FileJson,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TestResultsTable, type TestCreation, type TestItem } from "@/components/test-results-table";
import { parseLogsToDashboardData } from "@/lib/log-parser";
import {
    useActiveJob,
    useJobStatus,
    useStartRunTestsJob,
    useClearJob,
    useTestRuns,
    isJobInProgress,
    isJobComplete,
    isJobFailed,
    isJobStopped,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import {
    getPlaywrightConfig,
    updatePlaywrightConfig,
    type PlaywrightConfig
} from "@/app/actions/playwright-config-actions";

import {
    getProjectsAction,
    getTagsByProjectAction,
    getFilesByGroupAction
} from "@/app/actions/tag-actions";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

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
            testFailed?: string;
            retry?: string;
            newRun?: string;
            viewReport?: string;
            noTestsRun?: string;
            noTestsRunDescription?: string;
            selectEnvironment?: string;
            browser?: string;
            selectBrowser?: string;
            headlessMode?: string;
            headlessBackground?: string;
            headlessVisible?: string;
            environmentInfo?: string;
            testRunFailed?: string;
            reportsReady?: string;
            testResultsAndHistory?: string;
            workerThreads?: string;
            projectAndTags?: string;
            selectProject?: string;
            searchTags?: string;
            noTagsFound?: string;
            selectProjectFirst?: string;
            manualTagInput?: string;
            customTagGuide?: string;
            selectTags?: string;
            clear?: string;
            tagsGuideSmoke?: string;
            tagsGuideComplex?: string;
            tagsGuideAny?: string;
        };
        common: {
            error: string;
            success: string;
            close: string;
            loading?: string;
            username?: string;
            password?: string;
            done?: string;
        };
        progressSteps?: Record<string, Record<string, string>>;
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
    const { width, height } = useWindowSize();
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
    const [availableFeatureFiles, setAvailableFeatureFiles] = useState<string[]>([]);
    const [selectedFeatureFile, setSelectedFeatureFile] = useState<string>("");
    const [filesLoading, setFilesLoading] = useState(false);

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
                    reportUrl: result?.reportUrl,
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

    // Fetch feature files when project changes
    useEffect(() => {
        const fetchFeatureFiles = async () => {
            if (!selectedProject) {
                setAvailableFeatureFiles([]);
                setSelectedFeatureFile("");
                return;
            }
            setFilesLoading(true);
            try {
                const data = await getFilesByGroupAction(selectedProject);
                setAvailableFeatureFiles(data);
                // Auto-select first file if available
                if (data.length > 0) {
                    setSelectedFeatureFile(data[0]);
                }
            } catch (err: any) {
                console.error("Failed to fetch feature files:", err);
                toast.error("Dosyalar yüklenemedi");
            } finally {
                setFilesLoading(false);
            }
        };
        fetchFeatureFiles();
    }, [selectedProject]);

    // Fetch tags from selected feature file
    useEffect(() => {
        const fetchFeatureFileTags = async () => {
            if (!selectedProject || !selectedFeatureFile) {
                setAvailableTags([]);
                return;
            }
            setTagsLoading(true);
            try {
                const response = await fetch(
                    `http://localhost:8080/api/projects/${encodeURIComponent(selectedProject)}/features/${encodeURIComponent(selectedFeatureFile)}/tags`
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch tags");
                }
                const data = await response.json();
                setAvailableTags(data);
            } catch (err: any) {
                console.error("Failed to fetch feature file tags:", err);
                toast.error("Tag'ler yüklenemedi");
                setAvailableTags([]);
            } finally {
                setTagsLoading(false);
            }
        };
        fetchFeatureFileTags();
    }, [selectedProject, selectedFeatureFile]);

    // Handle project change with state reset
    const handleProjectChange = (project: string) => {
        setSelectedProject(project);
        setSelectedTags([]);
        setTagSearch("");
        setTagLogic("and");
        setSelectedFeatureFile("");

        // Reset form fields to default values
        setValue("tags", "", { shouldValidate: true });
        setValue("env", "dev", { shouldValidate: true });
        setValue("browser", "chromium", { shouldValidate: true });
        setValue("headless", true, { shouldValidate: true });
        setValue("isParallel", true, { shouldValidate: true });
        setValue("threads", 5, { shouldValidate: true });
    };

    // All available tags without filtering
    const filteredTags = useMemo(() => {
        return availableTags;
    }, [availableTags]);

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
            // Check if it's a JSON string from backend
            if (msg.trim().startsWith('{')) {
                const parsed = JSON.parse(msg);
                return parsed.message || parsed.error || "Sunucu hatası oluştu";
            }
        } catch (e) {
            // Fallback to original message
        }
        return msg;
    };

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

        // Clear previous job state before starting a new one to prevent UI sticking
        clearJob(currentJob?.id);

        startJobMutation.mutate(
            {
                tags: data.tags,
                env: data.env,
                groupName: selectedProject,
                featureFile: selectedFeatureFile,
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
                        const friendlyError = parseErrorMessage(err.message);
                        setError(friendlyError);
                        toast.error(friendlyError);
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
                        {dictionary.testRun.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
                        {dictionary.testRun.subtitle}
                    </p>
                </div>
            </motion.div>

            {/* Status Banners Area */}
            <div className="mb-8">
                <AnimatePresence mode="wait">
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
                                                    ? (fullDict.progressSteps as Record<string, Record<string, string>>)?.runTests?.[currentJob.stepKey] || currentJob.stepKey
                                                    : dictionary.testRun.processingInBackground || "Testler çalıştırılıyor..."}
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
                    {isStuck && !error && !isFailed && !isComplete && (
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
                                        <Button variant="ghost" size="sm" onClick={handleNewRun} className="text-amber-800 hover:bg-amber-100">
                                            İptal Et
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* Error Banner */}
                    {(error || isFailed) && (
                        <motion.div
                            key="error"
                            initial={{ opacity: 0, rotateX: -90 }}
                            animate={{ opacity: 1, rotateX: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 overflow-hidden">
                                <div className="absolute left-0 top-0 w-1 h-full bg-red-500" />
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                        <XCircle className="w-8 h-8" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
                                            Test Çalıştırma Başarısız
                                        </h3>
                                        <p className="text-red-700 dark:text-red-300 font-medium font-mono text-sm bg-red-100/50 dark:bg-red-950/50 p-2 rounded">
                                            {parseErrorMessage(error || currentJob?.error || "Bilinmeyen hata")}
                                        </p>
                                    </div>
                                    <Button onClick={handleNewRun} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105">
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
                                            Testler Başarıyla Tamamlandı! 🚀
                                        </h3>
                                        <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                                            Raporlar analiz edilmeye hazır.
                                        </p>
                                    </div>
                                    <Button onClick={handleNewRun} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/30 transition-transform hover:scale-105">
                                        <Play className="w-4 h-4 mr-2" />
                                        Yeni Test
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Configuration Card - Left Side (4 Cols) */}
                <Card className="lg:col-span-4 border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm ring-1 ring-slate-900/5 dark:ring-white/10 h-fit sticky top-6 transition-all duration-300 hover:shadow-2xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white">
                                <Settings2 className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="block">{dictionary.testRun.testConfiguration || "Test Yapılandırması"}</span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 block mt-0.5">Test parametrelerini belirleyin</span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <Separator className="bg-slate-100 dark:bg-slate-800" />
                    <CardContent className="space-y-6 pt-6">
                        <Form {...form}>
                            <form className="space-y-6">
                                {/* Project & Tags Section */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                            <FolderClosed className="w-4 h-4 text-indigo-500" />
                                            {dictionary.testRun.projectAndTags || "PROJE & ETİKETLER"}
                                        </Label>

                                        <Select
                                            value={selectedProject}
                                            onValueChange={handleProjectChange}
                                            disabled={isProcessing || projectsLoading}
                                        >
                                            <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 hover:border-indigo-300 transition-colors">
                                                <SelectValue placeholder={dictionary.testRun.selectProject || "Proje Seçin"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {projects.map((p) => (
                                                    <SelectItem key={p} value={p} className="cursor-pointer">{p}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Feature File Selection */}
                                    {selectedProject && (
                                        <div className="space-y-2">
                                            <Label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                                <FileJson className="w-4 h-4 text-emerald-500" />
                                                Feature Dosyası
                                            </Label>
                                            <Select
                                                value={selectedFeatureFile}
                                                onValueChange={setSelectedFeatureFile}
                                                disabled={isProcessing || filesLoading}
                                            >
                                                <SelectTrigger className="w-full h-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:ring-indigo-500/20 hover:border-emerald-300 transition-colors">
                                                    <SelectValue placeholder={filesLoading ? "Yükleniyor..." : "Dosya Seçin"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableFeatureFiles.map((file) => (
                                                        <SelectItem key={file} value={file} className="cursor-pointer font-mono text-sm">{file}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {availableFeatureFiles.length === 0 && !filesLoading && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Bu grupta henüz feature dosyası yok
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Modern Tag Selector */}
                                    <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{dictionary.testRun.selectTags || "Etiketler"}</Label>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-4 w-4 text-slate-400 hover:text-indigo-500">
                                                            <Info className="w-3 h-3" />
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
                                            <div className="flex gap-1">
                                                {['and', 'or', 'custom'].map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        onClick={() => setTagLogic(mode as any)}
                                                        className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md transition-all ${tagLogic === mode
                                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 shadow-sm'
                                                            : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                    >
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {tagLogic !== 'custom' ? (
                                            <>
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                                    <Input
                                                        placeholder={dictionary.testRun.searchTags || "Etiket ara..."}
                                                        className="w-full pl-9 h-9 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-indigo-500/20"
                                                        value={tagSearch}
                                                        onChange={(e) => setTagSearch(e.target.value)}
                                                    />
                                                </div>

                                                <div className="max-h-[140px] overflow-y-auto pr-1 flex flex-wrap gap-2 pt-1 custom-scrollbar min-h-[60px]">
                                                    {tagsLoading ? (
                                                        <div className="w-full h-full flex items-center justify-center p-4">
                                                            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                                        </div>
                                                    ) : filteredTags.length > 0 ? (
                                                        filteredTags
                                                            .filter(t => t.toLowerCase().includes(tagSearch.toLowerCase()))
                                                            .map(tag => (
                                                                <Badge
                                                                    key={tag}
                                                                    variant="outline"
                                                                    onClick={() => toggleTag(tag)}
                                                                    className={`cursor-pointer px-2.5 py-1 text-xs border transition-all duration-200 select-none ${selectedTags.includes(tag)
                                                                        ? 'bg-indigo-500 text-white border-indigo-600 shadow-md shadow-indigo-500/20 hover:bg-indigo-600'
                                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                                                                        }`}
                                                                >
                                                                    {tag}
                                                                </Badge>
                                                            ))
                                                    ) : (
                                                        <p className="w-full text-center text-xs text-slate-400 py-4 italic">
                                                            {selectedProject ? (dictionary.testRun.noTagsFound || "Etiket bulunamadı.") : (dictionary.testRun.selectProjectFirst || "Proje seçin.")}
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <FormField<TestRunFormValues>
                                                control={control}
                                                name="tags"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input {...field} value={String(field.value)} placeholder="@custom and @query" className="w-full font-mono text-sm bg-white dark:bg-slate-900" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}

                                        {/* Selected Tags Preview */}
                                        {selectedTags.length > 0 && tagLogic !== 'custom' && (
                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                {selectedTags.map((tag, i) => (
                                                    <Badge
                                                        key={tag}
                                                        variant="secondary"
                                                        className="flex items-center gap-1.5 py-1 px-2 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50"
                                                    >
                                                        {tag}
                                                        {i < selectedTags.length - 1 && (
                                                            <span className="ml-1 px-1 rounded bg-slate-200 dark:bg-slate-700 text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest">{tagLogic}</span>
                                                        )}
                                                    </Badge>
                                                ))}
                                                <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-auto h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-600 self-center">
                                                    {dictionary.testRun.clear || "Temizle"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Environment Configuration Inputs */}
                                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <Label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <Globe className="w-3.5 h-3.5" />
                                            {fullDict.testRun?.environmentInfo || "Ortam Bilgileri"}
                                        </Label>
                                        {configLoading ? (
                                            <div className="flex items-center justify-center py-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <FormField<TestRunFormValues>
                                                    control={control}
                                                    name="baseLoginUrl"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input
                                                                        {...field}
                                                                        value={String(field.value)}
                                                                        placeholder="https://example.com/login"
                                                                        className="h-9 text-xs bg-white dark:bg-slate-950 w-full"
                                                                        disabled={isProcessing}
                                                                    />
                                                                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                                        <span className="text-[10px] text-slate-400">URL</span>
                                                                    </div>
                                                                </div>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormField<TestRunFormValues>
                                                        control={control}
                                                        name="username"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        {...field}
                                                                        value={String(field.value)}
                                                                        placeholder="Kullanıcı Adı"
                                                                        className="h-9 text-xs bg-white dark:bg-slate-950 w-full"
                                                                        disabled={isProcessing}
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField<TestRunFormValues>
                                                        control={control}
                                                        name="password"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <Input
                                                                            {...field}
                                                                            value={String(field.value)}
                                                                            type={showPassword ? 'text' : 'password'}
                                                                            placeholder="Şifre"
                                                                            disabled={isProcessing}
                                                                            className="h-9 text-xs bg-white dark:bg-slate-950 pr-8 w-full"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="absolute right-0 top-0 h-9 w-8 text-slate-400 hover:text-slate-600"
                                                                            onClick={() => setShowPassword(!showPassword)}
                                                                        >
                                                                            {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                        </Button>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                {/* Environment & Browser */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">{dictionary.testRun.environment}</Label>
                                        <FormField<TestRunFormValues>
                                            control={control}
                                            name="env"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select
                                                        value={field.value as string}  // Cast to string to match expected type
                                                        onValueChange={field.onChange}
                                                        disabled={isProcessing}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="w-full h-10 text-xs">
                                                                <SelectValue placeholder={dictionary.testRun.selectEnvironment || "Ortam Seçin"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {ENV_OPTIONS.map((opt) => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${opt.value === 'prod' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                                                                            opt.value === 'staging' ? 'bg-amber-400' :
                                                                                'bg-emerald-500'
                                                                            }`} />
                                                                        {opt.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">{fullDict.testRun?.browser || "Tarayıcı"}</Label>
                                        <FormField<TestRunFormValues>
                                            control={control}
                                            name="browser"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select
                                                        value={field.value as string}
                                                        onValueChange={field.onChange}
                                                        disabled={isProcessing}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="w-full h-10 text-xs">
                                                                <SelectValue placeholder={fullDict.testRun?.selectBrowser || "Tarayıcı Seçin"} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {BROWSER_OPTIONS.map(opt => (
                                                                <SelectItem key={opt.value} value={opt.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-base">{opt.icon}</span> {opt.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Additional Config Accordion style */}
                                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-lg p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-slate-600 flex items-center gap-2">
                                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                                            {dictionary.testRun.parallelExecution}
                                        </Label>
                                        <FormField<TestRunFormValues>
                                            control={control}
                                            name="isParallel"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Switch
                                                            checked={!!field.value}
                                                            onCheckedChange={field.onChange}
                                                            disabled={isProcessing}
                                                            className="scale-75 origin-right"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    {isParallel && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="pt-2 px-1">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{dictionary.testRun.threadCount}</Label>
                                                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                                                    {form.watch("threads")}
                                                </span>
                                            </div>
                                            <FormField<TestRunFormValues>
                                                control={control}
                                                name="threads"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Slider
                                                                min={1}
                                                                max={10}
                                                                step={1}
                                                                value={[Number(field.value)]}
                                                                onValueChange={(vals: number[]) => field.onChange(vals[0])}
                                                                className="cursor-pointer py-2"
                                                                disabled={isProcessing}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                                                <span>1</span>
                                                <span>5</span>
                                                <span>10</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                {/* CTA Button */}
                                <Button
                                    onClick={handleRun}
                                    type="button"
                                    disabled={isProcessing || (!tags.trim() && !isComplete && !isFailed) || !selectedProject || !selectedFeatureFile || startJobMutation.isPending}
                                    className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl text-base font-semibold tracking-wide transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
                                >
                                    {startJobMutation.isPending || isProcessing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            {dictionary.testRun.running}
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="w-5 h-5 mr-2 animate-pulse" />
                                            {dictionary.testRun.runTests}
                                        </>
                                    )}
                                </Button>

                                {/* View Reports Link */}
                                {isComplete && result && (
                                    <Button
                                        variant="outline"
                                        className="w-full h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                        onClick={() => {
                                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
                                            const url = result.reportUrl?.startsWith('http') ? result.reportUrl : `${baseUrl}${result.reportUrl}`;
                                            window.open(url, '_blank');
                                        }}
                                    >
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        {fullDict.testRun?.viewReport || "Raporu Görüntüle"}
                                    </Button>
                                )}
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                {/* Results Card - Right Side (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Tabs for Results / Logs / History */}
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-xl ring-1 ring-slate-900/5 dark:ring-white/10 rounded-xl p-6 min-h-[600px]">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                                {dictionary.testRun.testResults || "Test Sonuçları & Geçmiş"}
                            </h2>
                        </div>

                        <TestResultsTable
                            creations={testCreations}
                            currentPage={currentPage}
                            totalPages={testRunsData?.totalPages || 0}
                            totalElements={testRunsData?.totalElements || 0}
                            onPageChange={handlePageChange}
                            isLoading={testRunsLoading}
                        />

                        {(!testCreations || testCreations.length === 0) && !testRunsLoading && (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Layers className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">{fullDict.testRun.noResults || "Henüz Test Koşulmadı"}</h3>
                                <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto mt-2">
                                    {fullDict.testRun?.noResultsDescription || "Soldaki panelden proje ve etiket seçerek ilk testinizi başlatın."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
