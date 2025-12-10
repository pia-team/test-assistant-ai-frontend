"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    startGenerateTestsJob,
    startRunTestsJob,
    startUploadJsonJob,
    getJobStatus,
    getActiveJob,
    getAllJobs,
    cancelJob,
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
            if (status.status === "COMPLETED" || status.status === "FAILED") {
                queryClient.setQueryData(["activeJob", status.type], status);
            }
            return status;
        },
        enabled: !!jobId,
        staleTime: 0, // Always refetch for polling
        gcTime: Infinity, // Keep in cache
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            // Stop polling when completed or failed
            if (status === "COMPLETED" || status === "FAILED") {
                return false;
            }
            return 3000; // Poll every 3 seconds
        },
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

// Hook to get all jobs for dashboard
export function useAllJobs() {
    return useQuery({
        queryKey: ["allJobs"],
        queryFn: () => getAllJobs(),
        refetchInterval: 5000, // Poll every 5 seconds for dashboard
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
