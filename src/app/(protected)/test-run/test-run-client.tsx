"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale } from "@/components/locale-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Rocket, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
    type TestItem,
} from "@/components/test-results-table";
import { parseLogsToDashboardData } from "@/lib/log-parser";

// Sub-components
import { TestRunHeader } from "./components/TestRunHeader";
import { StatusBanners } from "./components/StatusBanners";
import { ExecutionModeSelector } from "./components/ExecutionModeSelector";
import { ProjectAndFileSelector } from "./components/ProjectAndFileSelector";
import { TagSelectorSection } from "./components/TagSelectorSection";
import { GlobalTagSection } from "./components/GlobalTagSection";
import { EnvironmentProfileSection } from "./components/EnvironmentProfileSection";
import { EnvironmentDetailsSection } from "./components/EnvironmentDetailsSection";
import { ParallelConfigSection } from "./components/ParallelConfigSection";
import { ResultsSection } from "./components/ResultsSection";
import { AddEnvironmentDialog } from "./components/AddEnvironmentDialog";
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
    type Job,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import { useRouter } from "next/navigation";
import {
    getProjectsAction,
} from "@/app/actions/tag-actions";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";


// Zod schema for test run form validation
const testRunFormSchema = z.object({
    tags: z.string(), // Empty allowed - validation handled by button disabled logic
    env: z.string().min(1, "Ortam seçilmelidir"),
    browser: z.string().min(1, "Tarayıcı seçilmelidir"),
    headless: z.boolean(),
    isParallel: z.boolean(),
    threads: z.number().min(0).max(10),
    baseLoginUrl: z.string().url("Geçerli bir URL giriniz"),
    username: z.string().min(1, "Kullanıcı adı zorunludur"),
    password: z.string().min(1, "Şifre zorunludur"),
});

const envFormSchema = z.object({
    envKey: z.string().min(1, "Ortam tipi seçilmelidir"),
    name: z.string().min(1, "Profil adı zorunludur"),
    baseLoginUrl: z.string().min(1, "Domain (URL) zorunludur"),
    username: z.string().min(1, "Kullanıcı adı zorunludur"),
    password: z.string().min(1, "Şifre zorunludur"),
});

type TestRunFormValues = z.infer<typeof testRunFormSchema>;
type EnvFormValues = z.infer<typeof envFormSchema>;

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
            completedWithFailures?: string;
            aborted?: string;
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
            testParamsDesc?: string;
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

interface Environment {
    id: string;
    envKey: string;
    name: string;
    baseLoginUrl: string;
    username: string;
    password: string;
}

