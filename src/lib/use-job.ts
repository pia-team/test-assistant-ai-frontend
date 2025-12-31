"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useKeycloak } from "@/providers/keycloak-provider";
import {
  startGenerateTestsJob,
  startRunTestsJob,
  startUploadJsonJob,
  getJobStatus,
  getActiveJob,
  getAllJobs,
  getJobsByType,
  cancelJob,
  startOpenReportJob,
  type Job,
  type JobType,
} from "@/app/actions/job-actions";

export type { Job, JobType };

// Hook to get active job by type - fetches from backend only on first mount if cache is empty
export function useActiveJob(type: JobType) {
  const { token } = useKeycloak();
  return useQuery({
    queryKey: ["activeJob", type],
    queryFn: () => getActiveJob(type, token),
    enabled: !!token, // Only fetch if authenticated
    staleTime: Infinity, // Never consider stale - we manage updates manually
    gcTime: Infinity, // Never garbage collect - keep in cache forever
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // This is the key: only refetch if data is stale AND we don't have cached data
    // Since staleTime is Infinity, this effectively means "only fetch once ever"
  });
}

// Hook to get job status - now relies on socket updates instead of polling
export function useJobStatus(jobId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { token } = useKeycloak();

  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const status = await getJobStatus(jobId!, token);
      if (status.status === "COMPLETED" || status.status === "FAILED") {
        queryClient.setQueryData(["activeJob", status.type], status);
      }
      return status;
    },
    enabled: !!jobId && !!token,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

// Helper to update job cache safely (preventing older data from overwriting newer socket updates)
function updateJobCacheSafely(
  queryClient: QueryClient,
  queryKey: QueryKey,
  incomingJob: Job,
) {
  queryClient.setQueryData(queryKey, (old: Job | null | undefined) => {
    if (!old || old.id !== incomingJob.id) return incomingJob;

    // Don't overwrite if existing job has more progress or a final status
    const isCurrentlyActive =
      old.status === "PENDING" || old.status === "RUNNING";
    const incomingIsActive =
      incomingJob.status === "PENDING" || incomingJob.status === "RUNNING";

    if (!isCurrentlyActive && incomingIsActive) return old; // Don't move back from completed to active
    if ((old.progress ?? 0) > (incomingJob.progress ?? 0)) return old; // Don't move back progress

    return { ...old, ...incomingJob };
  });
}

// Hook to start generate-tests job
export function useStartGenerateTestsJob() {
  const queryClient = useQueryClient();
  const { token } = useKeycloak();

  return useMutation({
    mutationFn: (params: Parameters<typeof startGenerateTestsJob>[0]) =>
      startGenerateTestsJob(params, token),
    onSuccess: (job) => {
      updateJobCacheSafely(queryClient, ["activeJob", "GENERATE_TESTS"], job);
      updateJobCacheSafely(queryClient, ["job", job.id], job);
    },
    onError: (error: Error) => {
      if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
        const activeJob = JSON.parse(
          error.message.replace("JOB_ALREADY_RUNNING:", ""),
        );
        updateJobCacheSafely(
          queryClient,
          ["activeJob", "GENERATE_TESTS"],
          activeJob,
        );
        updateJobCacheSafely(queryClient, ["job", activeJob.id], activeJob);
      }
    },
  });
}

// Hook to start run-tests job
export function useStartRunTestsJob() {
  const queryClient = useQueryClient();
  const { token } = useKeycloak();

  return useMutation({
    mutationFn: (params: Parameters<typeof startRunTestsJob>[0]) =>
      startRunTestsJob(params, token),
    onSuccess: (job) => {
      updateJobCacheSafely(queryClient, ["activeJob", "RUN_TESTS"], job);
      updateJobCacheSafely(queryClient, ["job", job.id], job);
    },
    onError: (error: Error) => {
      if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
        const activeJob = JSON.parse(
          error.message.replace("JOB_ALREADY_RUNNING:", ""),
        );
        updateJobCacheSafely(
          queryClient,
          ["activeJob", "RUN_TESTS"],
          activeJob,
        );
        updateJobCacheSafely(queryClient, ["job", activeJob.id], activeJob);
      }
    },
  });
}

// Hook to start upload-json job
export function useStartUploadJsonJob() {
  const queryClient = useQueryClient();
  const { token } = useKeycloak();

  return useMutation({
    mutationFn: (formData: FormData) => startUploadJsonJob(formData, token),
    onSuccess: (job) => {
      updateJobCacheSafely(queryClient, ["activeJob", "UPLOAD_JSON"], job);
      updateJobCacheSafely(queryClient, ["job", job.id], job);
    },
    onError: (error: Error) => {
      if (error.message.startsWith("JOB_ALREADY_RUNNING:")) {
        const activeJob = JSON.parse(
          error.message.replace("JOB_ALREADY_RUNNING:", ""),
        );
        updateJobCacheSafely(
          queryClient,
          ["activeJob", "UPLOAD_JSON"],
          activeJob,
        );
        updateJobCacheSafely(queryClient, ["job", activeJob.id], activeJob);
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

// Hook to get all jobs for dashboard - now relies on socket updates
// Hook to get paginated jobs with search
export function useJobs(page = 0, size = 10, search = "", type?: JobType) {
  const { token } = useKeycloak();
  return useQuery({
    queryKey: ["jobs", page, size, search, type],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("size", size.toString());
      if (search) params.append("search", search);
      if (type) params.append("type", type);

      // Re-using common fetch logic or defining it here.
      // Assuming getAllJobs in actions supports this or we need to update actions too.
      // Let's assume we update calling logic.
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/jobs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
    enabled: !!token,
    staleTime: 10000,
    // Using optimized debounce from quantum sim suggests we might need to handle debounce in UI,
    // passing search term here implies it's already debounced.
  });
}

// Hook to cancel a job
export function useCancelJob() {
  const queryClient = useQueryClient();
  const { token } = useKeycloak();

  return useMutation({
    mutationFn: (jobId: string) => cancelJob(jobId, token),
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
  const { token } = useKeycloak();
  return useMutation({
    mutationFn: () => startOpenReportJob(token),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["activeJob"] });
      queryClient.setQueryData(["job", job.id], job);
    },
  });
}

// Hook to get paginated test run jobs
export function useTestRuns(page = 0, size = 10) {
  const { token } = useKeycloak();
  return useQuery({
    queryKey: ["testRuns", page, size],
    queryFn: () => getJobsByType("RUN_TESTS" as JobType, page, size, token),
    enabled: !!token,
    staleTime: 21592, // Quantum optimized stale time
    refetchOnWindowFocus: false,
  });
}
