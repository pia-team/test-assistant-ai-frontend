"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    ChevronRight as ChevronRightIcon,
    Search,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Eye,
    EyeOff,
    Terminal,
    Video,
    BarChart2,
    AlertCircle,
} from "lucide-react";
import { useLocale } from "@/components/locale-context";
import { useSocket } from "@/context/SocketContext";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface TestItem {
    id: string;
    name: string;
    type: string;
    status: "passed" | "failed" | "running" | "pending" | "skipped" | "stopped" | "unknown";
    modifiedAt: string;
    createdBy: string;
    videoUrl?: string;
    screenshotUrl?: string;
    duration?: string;
    error?: string;
    logs?: string[];
}

export interface TestCreation {
    id: string;
    name: string;
    status: "completed" | "completed_with_failures" | "running" | "failed" | "pending" | "stopped" | "unknown";
    environment: string;
    project?: string;
    reportUrl?: string;
    createdAt: string;
    tests: TestItem[];
}

interface TestResultsTableProps {
    creations: TestCreation[];
    onViewVideo?: (testId: string, creationId: string, test?: TestItem) => void;
    currentPage?: number;
    totalPages?: number;
    totalElements?: number;
    onPageChange?: (page: number) => void;
    isLoading?: boolean;
}

const getStatusConfig = (dictionary: any) => ({
    completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: dictionary.jobDashboard?.successful || "Completed" },
    completed_with_failures: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: dictionary.testRun?.completedWithFailures || "Completed with Failures" },
    running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: dictionary.testRun?.running || "Running", animate: true },
    failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: dictionary.testRun?.error || "Failed" },
    pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: dictionary.backgroundProcess?.pending || "Pending" },
    passed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: dictionary.testDetail?.pass || "Passed" },
    skipped: { icon: Clock, color: "text-gray-500", bg: "bg-gray-500/10", label: dictionary.testList?.skipped || "Skipped" },
    stopped: { icon: XCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: dictionary.testRun?.aborted || "Stopped" },
    unknown: { icon: Clock, color: "text-gray-400", bg: "bg-gray-400/10", label: dictionary.jobDashboard?.unknown || "Unknown" },
});

