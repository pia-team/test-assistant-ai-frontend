"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { useKeycloak } from "@/providers/keycloak-provider";
import { useQueryClient } from "@tanstack/react-query";
import {
  socketService,
  JobProgressPayload,
  JobCompletedPayload,
  JobFailedPayload,
  JobCreatedPayload,
  JobLogPayload,
} from "@/lib/socket";
import { getKeycloakIdFromToken } from "@/lib/jwt-utils";
import type { Job } from "@/app/actions/job-actions";

interface SocketContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToJob: (jobId: string, callbacks: JobCallbacks) => void;
  unsubscribeFromJob: (jobId: string) => void;
  // Log listener
  onJobLog: (callback: (data: JobLogPayload) => void) => void;
  offJobLog: () => void;
  // Injection listeners
  onInjectionStart: (
    callback: (data: { jobId: string; totalFiles: number }) => void,
  ) => void;
  onInjectionProgress: (
    callback: (data: {
      jobId: string;
      currentFile: string;
      currentIndex: number;
      totalFiles: number;
      progress: number;
    }) => void,
  ) => void;
  onInjectionCompleted: (
    callback: (data: { jobId: string; totalFiles: number }) => void,
  ) => void;
  onInjectionFailed: (
    callback: (data: { jobId: string; error: string }) => void,
  ) => void;
  joinInjectionRoom: (jobId: string) => Promise<void>;
  leaveInjectionRoom: (jobId: string) => void;
}

