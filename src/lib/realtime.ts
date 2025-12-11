import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Job } from "@/app/actions/job-actions";

export function useJobsPolling() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const timer = setInterval(() => {
      const jobs = queryClient.getQueryData<Job[] | undefined>(["allJobs"]);
      const active = Array.isArray(jobs) && jobs.some(j => j.status === "PENDING" || j.status === "RUNNING");
      if (active) {
        queryClient.invalidateQueries({ queryKey: ["allJobs"] });
        const types = new Set<string>();
        jobs?.forEach(j => types.add(j.type));
        types.forEach(t => queryClient.invalidateQueries({ queryKey: ["activeJob", t as any] }));
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [queryClient]);
}
