"use client";

import { useQueries } from "@tanstack/react-query";
import { getActiveJob, type JobType, type Job } from "@/app/actions/job-actions";
import { isJobInProgress } from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/components/locale-context";

const JOB_TYPES: { type: JobType; labelKey: "generateTests" | "runTests" | "uploadJson"; path: string }[] = [
    { type: "GENERATE_TESTS", labelKey: "generateTests", path: "/generate-tests" },
    { type: "RUN_TESTS", labelKey: "runTests", path: "/test-run" },
    { type: "UPLOAD_JSON", labelKey: "uploadJson", path: "/upload-json" },
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


export function BackgroundProcessIndicator() {
    const router = useRouter();
    const { isConnected } = useSocket();
    const { dictionary } = useLocale();

    const getJobStatusLabel = (job: Job | null) => {
        if (!job) return "";
        
        switch (job.status) {
            case "PENDING":
                return dictionary.backgroundProcess.pending;
            case "RUNNING":
                return dictionary.backgroundProcess.running;
            case "COMPLETED":
                return dictionary.backgroundProcess.completed;
            case "FAILED":
                return dictionary.backgroundProcess.failed;
            default:
                return job.status;
        }
    };

    // Query all job types - data is updated by socket events in SocketContext
    const jobQueries = useQueries({
        queries: JOB_TYPES.map(({ type }) => ({
            queryKey: ["activeJob", type],
            queryFn: () => getActiveJob(type),
            staleTime: Infinity,
            gcTime: Infinity,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <AnimatePresence mode="wait">
                        {inProgressCount > 0 ? (
                            <motion.div
                                key="loading"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </motion.div>
                        ) : isConnected ? (
                            <motion.div
                                key="connected"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <Wifi className="w-5 h-5 text-green-500" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="disconnected"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                            >
                                <WifiOff className="w-5 h-5 text-muted-foreground" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Badge with count - only show if there are active jobs */}
                    {activeJobs.length > 0 && (
                        <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                            {activeJobs.length}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-64">
                {/* Socket connection status */}
                <DropdownMenuItem className="flex items-center gap-2 cursor-default" disabled>
                    {isConnected ? (
                        <>
                            <Wifi className="w-4 h-4 text-green-500" />
                            <span className="text-green-500 text-xs">{dictionary.backgroundProcess.realtimeActive}</span>
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground text-xs">{dictionary.backgroundProcess.connectionWaiting}</span>
                        </>
                    )}
                </DropdownMenuItem>
                
                {activeJobs.length > 0 && (
                    <div className="border-t my-1" />
                )}
                
                {activeJobs.map(({ type, labelKey, path, job }) => (
                    <DropdownMenuItem
                        key={type}
                        onClick={() => router.push(path)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex items-center gap-2">
                            {getJobStatusIcon(job ?? null)}
                            <span>{dictionary.backgroundProcess[labelKey]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {job?.progress !== undefined && isJobInProgress(job) && (
                                <span className="text-xs text-blue-500">%{job.progress}</span>
                            )}
                            <span className="text-xs text-muted-foreground">
                                {getJobStatusLabel(job ?? null)}
                            </span>
                        </div>
                    </DropdownMenuItem>
                ))}
                
                {activeJobs.length === 0 && (
                    <DropdownMenuItem className="text-center text-muted-foreground text-xs cursor-default" disabled>
                        {dictionary.backgroundProcess.noActiveProcess}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