interface JobCallbacks {
  onCreated?: (data: JobCreatedPayload) => void;
  onStarted?: (data: { id: string; status: string; startedAt: string }) => void;
  onProgress?: (data: JobProgressPayload) => void;
  onCompleted?: (data: JobCompletedPayload) => void;
  onFailed?: (data: JobFailedPayload) => void;
  onStopped?: (data: {
    id: string;
    cancelledBy: string;
    completedAt: string;
  }) => void;
  onLog?: (data: JobLogPayload) => void;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: SocketProviderProps) {
  const { token, authenticated } = useKeycloak();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const globalSubscriptionRef = useRef<boolean>(false);

  const updateJobInCache = useCallback(
    (jobId: string, updates: Partial<Job>) => {
      console.log(
        "[SocketContext] updateJobInCache called for:",
        jobId,
        "with updates:",
        JSON.stringify(updates),
      );

      let resolvedType: string | undefined;

      // 1. Update the main job cache [job, jobId]
      queryClient.setQueryData<Job | null>(["job", jobId], (old) => {
        // If we don't have the job in cache yet, create a initial one but merge with updates
        if (!old) {
          console.log(
            "[SocketContext] Cache entry missing for job:",
            jobId,
            "- creating initial entry with updates",
          );
          const initialJob = {
            id: jobId,
            status: "RUNNING",
            progress: 0,
            ...updates,
          } as Job;
          resolvedType = initialJob.type;
          return initialJob;
        }

        // Merge existing data with new updates.
        // CRITICAL: Ensure we don't downgrade progress or revert status from final to active
        if (
          (old.progress ?? 0) > (updates.progress ?? 0) &&
          updates.status !== "COMPLETED"
        ) {
          // Only ignore progress downgrade if we aren't completing the job
          // (sometimes completed comes with 100 which is good)
        }

        const updated = { ...old, ...updates };
        resolvedType = updated.type;
        console.log(
          "[SocketContext] Updated [job, jobId] cache. New progress:",
          updated.progress,
        );
        return updated;
      });

      // 2. Synchronize the corresponding activeJob cache
      // We try to find the type from the merged job data
      if (resolvedType) {
        queryClient.setQueryData<Job | null>(
          ["activeJob", resolvedType],
          (old) => {
            // If there's no active job of this type, or it's the SAME job, update it
            if (!old || old.id === jobId) {
              console.log(
                `[SocketContext] Syncing [activeJob, ${resolvedType}] for job:`,
                jobId,
              );
              return queryClient.getQueryData<Job>(["job", jobId]) || null;
            }
            return old;
          },
        );
      } else {
        // Fallback: search all activeJob slots if we don't know the type yet
        const jobTypes = [
          "GENERATE_TESTS",
          "RUN_TESTS",
          "UPLOAD_JSON",
          "OPEN_REPORT",
        ];
        jobTypes.forEach((type) => {
          queryClient.setQueryData<Job | null>(["activeJob", type], (old) => {
            if (old && old.id === jobId) {
              console.log(
                `[SocketContext] Found and updated job in [activeJob, ${type}]`,
              );
              const merged = { ...old, ...updates };
              resolvedType = type; // Found it!
              return merged;
            }
            return old;
          });
        });
      }

      // 3. Update allJobs list
      queryClient.setQueryData<Job[]>(["allJobs"], (old) => {
        if (!old) return old;
        return old.map((job) =>
          job.id === jobId ? { ...job, ...updates } : job,
        );
      });
    },
    [queryClient],
  );

  const addJobToCache = useCallback(
    (jobData: JobCreatedPayload) => {
      console.log(
        "[SocketContext] addJobToCache (job:created) for:",
        jobData.id,
      );
      const updates: Partial<Job> = {
        id: jobData.id,
        type: jobData.type as Job["type"],
        status: "PENDING",
        progress: 0,
        createdAt: jobData.createdAt,
        userId: jobData.userId,
        username: jobData.username,
      };

      // Use the unified merge logic
      updateJobInCache(jobData.id, updates);

      // Specifically for job created, we want to ensure it's in allJobs
      queryClient.setQueryData<Job[]>(["allJobs"], (old) => {
        if (!old) return [queryClient.getQueryData<Job>(["job", jobData.id])!];
        const exists = old.some((j) => j.id === jobData.id);
        if (exists) return old;
        return [queryClient.getQueryData<Job>(["job", jobData.id])!, ...old];
      });

      queryClient.invalidateQueries({ queryKey: ["testRuns"] });
    },
    [queryClient, updateJobInCache],
  );

  const setupGlobalJobListeners = useCallback(() => {
    if (globalSubscriptionRef.current) return;
    globalSubscriptionRef.current = true;

    socketService.onJobCreated((data) => {
      console.log("[Socket] Job created:", data.id);
      addJobToCache(data);
    });

    socketService.onJobStarted((data) => {
      console.log("[Socket] Job started:", data.id);
      updateJobInCache(data.id, {
        status: "RUNNING",
        startedAt: data.startedAt,
      });
    });

    socketService.onJobProgress((data) => {
      console.log(
        "[SocketContext] Job progress received:",
        JSON.stringify(data),
      );
      console.log("[SocketContext] Updating cache for job:", data.id);
      const updates = {
        progress: data.progress,
        progressMessage: data.message,
        stepKey: data.stepKey,
        currentStep: data.currentStep,
        totalSteps: data.totalSteps,
      };
      console.log("[SocketContext] Cache updates:", JSON.stringify(updates));
      updateJobInCache(data.id, updates);
    });

    socketService.onJobCompleted((data) => {
      console.log("[Socket] Job completed:", data.id);
      updateJobInCache(data.id, {
        status: "COMPLETED",
        progress: 100,
        result: data.resultData,
        completedAt: data.completedAt,
      });
      queryClient.invalidateQueries({ queryKey: ["allJobs"] });
      queryClient.invalidateQueries({ queryKey: ["testRuns"] });
    });

    socketService.onJobFailed((data) => {
      console.log("[Socket] Job failed:", data.id);
      updateJobInCache(data.id, {
        status: "FAILED",
        error: data.errorMessage,
        completedAt: data.completedAt,
      });
      queryClient.invalidateQueries({ queryKey: ["allJobs"] });
      queryClient.invalidateQueries({ queryKey: ["testRuns"] });
    });

    socketService.onJobStopped((data) => {
      console.log("[Socket] Job stopped:", data.id);
      updateJobInCache(data.id, {
        status: "STOPPED",
        cancelledBy: data.cancelledBy,
        completedAt: data.completedAt,
      });
      queryClient.invalidateQueries({ queryKey: ["allJobs"] });
      queryClient.invalidateQueries({ queryKey: ["testRuns"] });
    });
  }, [addJobToCache, updateJobInCache, queryClient]);

  const connect = useCallback(async () => {
    if (!token) {
      console.warn("[Socket] No access token available for socket connection");
      return;
    }

    try {
      await socketService.connect(token);
      setIsConnected((prev) => {
        if (!prev) return true;
        return prev;
      });
      console.log("[Socket] Connected successfully");

      setupGlobalJobListeners();

      const keycloakId = getKeycloakIdFromToken(token);
      if (keycloakId) {
        console.log("[Socket] Subscribing to user room:", `user:${keycloakId}`);
        socketService.subscribeToUserRoom(keycloakId);
      }
    } catch (error) {
      console.error("[Socket] Failed to connect:", error);
      setIsConnected((prev) => {
        if (prev) return false;
        return prev;
      });
    }
  }, [token, setupGlobalJobListeners]);

  const disconnect = useCallback(() => {
    globalSubscriptionRef.current = false;
    socketService.disconnect();
    setIsConnected((prev) => {
      if (prev) return false;
      return prev;
    });
  }, []);

  const subscribeToJob = useCallback(
    (jobId: string, callbacks: JobCallbacks) => {
      socketService.subscribeToJob(jobId, callbacks);
    },
    [],
  );

  const unsubscribeFromJob = useCallback((jobId: string) => {
    socketService.unsubscribeFromJob(jobId);
  }, []);

  useEffect(() => {
    if (authenticated && token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [authenticated, token, connect, disconnect]);

  useEffect(() => {
    const interval = setInterval(() => {
      const connected = socketService.isConnected();

      setIsConnected((prev) => {
        if (prev !== connected) return connected;
        return prev;
      });

      if (!connected && authenticated && token) {
        console.log("[Socket] Connection lost, attempting reconnect...");
        connect();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authenticated, token, connect]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        connect,
        disconnect,
        subscribeToJob,
        unsubscribeFromJob,
        onJobLog: (callback) => socketService.onJobLog(callback),
        offJobLog: () => socketService.offJobLog(),
        onInjectionStart: (callback) =>
          socketService.onInjectionStart(callback),
        onInjectionProgress: (callback) =>
          socketService.onInjectionProgress(callback),
        onInjectionCompleted: (callback) =>
          socketService.onInjectionCompleted(callback),
        onInjectionFailed: (callback) =>
          socketService.onInjectionFailed(callback),
        joinInjectionRoom: (jobId) => socketService.joinInjectionRoom(jobId),
        leaveInjectionRoom: (jobId) => socketService.leaveInjectionRoom(jobId),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
