"use client";

import { useQueries } from "@tanstack/react-query";
import { getActiveJob, type JobType, type Job } from "@/app/actions/job-actions";
import { isJobInProgress } from "@/lib/use-job";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/providers/socket-provider";
import { motion, AnimatePresence } from "framer-motion";

const JOB_TYPES: { type: JobType; label: string; path: string }[] = [
    { type: "GENERATE_TESTS", label: "Test Üretimi", path: "/generate-tests" },
    { type: "RUN_TESTS", label: "Test Çalıştırma", path: "/test-run" },
    { type: "UPLOAD_JSON", label: "JSON Yükleme", path: "/upload-json" },
];

function getJobStatusIcon(job: Job | null) {
    if (!job) return null;

    switch (job.status) {
        case "PENDING":
            return <Clock className="w-4 h-4 text-yellow-500" />;
        case "RUNNING":
            return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        case "COMPLETED":
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case "FAILED":
            return <XCircle className="w-4 h-4 text-red-500" />;
        default:
            return null;
    }
}

function getJobStatusLabel(job: Job | null) {
    if (!job) return "";

    switch (job.status) {
        case "PENDING":
            return "Bekliyor...";
        case "RUNNING":
            return "Çalışıyor...";
        case "COMPLETED":
            return "Tamamlandı";
        case "FAILED":
            return "Başarısız";
        default:
            return job.status;
    }
}

export function BackgroundProcessIndicator() {
    const router = useRouter();
    const { connectionStatus } = useSocket();

    

    // Query all job types
    const jobQueries = useQueries({
        queries: JOB_TYPES.map(({ type }) => ({
            queryKey: ["activeJob", type],
            queryFn: () => getActiveJob(type),
            staleTime: Infinity,
            refetchOnWindowFocus: false,
        })),
    });

    // Filter active jobs (in progress or recently completed)
    const activeJobs = jobQueries
        .map((query, index) => ({
            ...JOB_TYPES[index],
            job: query.data,
            isLoading: query.isLoading,
        }))
        .filter(({ job }) => job !== null && job !== undefined);

    // Count jobs in progress
    const inProgressCount = activeJobs.filter(({ job }) => isJobInProgress(job)).length;

    if (activeJobs.length === 0) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <AnimatePresence>
                        {inProgressCount > 0 ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </motion.div>
                        ) : (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                    </AnimatePresence>

                    <Badge
                        variant="secondary"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                        {activeJobs.length}
                    </Badge>
                    <span
                        className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
                            connectionStatus === "connected"
                                ? "bg-green-500"
                                : connectionStatus === "connecting"
                                ? "bg-yellow-500 animate-pulse"
                                : "bg-red-500"
                        }`}
                        aria-label={`socket-${connectionStatus}`}
                    />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
                {activeJobs.map(({ type, label, path, job }) => (
                    <DropdownMenuItem
                        key={type}
                        onClick={() => router.push(path)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            {getJobStatusIcon(job ?? null)}
                            <span>{label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {getJobStatusLabel(job ?? null)}
                        </span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
