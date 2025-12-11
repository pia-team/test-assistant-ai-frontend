"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useSocket } from "@/providers/socket-provider";
import { JOB_UPDATE } from "@/lib/socket-events";
import {
    startGenerateTestsJob,
    startRunTestsJob,
    startUploadJsonJob,
    getJobStatus,
    getActiveJob,
    getAllJobs,
    cancelJob,
    startOpenReportJob,
    type Job,
    type JobType,
} from "@/app/actions/job-actions";

// Hook to get active job by type - fetches from backend only on first mount if cache is empty
export function useActiveJob(type: JobType) {
    return useQuery({
        queryKey: ["activeJob", type],
        queryFn: () => getActiveJob(type),
        staleTime: Infinity, // Never consider stale - we manage updates manually
        gcTime: Infinity, // Never garbage collect - keep in cache forever
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // This is the key: only refetch if data is stale AND we don't have cached data
        // Since staleTime is Infinity, this effectively means "only fetch once ever"
    });
}

// Hook to poll job status - this one should poll while job is active
export function useJobStatus(jobId: string | null | undefined) {
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: ["job", jobId],
        queryFn: async () => {
            const status = await getJobStatus(jobId!);
            // When job completes, also update the activeJob cache with full result
            if (status.status === "COMPLETED" || status.status === "FAILED" || status.status === "STOPPED") {
                const current = queryClient.getQueryData<Job | null>(["activeJob", status.type]);
                if (current && current.id === status.id) {
                    queryClient.setQueryData(["activeJob", status.type], null);
                }
                queryClient.setQueryData(["job", status.id], status);
            }
            return status;
        },
        enabled: !!jobId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
    });
}

// Hook to start generate-tests job
export function useStartGenerateTestsJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: startGenerateTestsJob,
        onSuccess: (job) => {
            // Update active job cache
            queryClient.setQueryData(["activeJob", "GENERATE_TESTS"], job);
            // Set initial job data
            queryClient.setQueryData(["job", job.id], job);
            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
            queryClient.invalidateQueries({ queryKey: ["activeJob", "GENERATE_TESTS"] });
        },
        onError: (error: Error) => {
            // If job already running, parse the active job from error
            if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                const activeJob = JSON.parse(error.message.replace("JOB_ALREADY_RUNNING:", ""));
                queryClient.setQueryData(["activeJob", "GENERATE_TESTS"], activeJob);
                queryClient.setQueryData(["job", activeJob.id], activeJob);
            }
        },
    });
}

// Hook to start run-tests job
export function useStartRunTestsJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: startRunTestsJob,
        onSuccess: (job) => {
            queryClient.setQueryData(["activeJob", "RUN_TESTS"], job);
            queryClient.setQueryData(["job", job.id], job);
            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
            queryClient.invalidateQueries({ queryKey: ["activeJob", "RUN_TESTS"] });
        },
        onError: (error: Error) => {
            if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                const activeJob = JSON.parse(error.message.replace("JOB_ALREADY_RUNNING:", ""));
                queryClient.setQueryData(["activeJob", "RUN_TESTS"], activeJob);
                queryClient.setQueryData(["job", activeJob.id], activeJob);
            }
        },
    });
}

// Hook to start upload-json job
export function useStartUploadJsonJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: startUploadJsonJob,
        onSuccess: (job) => {
            queryClient.setQueryData(["activeJob", "UPLOAD_JSON"], job);
            queryClient.setQueryData(["job", job.id], job);
            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
            queryClient.invalidateQueries({ queryKey: ["activeJob", "UPLOAD_JSON"] });
        },
        onError: (error: Error) => {
            if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
                const activeJob = JSON.parse(error.message.replace("JOB_ALREADY_RUNNING:", ""));
                queryClient.setQueryData(["activeJob", "UPLOAD_JSON"], activeJob);
                queryClient.setQueryData(["job", activeJob.id], activeJob);
            }
        },
    });
}

// Hook to clear job from cache (after viewing results)
export function useClearJob(type: JobType) {
    const queryClient = useQueryClient();

    return (jobId?: string) => {
        queryClient.setQueryData(["activeJob", type], null);
        if (jobId) {
            queryClient.removeQueries({ queryKey: ["job", jobId] });
        }
    };
}

// Hook to listen for global job updates
export function useJobUpdates() {
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!socket) return;

        const handleJobUpdate = (updatedJob: Job) => {
            console.log("Debug: Socket event received", updatedJob);

            // Update single job cache
            queryClient.setQueryData(["job", updatedJob.id], updatedJob);

            // Update active job cache if it matches the active one
            queryClient.setQueryData(["activeJob", updatedJob.type], (current: Job | undefined) => {
                if (current && current.id === updatedJob.id) {
                    if (updatedJob.status === "COMPLETED" || updatedJob.status === "FAILED" || updatedJob.status === "STOPPED") {
                        return null;
                    }
                    return updatedJob;
                }
                // If we receive a running/pending job and we have no active job, it's a new one
                if (!current && (updatedJob.status === "PENDING" || updatedJob.status === "RUNNING")) {
                    return updatedJob;
                }
                return current;
            });

            // Update allJobs list
            queryClient.setQueryData(["allJobs"], (oldJobs: Job[] = []) => {
                if (!Array.isArray(oldJobs)) return [updatedJob];

                // Check if job exists
                const index = oldJobs.findIndex(j => j.id === updatedJob.id);
                if (index !== -1) {
                    const newJobs = [...oldJobs];
                    newJobs[index] = updatedJob;
                    return newJobs;
                }
                // Add new job (at the beginning properly sorted)
                return [updatedJob, ...oldJobs];
            });

            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
            // Invalidate activeJob to be safe/sure
            queryClient.invalidateQueries({ queryKey: ["activeJob", updatedJob.type] });
        };

        socket.on(JOB_UPDATE, handleJobUpdate);

        return () => {
            socket.off(JOB_UPDATE, handleJobUpdate);
        };
    }, [socket, queryClient]);
}

// Hook to get all jobs for dashboard
export function useAllJobs() {
    return useQuery({
        queryKey: ["allJobs"],
        queryFn: () => getAllJobs(),
        refetchOnReconnect: true,
        refetchOnMount: "always",
    });
}

// Hook to cancel a job
export function useCancelJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cancelJob,
        onSuccess: (_data, jobId) => {
            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            // We also need to invalidate activeJob queries, but we don't know the type here easily
            // Simpler to invalidate all activeJob queries
            queryClient.invalidateQueries({ queryKey: ["activeJob"] });
        },
    });
}

// Helper to check if job is in progress
export function isJobInProgress(job: Job | null | undefined): boolean {
    return job?.status === "PENDING" || job?.status === "RUNNING";
}

// Helper to check if job is complete
export function isJobComplete(job: Job | null | undefined): boolean {
    return job?.status === "COMPLETED";
}

// Helper to check if job failed
export function isJobFailed(job: Job | null | undefined): boolean {
    return job?.status === "FAILED";
}

// Helper to check if job stopped
export function isJobStopped(job: Job | null | undefined): boolean {
    return job?.status === "STOPPED";
}

export function useStartOpenReportJob() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startOpenReportJob,
        onSuccess: (job) => {
            queryClient.invalidateQueries({ queryKey: ["activeJob"] });
            queryClient.setQueryData(["job", job.id], job);
            queryClient.invalidateQueries({ queryKey: ["allJobs"] });
        },
    });
}
