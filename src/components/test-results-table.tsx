"use client";

import React, { useState, useMemo } from "react";
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
    Terminal,
    Video,
} from "lucide-react";
import { useLocale } from "@/components/locale-context";
import { useSocket } from "@/context/SocketContext";
import { cn } from "@/lib/utils";

export interface TestItem {
    id: string;
    name: string;
    type: string;
    status: "passed" | "failed" | "running" | "pending" | "skipped";
    modifiedAt: string;
    createdBy: string;
    videoUrl?: string;
    error?: string;
    logs?: string[];
}

export interface TestCreation {
    id: string;
    name: string;
    status: "completed" | "running" | "failed" | "pending";
    environment: string;
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

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; bg: string; label: string; animate?: boolean }> = {
    completed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Completed" },
    running: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-500/10", label: "Running", animate: true },
    failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10", label: "Failed" },
    pending: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Pending" },
    passed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10", label: "Passed" },
    skipped: { icon: Clock, color: "text-gray-500", bg: "bg-gray-500/10", label: "Skipped" },
};

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
            }
            return next;
        });
    };

    const handleViewVideo = (testId: string, creationId: string, test?: TestItem) => {
        if (onViewVideo) {
            onViewVideo(testId, creationId, test);
        } else {
            // Store test data in sessionStorage for the video page to access
            if (test) {
                sessionStorage.setItem(`test-${testId}`, JSON.stringify(test));
            }
            router.push(`/test-run/video/${creationId}/${testId}`);
        }
    };

    const StatusBadge = ({ status }: { status: keyof typeof statusConfig }) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        return (
            <Badge variant="outline" className={cn("gap-1", config.color, config.bg)}>
                <Icon className={cn("w-3 h-3", config.animate && "animate-spin")} />
                {config.label}
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
                                    <TableHead className="w-[120px]">Environment</TableHead>
                                    <TableHead className="w-[150px]">Status</TableHead>
                                    <TableHead className="w-[180px]">Created At</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredCreations.map((creation) => (
                                    <React.Fragment key={creation.id}>
                                        {/* Main Row */}
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
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
                                        </TableRow>

                                        {/* Expanded Detail Row */}
                                        <AnimatePresence>
                                            {expandedRows.has(creation.id) && (
                                                <TableRow key={`${creation.id}-detail`}>
                                                    <TableCell colSpan={5} className="p-0 bg-muted/30">
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="p-4 space-y-4">
                                                                {/* Tests Table */}
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead>Test Name</TableHead>
                                                                            <TableHead className="w-[100px]">Type</TableHead>
                                                                            <TableHead className="w-[120px]">Latest Status</TableHead>
                                                                            <TableHead className="w-[150px]">Modified At</TableHead>
                                                                            <TableHead className="w-[120px]">Created By</TableHead>
                                                                            <TableHead className="w-[100px]">Actions</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {creation.tests.map((test) => (
                                                                            <React.Fragment key={test.id}>
                                                                                <TableRow
                                                                                    className="cursor-pointer hover:bg-background/50"
                                                                                >
                                                                                    <TableCell className="font-medium">
                                                                                        {test.name}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge variant="secondary" className="text-xs">
                                                                                            {test.type}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <StatusBadge status={test.status} />
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm text-muted-foreground">
                                                                                        {test.modifiedAt}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm text-muted-foreground">
                                                                                        {test.createdBy}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="gap-1 text-xs"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleViewVideo(test.id, creation.id, test);
                                                                                            }}
                                                                                        >
                                                                                            <Video className="w-3 h-3" />
                                                                                            View
                                                                                        </Button>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                                {test.status === 'failed' && test.error && (
                                                                                    <TableRow key={`${test.id}-error`} className="bg-red-500/5">
                                                                                        <TableCell colSpan={6} className="py-2 px-4 border-b">
                                                                                            <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
                                                                                                <span className="font-bold flex-shrink-0">ERROR:</span>
                                                                                                <pre className="whitespace-pre-wrap font-mono">{test.error}</pre>
                                                                                            </div>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                )}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>

                                                                {/* Execution Logs Section */}
                                                                {creation.tests.some(t => t.logs && t.logs.length > 0) && (
                                                                    <div className="mt-4 rounded-md border bg-zinc-900/50">
                                                                        <div className="px-4 py-2 border-b border-zinc-700 flex items-center gap-2">
                                                                            <Terminal className="w-4 h-4 text-muted-foreground" />
                                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                                Execution Logs
                                                                            </span>
                                                                        </div>
                                                                        <div className="p-4 max-h-[300px] overflow-y-auto space-y-1">
                                                                            {creation.tests.flatMap((test) =>
                                                                                (test.logs || []).map((log, idx) => (
                                                                                    <div
                                                                                        key={`${test.id}-log-${idx}`}
                                                                                        className={cn(
                                                                                            "text-sm font-mono py-1 px-2 rounded",
                                                                                            log.includes("✓") || log.includes("PASS") ? "text-green-400 bg-green-500/10" :
                                                                                                log.includes("✗") || log.includes("FAIL") || log.includes("Error") ? "text-red-400 bg-red-500/10" :
                                                                                                    log.includes("▶") || log.includes("➡") ? "text-blue-400 bg-blue-500/10" :
                                                                                                        log.includes("🎥") ? "text-purple-400 bg-purple-500/10" :
                                                                                                            log.includes("📸") ? "text-yellow-400 bg-yellow-500/10" :
                                                                                                                "text-zinc-400"
                                                                                        )}
                                                                                    >
                                                                                        {log}
                                                                                    </div>
                                                                                ))
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )}
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
            </CardContent>
        </Card >
    );
}