const ENV_OPTIONS = [
    { value: "uat", label: "UAT" },
    { value: "test", label: "Test" },
    { value: "dev", label: "Development" },
    { value: "staging", label: "Staging" },
    { value: "prod", label: "Production" },
];

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
    const [profileSearch, setProfileSearch] = useState("");
    const [availableFeatureFiles, setAvailableFeatureFiles] = useState<string[]>(
        [],
    );
    const [selectedFeatureFiles, setSelectedFeatureFiles] = useState<string[]>(
        [],
    );
    const [filesLoading, setFilesLoading] = useState(false);

    // Environments state
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [environmentsLoading, setEnvironmentsLoading] = useState(false);
    const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

    const envForm = useForm<EnvFormValues>({
        resolver: zodResolver(envFormSchema),
        defaultValues: {
            envKey: "uat",
            name: "",
            baseLoginUrl: "",
            username: "",
            password: "",
        },
    });


    // Execution Mode
    const [executionMode, setExecutionMode] = useState<"specific" | "global">(
        "specific",
    );

    // Global Tag Mode State
    const [globalTags, setGlobalTags] = useState<string[]>([]);
    const [globalTagInput, setGlobalTagInput] = useState("");

    // Real-time logs
    const [liveLogs, setLiveLogs] = useState<string[]>([]);

    // Fetch paginated test run jobs from backend
    const { data: testRunsData, isLoading: testRunsLoading } = useTestRuns(
        currentPage,
        10,
    );

    console.log(testRunsData);
    // Derive testCreations from testRunsData
    const testCreations = useMemo(() => {
        if (!testRunsData?.content) return [];

        return testRunsData.content.map((job) => {
            const request = (job as any).request || (job as any).requestData;
            const result = (job as any).result || (job as any).resultData;
            const jobTags = request?.tags || "";

            // Use liveLogs if this is the currently viewed job and it's running
            const isViewing = viewJobId === job.id;
            const effectiveLogs =
                isViewing && liveLogs.length > 0
                    ? liveLogs.join("\n")
                    : result?.logs || "";

            // Parse logs if available
            let tests: TestItem[] = [];
            if (effectiveLogs) {
                const dashboardData = parseLogsToDashboardData(effectiveLogs, jobTags);
                if (dashboardData) {
                    tests = dashboardData.testCases.map((tc) => ({
                        id: tc.id,
                        name: tc.title,
                        type: tc.browser,
                        status:
                            tc.status === "PASSED"
                                ? "passed"
                                : tc.status === "FAILED"
                                    ? "failed"
                                    : "skipped",
                        modifiedAt: new Date(job.createdAt).toLocaleString(),
                        createdBy: job.username || "System",
                        videoUrl: tc.video || undefined,
                        error: tc.errors.join("\n") || undefined,
                        logs: tc.steps.map((s) => s.content),
                    }));
                }
            }

            // Determine job status for table based on test results if completed
            let tableStatus = job.status.toLowerCase();
            if (tableStatus === "completed") {
                const hasAnyFailure = tests.some((t: any) => t.status === "failed");
                if (hasAnyFailure) {
                    tableStatus = "completed_with_failures";
                }
            } else if (tableStatus === "stopped") {
                tableStatus = "stopped";
            }

            return {
                id: job.id,
                name: jobTags
                    ? jobTags.startsWith("@")
                        ? jobTags
                        : `@${jobTags}`
                    : request?.env?.toUpperCase() || "Test Run",
                status: tableStatus as any,
                environment: request?.env || "dev",
                project: request?.project || request?.groupName || "Global",
                reportUrl: result?.reportUrl,
                createdAt: job.createdAt
                    ? new Date(job.createdAt).toLocaleString("tr-TR")
                    : "N/A",
                tests: tests,
            };
        });
    }, [testRunsData, liveLogs, viewJobId]);

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

    const {
        watch,
        setValue,
        handleSubmit,
        formState: { errors },
        control,
        getValues,
    } = form;

    // Fetch Environments on mount
    useEffect(() => {
        const fetchEnvironments = async () => {
            setEnvironmentsLoading(true);
            try {
                const apiUrl =
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const response = await fetch(`${apiUrl}/api/environments`);
                if (!response.ok) throw new Error("Failed to fetch environments");
                const data = await response.json();

                // Deduplicate by ID just in case
                const uniqueData = Array.from(
                    new Map(data.map((item: Environment) => [item.id, item])).values(),
                ) as Environment[];
                setEnvironments(uniqueData);

                // If current env is not in list (and list is not empty), select first
                if (data.length > 0) {
                    // Check if current 'env' value exists in data
                    const currentEnv = getValues("env");
                    const exists = data.some((e: Environment) => e.envKey === currentEnv);
                    if (!exists) {
                        const devEnv = data.find((e: Environment) => e.envKey === "dev");
                        setValue("env", devEnv ? devEnv.envKey : data[0].envKey);
                    }
                }
            } catch (err: any) {
                console.error("Failed to fetch environments:", err);
                toast.error("Ortam bilgileri yüklenemedi");
            } finally {
                setEnvironmentsLoading(false);
            }
        };
        fetchEnvironments();
    }, [setValue, getValues]);

    // Only watch fields that need to trigger UI changes
    const env = watch("env");
    const isParallel = watch("isParallel");
    const headless = watch("headless");
    const tags = watch("tags"); // Need to watch for button disabled state

    // Job hooks - socket updates the cache automatically
    const { data: activeJob } = useActiveJob("RUN_TESTS");
    const {
        subscribeToJob,
        unsubscribeFromJob,
        onJobLog,
        offJobLog,
    } = useSocket();

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

    // Fetch project tags when project or selected files change
    useEffect(() => {
        const fetchTagsFromFiles = async () => {
            if (!selectedProject || selectedFeatureFiles.length === 0) {
                setAvailableTags([]);
                return;
            }

            setTagsLoading(true);
            try {
                const apiUrl =
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const response = await fetch(
                    `${apiUrl}/api/projects/${encodeURIComponent(selectedProject)}/features/tags`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(selectedFeatureFiles),
                    },
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

        fetchTagsFromFiles();
    }, [selectedProject, selectedFeatureFiles]);

    // Fetch feature files when project changes
    useEffect(() => {
        const fetchFeatureFiles = async () => {
            if (!selectedProject) {
                setAvailableFeatureFiles([]);
                setSelectedFeatureFiles([]);
                return;
            }
            setFilesLoading(true);
            try {
                const apiUrl =
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                const response = await fetch(
                    `${apiUrl}/api/projects/${encodeURIComponent(selectedProject)}/features`,
                );
                if (!response.ok) {
                    throw new Error("Failed to fetch feature files");
                }
                const data = await response.json();
                setAvailableFeatureFiles(data);
                // Auto-select first file if available
                if (data.length > 0) {
                    setSelectedFeatureFiles([data[0]]);
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

    // Handle project change with state reset
    const handleProjectChange = (project: string) => {
        setSelectedProject(project);
        setSelectedTags([]);
        setTagSearch("");
        setTagLogic("and");
        setSelectedFeatureFiles([]);

        // Reset form fields to default values
        setValue("tags", "", { shouldValidate: true });
        // Keep other settings
    };

    const handleModeChange = (value: "specific" | "global") => {
        setExecutionMode(value);
        // Clear tags when switching modes to prevent confusion
        setValue("tags", "", { shouldValidate: true });
        setSelectedTags([]);
        // Clear global tags too
        setGlobalTags([]);
        setGlobalTagInput("");
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

    const toggleFeatureFile = (file: string) => {
        setSelectedFeatureFiles((prev) =>
            prev.includes(file) ? prev.filter((f) => f !== file) : [...prev, file],
        );
    };

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
        );
    };

    const clearSelection = () => {
        setSelectedTags([]);
        if (tagLogic === "custom") {
            setValue("tags", "", { shouldValidate: true });
        }
    };

    // Global Tag Management Functions
    const handleAddGlobalTag = () => {
        if (!globalTagInput.trim()) return;
        let tagToAdd = globalTagInput.trim();
        if (tagToAdd.includes(" ")) {
            toast.error("Tag'lerde boşluk kullanılamaz");
            return;
        }
        if (!tagToAdd.startsWith("@")) {
            tagToAdd = "@" + tagToAdd;
        }
        if (!globalTags.includes(tagToAdd)) {
            setGlobalTags([...globalTags, tagToAdd]);
        }
        setGlobalTagInput("");
    };

    const handleRemoveGlobalTag = (tag: string) => {
        setGlobalTags(globalTags.filter((t) => t !== tag));
    };

    const clearGlobalTags = () => {
        setGlobalTags([]);
        setGlobalTagInput("");
    };

    const onEnvSubmit = async (data: EnvFormValues) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
            const response = await fetch(`${apiUrl}/api/environments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error("Ortam profili oluşturulamadı");

            const savedEnv = await response.json();
            setEnvironments((prev) => {
                const index = prev.findIndex((e) => e.id === savedEnv.id);
                if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = savedEnv;
                    return updated;
                } else {
                    return [...prev, savedEnv];
                }
            });

            envForm.reset();
            setIsEnvModalOpen(false);

            // Auto-select the newly created profile
            setActiveProfileId(savedEnv.id);
            setValue("env", savedEnv.envKey);
            setValue("baseLoginUrl", savedEnv.baseLoginUrl || "");
            setValue("username", savedEnv.username || "");
            setValue("password", savedEnv.password || "");

            toast.success(`${savedEnv.name} profili oluşturuldu ve seçildi`);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    // Subscribe to job updates for real-time status updates
    useEffect(() => {
        if (!viewJobId) return;

        subscribeToJob(viewJobId, {});

        return () => {
            unsubscribeFromJob(viewJobId);
        };
    }, [viewJobId, subscribeToJob, unsubscribeFromJob]);

    // Listen for real-time logs
    useEffect(() => {
        if (!viewJobId && !activeJob) return;

        const jobId = viewJobId || activeJob?.id;
        if (!jobId) return;

        const handleLog = (data: {
            id: string;
            log: string;
            timestamp: number;
        }) => {
            if (data.id === jobId) {
                setLiveLogs((prev) => [...prev, data.log]);
            }
        };

        // If we are using the detailed subscription via SocketContext
        onJobLog(handleLog);

        return () => {
            offJobLog();
        };
    }, [viewJobId, activeJob, onJobLog, offJobLog]);

    // Clear logs when starting new job
    useEffect(() => {
        if (viewJobId) {
            setLiveLogs([]);
        }
    }, [viewJobId]);

    // Handle initial state from active job
    useEffect(() => {
        if (activeJob && !viewJobId) {
            setViewJobId(activeJob.id);
        }
    }, [activeJob, viewJobId]);

    // Load config when environment changes (FROM LOCAL STATE)
    useEffect(() => {
        // If we have an active profile, use it to sync values
        if (activeProfileId) {
            const profile = environments.find((p) => p.id === activeProfileId);
            if (profile) {
                setValue("baseLoginUrl", profile.baseLoginUrl || "");
                setValue("username", profile.username || "");
                setValue("password", profile.password || "");
                setValue("env", profile.envKey); // Ensure env matches profile
                return;
            }
        }

        // If no active profile, try to find a default for the selected environment
        const selectedEnv = environments.find((e) => e.envKey === env);
        if (selectedEnv) {
            setValue("baseLoginUrl", selectedEnv.baseLoginUrl || "");
            setValue("username", selectedEnv.username || "");
            setValue("password", selectedEnv.password || "");
        }
    }, [env, activeProfileId, environments, setValue]);

    const { data: jobStatus } = useJobStatus(viewJobId);
    const startJobMutation = useStartRunTestsJob();
    const clearJob = useClearJob("RUN_TESTS");

    // Sync job status with active job - socket updates both caches
    const currentJob = jobStatus || activeJob;
    // Unified status logic
    const isProcessing = isJobInProgress(currentJob);
    const isComplete = isJobComplete(currentJob);
    const isFailed = isJobFailed(currentJob);
    const isStopped = isJobStopped(currentJob);

    // Unified Side Effects Logic (Confetti + Toasts)
    const [showConfetti, setShowConfetti] = useState(false);
    const prevJobIdRef = useRef<string | null>(null);
    const prevStatusRef = useRef<string | undefined>(undefined);

    // Dependencies need to be captured for effect
    const dictionaryRef = useRef(dictionary);
    dictionaryRef.current = dictionary;

    useEffect(() => {
        const currentId = currentJob?.id;
        const currentStatus = currentJob?.status;

        if (!currentId || !currentStatus) {
            return;
        }

        // If job ID changed, we just update calls and DO NOT show confetti/toasts immediately
        if (currentId !== prevJobIdRef.current) {
            prevJobIdRef.current = currentId;
            prevStatusRef.current = currentStatus;
            setShowConfetti(false);
            return;
        }

        // Same job ID. Check for status transition.

        // COMPLETED Transition
        if (
            currentStatus === "COMPLETED" &&
            prevStatusRef.current !== "COMPLETED"
        ) {
            setShowConfetti(true);

            // Check for failures inside currentJob result if needed, or rely on hasFailures derived value if available in scope
            // However, hasFailures depends on currentJob which is in scope.
            // We need to be careful about closure staleness, but currentJob is in dependency.

            // Re-evaluating failures here might be safer or using the prop if guaranteed fresh.
            // Let's use the hasFailures logic derived earlier in the component if possible,
            // but we need to ensure it's calculated from the SAME render cycle or job state.

            const isFailure =
                currentJob.result &&
                ((currentJob.result as any).status === "failed" ||
                    (currentJob.result as any).failed > 0);

            if (isFailure) {
                toast.warning(
                    dictionaryRef.current.testRun?.completedWithFailures ||
                    "İşlem hatalarla tamamlandı",
                );
            } else {
                toast.success(dictionaryRef.current.common.success);
            }
        }

        // FAILED Transition
        if (currentStatus === "FAILED" && prevStatusRef.current !== "FAILED") {
            toast.error(currentJob.error || dictionaryRef.current.common.error);
        }

        // STOPPED Transition
        if (currentStatus === "STOPPED" && prevStatusRef.current !== "STOPPED") {
            toast.info(
                dictionaryRef.current.testRun?.aborted || "İşlem iptal edildi",
            );
        }

        // If status went back to running, hide confetti
        if (currentStatus !== "COMPLETED") {
            setShowConfetti(false);
        }

        prevStatusRef.current = currentStatus;
    }, [
        currentJob?.id,
        currentJob?.status,
        currentJob?.result,
        currentJob?.error,
    ]);

    // Refined status for display
    const hasFailures = useMemo(() => {
        if (!currentJob?.id) return false;
        // Check current job in testCreations for failures
        const creation = testCreations.find((tc) => tc.id === currentJob.id);
        if (creation) {
            return creation.tests.some((t) => t.status === "failed");
        }
        return false;
    }, [currentJob?.id, testCreations]);

    // Extract result from completed job
    const result: TestRunResult | null =
        isComplete && currentJob?.result
            ? (currentJob.result as TestRunResult)
            : null;

    // Parse logs and update testCreations when job completes
    useEffect(() => {
        if (!result?.logs || !viewJobId) return;

        const dashboardData = parseLogsToDashboardData(result.logs, tags);
        if (!dashboardData) return;

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
            if (msg.trim().startsWith("{")) {
                const parsed = JSON.parse(msg);
                return parsed.message || parsed.error || "Sunucu hatası oluştu";
            }
        } catch (_e) {
            // Fallback to original message
        }
        return msg;
    };

    const onSubmit = async (data: TestRunFormValues) => {
        setError(null);
        setViewJobId(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

            const currentProfile = activeProfileId
                ? environments.find((e) => e.id === activeProfileId)
                : environments.find((e) => e.envKey === data.env);

            const payload = {
                id: currentProfile?.id,
                envKey: data.env,
                name: currentProfile?.name || data.env.toUpperCase(),
                baseLoginUrl: data.baseLoginUrl,
                username: data.username,
                password: data.password,
            };

            const response = await fetch(`${apiUrl}/api/environments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to save environment config");

            const savedEnv = await response.json();

            // Update local environments state
            setEnvironments((prev) => {
                const index = prev.findIndex((e) => e.id === savedEnv.id);
                if (index >= 0) {
                    const updated = [...prev];
                    updated[index] = savedEnv;
                    return updated;
                } else {
                    return [...prev, savedEnv];
                }
            });

            // Determine tags
            const tagsToUse =
                executionMode === "global" ? globalTags.join(" or ") : data.tags;

            // Start Job
            startJobMutation.mutate(
                {
                    tags: tagsToUse,
                    env: data.env,
                    groupName: executionMode === "specific" ? selectedProject : undefined,
                    featureFiles:
                        executionMode === "specific" ? selectedFeatureFiles : undefined,
                    isParallel: data.isParallel,
                    threads: data.isParallel ? data.threads : null,
                    browser: data.browser,
                    headless: data.headless,
                    environmentId: savedEnv.id,
                },
                {
                    onSuccess: (job: Job) => {
                        setViewJobId(job.id);
                        toast.success(
                            `${data.env} ortamı güncellendi ve testler başlatıldı`,
                        );
                    },
                    onError: (err: any) => {
                        if (err.message?.startsWith("JOB_ALREADY_RUNNING:")) {
                            const activeJobData = JSON.parse(
                                err.message.replace("JOB_ALREADY_RUNNING:", ""),
                            );
                            setViewJobId(activeJobData.id);
                            toast.warning(
                                dictionary.testRun.jobAlreadyRunning ||
                                "Bu işlem zaten çalışıyor",
                            );
                        } else {
                            const friendlyError = parseErrorMessage(err.message);
                            setError(friendlyError);
                            toast.error(friendlyError);
                        }
                    },
                },
            );
        } catch (err: any) {
            toast.error(`Config kaydedilemedi: ${err.message}`);
        }
    };

    const handleRun = handleSubmit(onSubmit);

    const handleNewRun = () => {
        clearJob(currentJob?.id);
        setError(null);
        setViewJobId(null);
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500">
            {showConfetti && (
                <Confetti
                    width={width}
                    height={height}
                    recycle={false}
                    numberOfPieces={500}
                />
            )}

            {/* Header */}
            <TestRunHeader
                title={dictionary.testRun.title}
                subtitle={dictionary.testRun.subtitle}
            />

            {/* Status Banners Area */}
            <StatusBanners
                isProcessing={isProcessing}
                isStuck={isStuck}
                isComplete={isComplete}
                isStopped={isStopped}
                isFailed={isFailed}
                hasFailures={hasFailures}
                currentJob={currentJob}
                error={error}
                dictionary={dictionary}
                fullDict={fullDict}
                handleNewRun={handleNewRun}
                parseErrorMessage={parseErrorMessage}
            />

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
                                <span className="block">
                                    {dictionary.testRun.testConfiguration ||
                                        "Test Yapılandırması"}
                                </span>
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 block mt-0.5">
                                    {dictionary.testRun.testParamsDesc ||
                                        "Test parametrelerini belirleyin"}
                                </span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <Separator className="bg-slate-100 dark:bg-slate-800" />
                    <CardContent className="space-y-6 pt-6">
                        <Form {...form}>
                            <form onSubmit={handleRun} className="space-y-6">
                                <Tabs
                                    value={executionMode}
                                    onValueChange={(v) => handleModeChange(v as any)}
                                    className="w-full"
                                >
                                    <ExecutionModeSelector dictionary={dictionary} />

                                    <TabsContent value="specific" className="space-y-6 mt-0">
                                        <ProjectAndFileSelector
                                            selectedProject={selectedProject}
                                            handleProjectChange={handleProjectChange}
                                            projects={projects}
                                            isProcessing={isProcessing}
                                            projectsLoading={projectsLoading}
                                            availableFeatureFiles={availableFeatureFiles}
                                            selectedFeatureFiles={selectedFeatureFiles}
                                            toggleFeatureFile={toggleFeatureFile}
                                            setSelectedFeatureFiles={setSelectedFeatureFiles}
                                            filesLoading={filesLoading}
                                            dictionary={dictionary}
                                        />

                                        <TagSelectorSection
                                            control={control}
                                            selectedProject={selectedProject}
                                            tagLogic={tagLogic}
                                            setTagLogic={setTagLogic}
                                            tagSearch={tagSearch}
                                            setTagSearch={setTagSearch}
                                            tagsLoading={tagsLoading}
                                            filteredTags={filteredTags}
                                            selectedTags={selectedTags}
                                            toggleTag={toggleTag}
                                            clearSelection={clearSelection}
                                            dictionary={dictionary}
                                            fullDict={fullDict}
                                        />
                                    </TabsContent>

                                    <TabsContent value="global" className="space-y-6 mt-0">
                                        <GlobalTagSection
                                            globalTags={globalTags}
                                            globalTagInput={globalTagInput}
                                            setGlobalTagInput={setGlobalTagInput}
                                            handleAddGlobalTag={handleAddGlobalTag}
                                            handleRemoveGlobalTag={handleRemoveGlobalTag}
                                            clearGlobalTags={clearGlobalTags}
                                            isProcessing={isProcessing}
                                            dictionary={dictionary}
                                        />
                                    </TabsContent>
                                </Tabs>

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                <EnvironmentProfileSection
                                    control={form.control}
                                    setValue={form.setValue}
                                    environments={environments}
                                    activeProfileId={activeProfileId}
                                    setActiveProfileId={setActiveProfileId}
                                    profileSearch={profileSearch}
                                    setProfileSearch={setProfileSearch}
                                    isProcessing={isProcessing}
                                    setIsEnvModalOpen={setIsEnvModalOpen}
                                    ENV_OPTIONS={ENV_OPTIONS}
                                    BROWSER_OPTIONS={BROWSER_OPTIONS}
                                    dictionary={dictionary}
                                    fullDict={fullDict}
                                />

                                <EnvironmentDetailsSection
                                    control={form.control}
                                    configLoading={configLoading}
                                    isProcessing={isProcessing}
                                    showPassword={showPassword}
                                    setShowPassword={setShowPassword}
                                    dictionary={dictionary}
                                    fullDict={fullDict}
                                />

                                <ParallelConfigSection
                                    control={control}
                                    watch={form.watch}
                                    isParallel={isParallel}
                                    isProcessing={isProcessing}
                                    dictionary={dictionary}
                                />

                                <Separator className="bg-slate-100 dark:bg-slate-800" />

                                <Button
                                    type="submit"
                                    disabled={
                                        isProcessing ||
                                        startJobMutation.isPending ||
                                        (executionMode === "specific" &&
                                            (!selectedProject ||
                                                selectedFeatureFiles.length === 0 ||
                                                !tags.trim())) ||
                                        (executionMode === "global" && globalTags.length === 0)
                                    }
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
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="lg:col-span-8 space-y-6">
                    <ResultsSection
                        testCreations={testCreations}
                        currentPage={currentPage}
                        totalPages={testRunsData?.totalPages || 0}
                        totalElements={testRunsData?.totalElements || 0}
                        handlePageChange={handlePageChange}
                        testRunsLoading={testRunsLoading}
                        dictionary={dictionary}
                        fullDict={fullDict}
                    />
                </div>
            </div>

            <AddEnvironmentDialog
                isOpen={isEnvModalOpen}
                setIsOpen={setIsEnvModalOpen}
                envForm={envForm}
                onEnvSubmit={onEnvSubmit}
                ENV_OPTIONS={ENV_OPTIONS}
                dictionary={dictionary}
            />
        </div>
    );
}