const LogViewer = React.memo(({ logs, status, compact = false }: { logs: string[]; status: string; compact?: boolean }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className={cn(
            "rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-950 overflow-hidden",
            compact ? "mt-2" : "mt-4"
        )}>
            {!compact && (
                <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Execution Logs
                    </span>
                </div>
            )}
            <div ref={scrollRef} className={cn(
                "p-3 overflow-y-auto font-mono text-[12px] custom-scrollbar space-y-0.5",
                compact ? "max-h-[300px]" : "max-h-[500px]"
            )}>
                <AnimatePresence mode="popLayout">
                    {logs && logs.length > 0 ? (
                        logs.map((log, idx) => {
                            const isLast = idx === logs.length - 1;
                            const isRunning = status === "running" && isLast;

                            return (
                                <motion.div
                                    key={`${idx}-${log.substring(0, 10)}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className={cn(
                                        "py-0.5 px-2 rounded-sm break-all flex items-start gap-2 relative group transition-colors",
                                        log.includes("✓") || log.includes("PASS") ? "text-emerald-400 bg-emerald-500/5" :
                                            log.includes("✗") || log.includes("FAIL") || log.includes("Error") ? "text-rose-400 bg-rose-500/5" :
                                                log.includes("▶") || log.includes("➡") ? "text-sky-400" :
                                                    "text-zinc-400 hover:bg-white/5"
                                    )}
                                >
                                    <span className="opacity-20 select-none inline-block w-6 text-right border-r border-white/5 pr-2 shrink-0">
                                        {idx + 1}
                                    </span>
                                    <span className="flex-1">{log}</span>
                                    {isRunning && (
                                        <motion.div
                                            animate={{ opacity: [0.4, 1, 0.4] }}
                                            transition={{ duration: 1.5, repeat: Infinity }}
                                            className="w-1.5 h-3 bg-blue-500/50 rounded-full mt-0.5 shrink-0"
                                        />
                                    )}
                                </motion.div>
                            );
                        })
                    ) : (
                        <div className="text-zinc-600 italic text-[11px] py-1">No logs available for this feature yet...</div>
                    )}
                </AnimatePresence>
            </div>
            {status === "running" && (
                <div className="px-3 py-1.5 bg-blue-500/5 border-t border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">Live Streaming...</span>
                    </div>
                </div>
            )}
        </div>
    );
});
LogViewer.displayName = "LogViewer";

export function TestResultsTable({
    creations,
    onViewVideo,
    currentPage = 0,
    totalPages = 0,
    totalElements = 0,
    onPageChange,
    isLoading = false
}: TestResultsTableProps) {
    const router = useRouter();
    const { dictionary } = useLocale();
    const { isConnected } = useSocket();
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedTest, setSelectedTest] = useState<TestItem | null>(null);
    const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});

    // Auto-repair active tab if the selected one is missing
    useEffect(() => {
        creations.forEach(creation => {
            const currentTab = activeTabs[creation.id];
            if (currentTab && creation.tests.length > 0) {
                const tabExists = creation.tests.some(t => t.id === currentTab) || currentTab === "logs";
                if (!tabExists) {
                    // Fallback to first test if the previous tab (like "test-execution-log") is gone
                    setActiveTabs(prev => ({ ...prev, [creation.id]: creation.tests[0].id }));
                }
            }
        });
    }, [creations, activeTabs]);

    const filteredCreations = useMemo(() => {
        if (!searchQuery.trim()) return creations;
        const query = searchQuery.toLowerCase();
        return creations.filter(
            (creation) =>
                creation.name.toLowerCase().includes(query) ||
                creation.tests.some((test) => test.name.toLowerCase().includes(query))
        );
    }, [creations, searchQuery]);

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                // Initialize active tab for this row if not set
                if (!activeTabs[id]) {
                    const creation = creations.find(c => c.id === id);
                    if (creation && creation.tests.length > 0) {
                        setActiveTabs(prev => ({ ...prev, [id]: creation.tests[0].id }));
                    } else {
                        setActiveTabs(prev => ({ ...prev, [id]: "logs" }));
                    }
                }
            }
            return next;
        });
    };

    const handleViewVideo = (testId: string, creationId: string, test?: TestItem) => {
        if (test) {
            setSelectedTest(test);
        } else if (onViewVideo) {
            onViewVideo(testId, creationId, test);
        } else {
            router.push(`/test-run/video/${creationId}/${testId}`);
        }
    };

    const StatusBadge = ({ status, compact = false }: { status: string, compact?: boolean }) => {
        const config = (getStatusConfig(dictionary) as Record<string, any>)[status] || getStatusConfig(dictionary).unknown;
        const Icon = config.icon;
        return (
            <Badge variant="outline" className={cn("gap-1", config.color, config.bg, compact && "px-1.5 py-0")}>
                <Icon className={cn(compact ? "w-2.5 h-2.5" : "w-3 h-3", config.animate && "animate-spin")} />
                {!compact && config.label}
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
                                <Terminal className="w-4 h-4 text-white" />
                            </div>
                            {dictionary.testRun?.testResults || "Test Sonuçları"}
                        </CardTitle>
                        <CardDescription>
                            {dictionary.testRun?.testResultsDesc || "Test çalıştırma sonuçları ve raporlar"}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <Badge variant="outline" className="text-green-500 border-green-500/50">
                                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                Live
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                                Offline
                            </Badge>
                        )}
                    </div>
                </div>
                {/* Search */}
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </CardHeader>
            <CardContent>
                {filteredCreations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <motion.div
                            animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center mb-4"
                        >
                            <Terminal className="w-10 h-10 text-primary opacity-60" />
                        </motion.div>
                        <p className="text-muted-foreground">No test results found</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]"></TableHead>
                                    <TableHead>Creation Name</TableHead>
                                    <TableHead className="w-[120px]">Feature</TableHead>
                                    <TableHead className="w-[120px]">Environment</TableHead>
                                    <TableHead className="w-[150px]">Status</TableHead>
                                    <TableHead className="w-[180px]">Created At</TableHead>
                                    <TableHead className="w-[100px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCreations.map((creation) => (
                                    <React.Fragment key={creation.id}>
                                        {/* Main Row */}
                                        <TableRow
                                            className={cn(
                                                "cursor-pointer transition-colors",
                                                creation.status === "running"
                                                    ? "bg-blue-500/5 hover:bg-blue-500/10 border-l-4 border-l-blue-500 shadow-sm"
                                                    : "hover:bg-muted/50 border-l-4 border-l-transparent"
                                            )}
                                            onClick={() => toggleRow(creation.id)}
                                        >
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                                    {expandedRows.has(creation.id) ? (
                                                        <ChevronDown className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronRight className="h-4 w-4" />
                                                    )}
                                                </Button>
                                            </TableCell>
                                            <TableCell className="font-medium">{creation.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] truncate max-w-[100px]" title={creation.project}>
                                                    {creation.project || "Global"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="uppercase font-mono text-[10px]">
                                                    {creation.environment}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={creation.status} />
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground font-mono">
                                                {creation.createdAt}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                {creation.reportUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        title="Raporu Aç"
                                                        onClick={() => {
                                                            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
                                                            const rawUrl = creation.reportUrl || "";

                                                            let url = "";
                                                            if (rawUrl.startsWith('http')) {
                                                                url = rawUrl;
                                                            } else if (rawUrl.startsWith('file://')) {
                                                                url = rawUrl;
                                                            } else {
                                                                url = `${baseUrl}${rawUrl}`;
                                                            }

                                                            window.open(url, '_blank');
                                                        }}
                                                    >
                                                        <BarChart2 className="w-4 h-4 text-primary" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Detail Row */}
                                        <AnimatePresence>
                                            {expandedRows.has(creation.id) && (
                                                <TableRow key={`${creation.id}-detail`}>
                                                    <TableCell colSpan={7} className="p-0 bg-muted/10 border-y">
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4">
                                                                <Tabs
                                                                    value={activeTabs[creation.id] || creation.tests[0]?.id || "logs"}
                                                                    onValueChange={(value) => setActiveTabs(prev => ({ ...prev, [creation.id]: value }))}
                                                                    className="w-full"
                                                                >
                                                                    <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                                                        <TabsList className="bg-transparent h-auto p-0 flex gap-2 overflow-x-auto custom-scrollbar">
                                                                            {creation.tests.map((test) => (
                                                                                <div key={test.id} className={cn(
                                                                                    "relative flex items-center gap-1 rounded-lg p-1 overflow-hidden",
                                                                                    test.status === "running" ? "bg-transparent" : "bg-zinc-100/50 dark:bg-zinc-800/20"
                                                                                )}>
                                                                                    {test.status === "running" && (
                                                                                        <>
                                                                                            <div className="absolute inset-0 z-0 pointer-events-none">
                                                                                                <div className="absolute inset-[-200%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_0deg,#3b82f6,#60a5fa,#93c5fd,#60a5fa,#3b82f6)]" />
                                                                                            </div>
                                                                                            <div className="absolute inset-[2px] bg-zinc-100 dark:bg-zinc-800 rounded-[calc(0.5rem-2px)] z-[1]" />
                                                                                        </>
                                                                                    )}
                                                                                    <TabsTrigger
                                                                                        value={test.id}
                                                                                        className={cn(
                                                                                            "relative z-10 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md px-4 py-1.5 flex items-center gap-2 transition-all",
                                                                                            test.status === "running" && "bg-white/80 dark:bg-zinc-800/80"
                                                                                        )}
                                                                                    >
                                                                                        <StatusBadge status={test.status} compact={true} />
                                                                                        <span className="text-sm font-semibold whitespace-nowrap">
                                                                                            {test.name}
                                                                                            {test.status === "running" && (
                                                                                                <motion.span
                                                                                                    initial={{ opacity: 0 }}
                                                                                                    animate={{ opacity: 1 }}
                                                                                                    className="inline-flex ml-1.5 text-blue-500"
                                                                                                >
                                                                                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, times: [0, 0.5, 1] }}>.</motion.span>
                                                                                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, times: [0, 0.5, 1] }}>.</motion.span>
                                                                                                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, times: [0, 0.5, 1] }}>.</motion.span>
                                                                                                </motion.span>
                                                                                            )}
                                                                                        </span>
                                                                                    </TabsTrigger>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className={cn(
                                                                                            "h-8 w-8 text-indigo-500 z-10",
                                                                                            (test.status === "running" || test.status === "pending")
                                                                                                ? "opacity-40 cursor-not-allowed"
                                                                                                : "hover:bg-zinc-200 dark:hover:bg-zinc-700/50"
                                                                                        )}
                                                                                        disabled={test.status === "running" || test.status === "pending"}
                                                                                        onClick={(e) => {
                                                                                            e.preventDefault();
                                                                                            e.stopPropagation();
                                                                                            handleViewVideo(test.id, creation.id, test);
                                                                                        }}
                                                                                        title={test.status === "running" ? "Video henüz işlenmedi" : "Videoyu izle"}
                                                                                    >
                                                                                        <Video className="w-4 h-4" />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                            {creation.tests.length === 0 && (
                                                                                <TabsTrigger value="logs" className="px-4 py-2">Execution Logs</TabsTrigger>
                                                                            )}
                                                                        </TabsList>
                                                                    </div>

                                                                    {creation.tests.map((test) => (
                                                                        <TabsContent key={test.id} value={test.id} className="mt-0 focus-visible:ring-0">
                                                                            <div className="space-y-4">
                                                                                <div className="flex items-center justify-between px-2">
                                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                                                                        <Badge variant="secondary" className="text-[10px]">{test.type.toUpperCase()}</Badge>
                                                                                        <span>{test.modifiedAt}</span>
                                                                                    </div>
                                                                                </div>

                                                                                <LogViewer
                                                                                    logs={test.logs || []}
                                                                                    status={test.status}
                                                                                />

                                                                                {test.status === 'failed' && test.error && (
                                                                                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                                                                                        <div className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase mb-2">
                                                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                                                            Error Details
                                                                                        </div>
                                                                                        <pre className="text-xs font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap bg-white dark:bg-zinc-950 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                                                                                            {test.error}
                                                                                        </pre>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </TabsContent>
                                                                    ))}

                                                                    {creation.tests.length === 0 && (
                                                                        <TabsContent value="logs">
                                                                            <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                                                                                <Loader2 className="w-8 h-8 mb-4 animate-spin opacity-20" />
                                                                                <p className="text-sm font-medium">Waiting for feature-specific logs...</p>
                                                                            </div>
                                                                        </TabsContent>
                                                                    )}
                                                                </Tabs>
                                                            </div>
                                                        </motion.div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-4">
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>
                                Showing {currentPage * 10 + 1} to {Math.min((currentPage + 1) * 10, totalElements)} of {totalElements} results
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange?.(currentPage - 1)}
                                disabled={currentPage === 0 || isLoading}
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Previous
                            </Button>

                            {/* Page Numbers */}
                            <div className="flex items-center space-x-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i;
                                    } else if (currentPage <= 2) {
                                        pageNum = i;
                                    } else if (currentPage >= totalPages - 3) {
                                        pageNum = totalPages - 5 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }

                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => onPageChange?.(pageNum)}
                                            disabled={isLoading}
                                        >
                                            {pageNum + 1}
                                        </Button>
                                    );
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onPageChange?.(currentPage + 1)}
                                disabled={currentPage >= totalPages - 1 || isLoading}
                            >
                                Next
                                <ChevronRightIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}

                <TestResultDetailsModal
                    testId={selectedTest?.id || null}
                    creations={creations}
                    isOpen={!!selectedTest}
                    onClose={() => setSelectedTest(null)}
                />
            </CardContent>
        </Card >
    );
}

interface TestResultDetailsModalProps {
    testId: string | null;
    creations: TestCreation[];
    isOpen: boolean;
    onClose: () => void;
}

function TestResultDetailsModal({ testId, creations, isOpen, onClose }: TestResultDetailsModalProps) {
    const { dictionary } = useLocale();

    // Find the current test from creations to get live updates
    const test = useMemo(() => {
        if (!testId) return null;
        for (const creation of creations) {
            const found = creation.tests.find(t => t.id === testId);
            if (found) return found;
        }
        return null;
    }, [testId, creations]);

    if (!test) return null;

    const config = (getStatusConfig(dictionary) as Record<string, any>)[test.status] || getStatusConfig(dictionary).unknown;
    const StatusIcon = config.icon;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[800px] sm:max-w-[800px] max-w-[calc(100vw-2rem)] max-h-[90vh] flex flex-col bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-zinc-200/50 dark:border-zinc-800/50 p-0 overflow-hidden shadow-2xl rounded-[24px]">
                <DialogHeader className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20">
                    <div className="flex items-center justify-between w-full pr-8">
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                                {test.name}
                                <ModalStatusBadge status={test.status} dictionary={dictionary} />
                            </DialogTitle>
                            <DialogDescription className="text-zinc-500 font-mono text-sm">
                                {test.type.toUpperCase()} • {test.modifiedAt}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                    {/* Video Section - Primary in modal */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Video className="w-5 h-5 text-indigo-500" />
                                Execution Recording
                            </h3>
                            {test.duration && (
                                <Badge variant="secondary" className="font-mono px-3 py-1">
                                    Duration: {test.duration}
                                </Badge>
                            )}
                        </div>
                        <div className="aspect-video bg-black rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xl ring-1 ring-zinc-200/50 dark:ring-zinc-800/50">
                            {(() => {
                                // Statuses where we expect a video eventually
                                const expectsVideo = ["passed", "failed", "completed", "completed_with_failures"].includes(test.status);
                                // Statuses where the test is definitely still going
                                const isRunning = ["running", "pending", "unknown"].includes(test.status);

                                // Show loading if:
                                // 1. Test is running/pending
                                // 2. Test is done (passed/failed) but video URL is not yet available (processing)
                                const showLoading = isRunning || (expectsVideo && !test.videoUrl);

                                if (showLoading) {
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 bg-gradient-to-br from-zinc-900 to-zinc-950">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                                                <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-sm font-semibold text-zinc-300">
                                                    {isRunning ? "Test Çalışıyor..." : "Video İşleniyor..."}
                                                </p>
                                                <p className="text-xs text-zinc-500 font-mono">
                                                    {isRunning ? "Video test tamamlandığında hazırlanacak" : "Kayıt tamamlanmak üzere, lütfen bekleyin"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, times: [0, 0.5, 1] }} className="w-2 h-2 rounded-full bg-blue-500" />
                                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2, times: [0, 0.5, 1] }} className="w-2 h-2 rounded-full bg-blue-500" />
                                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4, times: [0, 0.5, 1] }} className="w-2 h-2 rounded-full bg-blue-500" />
                                            </div>
                                        </div>
                                    );
                                } else if (test.videoUrl) {
                                    return (
                                        <video
                                            key={test.videoUrl}
                                            src={test.videoUrl.startsWith('http') ? test.videoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${test.videoUrl.startsWith('/') ? '' : '/'}${test.videoUrl}`}
                                            controls
                                            autoPlay
                                            playsInline
                                            preload="auto"
                                            className="w-full h-full object-contain"
                                        />
                                    );
                                } else {
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
                                            <Video className="w-16 h-16 opacity-10" />
                                            <p className="text-sm font-mono opacity-50">Video kaydı bu oturum için mevcut değil</p>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>

                    {/* Screenshot Section - If available */}
                    {test.screenshotUrl && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Eye className="w-5 h-5 text-emerald-500" />
                                Final State Screenshot
                            </h3>
                            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-lg group cursor-zoom-in">
                                <img
                                    src={test.screenshotUrl.startsWith('http') ? test.screenshotUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${test.screenshotUrl}`}
                                    alt="Test Screenshot"
                                    className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                            </div>
                        </div>
                    )}

                    {/* Logs Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-primary" />
                            Detailed Execution Logs
                        </h3>
                        <LogViewer logs={test.logs || []} status={test.status} />
                    </div>
                </div>

                <div className="p-5 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/80 dark:bg-zinc-900/40 flex justify-between items-center px-8">
                    <span className="text-xs text-zinc-500 font-mono">ID: {test.id}</span>
                    <Button variant="secondary" size="lg" onClick={onClose} className="px-12 font-bold transition-all hover:bg-zinc-200 dark:hover:bg-zinc-800">
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper component for status badges in the modal
function ModalStatusBadge({ status, dictionary }: { status: string; dictionary: any }) {
    const config = (getStatusConfig(dictionary) as Record<string, any>)[status] || getStatusConfig(dictionary).unknown;
    const Icon = config.icon;
    return (
        <Badge variant="outline" className={cn("gap-2 py-1 px-3 border-2", config.color, config.bg)}>
            <Icon className={cn("w-4 h-4", config.animate && "animate-spin")} />
            <span className="text-[12px] font-bold uppercase tracking-wider">{config.label}</span>
        </Badge>
    );
}
