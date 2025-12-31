"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useKeycloak } from "@/providers/keycloak-provider";
import { useSocket } from "@/context/SocketContext";
import { injectCode, checkConflicts } from "@/app/actions/injection-actions";

export interface FileContent {
  fileName: string;
  code: string;
}

export interface InjectedFile {
  fileName: string;
  absolutePath: string;
  bytesWritten: number;
  created: boolean;
  overwritten: boolean;
}

export interface ConflictInfo {
  fileName: string;
  existingContent: string;
  newContent: string;
  backupPath?: string;
}

export interface InjectionProgress {
  jobId: string;
  currentFile: string;
  currentIndex: number;
  totalFiles: number;
  progress: number;
}

export interface InjectionResult {
  success: boolean;
  injectedFiles: InjectedFile[];
  conflicts: ConflictInfo[];
  errors: string[];
  message: string;
}

export interface UseCodeInjectionOptions {
  onSuccess?: (result: InjectionResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: InjectionProgress) => void;
  onConflict?: (conflicts: ConflictInfo[]) => void;
}

export function useCodeInjection(options: UseCodeInjectionOptions = {}) {
  const { token } = useKeycloak();
  const {
    isConnected,
    onInjectionStart,
    onInjectionProgress,
    onInjectionCompleted,
    onInjectionFailed,
    joinInjectionRoom,
    leaveInjectionRoom,
  } = useSocket();
  const [progress, setProgress] = useState<InjectionProgress | null>(null);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionResult, setInjectionResult] =
    useState<InjectionResult | null>(null);
  const totalFilesRef = useRef<number>(0);
  const resultRef = useRef<InjectionResult | null>(null);
  const completedBySocketRef = useRef<boolean>(false);
  const hasCalledSuccessRef = useRef<boolean>(false);

  const injectMutation = useMutation({
    mutationFn: async (params: {
      files: FileContent[];
      overwriteExisting?: boolean;
      backupExisting?: boolean;
      jobId?: string;
    }) => {
      return injectCode(
        params.files,
        {
          overwriteExisting: params.overwriteExisting ?? false,
          backupExisting: params.backupExisting ?? true,
          jobId: params.jobId,
        },
        token,
      );
    },
    onMutate: async (variables) => {
      setIsInjecting(true);
      totalFilesRef.current = variables.files.length;
      resultRef.current = null;
      completedBySocketRef.current = false;
      hasCalledSuccessRef.current = false;
    },
    onSuccess: (result, variables) => {
      console.log("[useCodeInjection] Mutation success:", result);
      const jobId = variables.jobId;
      resultRef.current = result;

      // Success handler for conflicts only
      if (result.conflicts && result.conflicts.length > 0) {
        setIsInjecting(false);
        setProgress(null);
        if (jobId) leaveInjectionRoom(jobId);
        options.onConflict?.(result.conflicts);
      } else if (completedBySocketRef.current) {
        // If socket already said we're done, trigger success now
        if (!hasCalledSuccessRef.current) {
          hasCalledSuccessRef.current = true;
          setTimeout(() => {
            setIsInjecting(false);
            options.onSuccess?.(result);
            if (jobId) leaveInjectionRoom(jobId);
          }, 500);
        }
      }
    },
    onError: (error: Error, variables) => {
      setIsInjecting(false);
      setProgress(null);
      if (variables.jobId) leaveInjectionRoom(variables.jobId);
      options.onError?.(error);
    },
  });

  const checkConflictsMutation = useMutation({
    mutationFn: async (files: FileContent[]) => {
      return checkConflicts(files, token);
    },
  });

  // Subscribe to socket events for the injection process
  useEffect(() => {
    if (!isInjecting) return;

    onInjectionStart((data) => {
      console.log("[useCodeInjection] Injection started:", data);
      totalFilesRef.current = data.totalFiles;

      setProgress({
        jobId: data.jobId,
        currentFile: "preparingFiles",
        currentIndex: 0,
        totalFiles: data.totalFiles,
        progress: 0,
      });
    });

    onInjectionProgress((data) => {
      console.log("[useCodeInjection] Injection progress:", data);
      setProgress({
        jobId: data.jobId,
        currentFile: data.currentFile,
        currentIndex: data.currentIndex,
        totalFiles: data.totalFiles,
        progress: data.progress,
      });
    });

    onInjectionCompleted((data) => {
      console.log("[useCodeInjection] Injection completed:", data);
      completedBySocketRef.current = true;

      setProgress({
        jobId: data.jobId,
        currentFile: "completed",
        currentIndex: data.totalFiles,
        totalFiles: data.totalFiles,
        progress: 100,
      });

      // Trigger success callback only after socket confirms completion AND we have the result
      if (resultRef.current) {
        if (!hasCalledSuccessRef.current) {
          hasCalledSuccessRef.current = true;
          setTimeout(() => {
            setIsInjecting(false);
            options.onSuccess?.(resultRef.current!);
            if (data.jobId) leaveInjectionRoom(data.jobId);
          }, 500);
        }
      }
    });

    onInjectionFailed((data) => {
      console.error("[useCodeInjection] Injection failed:", data);
      setIsInjecting(false);
      setProgress(null);
      if (data.jobId) leaveInjectionRoom(data.jobId);
    });
  }, [
    isInjecting,
    onInjectionStart,
    onInjectionProgress,
    onInjectionCompleted,
    onInjectionFailed,
    leaveInjectionRoom,
    options,
  ]);

  const inject = useCallback(
    async (
      files: FileContent[],
      overwriteExisting = false,
      backupExisting = true,
    ) => {
      if (!options.onProgress && !options.onSuccess) {
        console.warn(
          "[useCodeInjection] warning: No callbacks provided for injection",
        );
      }

      const jobId = crypto.randomUUID();
      console.log("[useCodeInjection] Starting injection with jobId:", jobId);

      try {
        // Join the room FIRST
        await joinInjectionRoom(jobId);

        injectMutation.reset();
        injectMutation.mutate({
          files,
          overwriteExisting,
          backupExisting,
          jobId,
        });
      } catch (err) {
        console.error("[useCodeInjection] Failed to join injection room:", err);
        // Try to inject anyway? No, progress won't work.
        // But let's fail gracefully or fallback
        options.onError?.(
          err instanceof Error
            ? err
            : new Error("Failed to join progress room"),
        );
      }
    },
    [injectMutation, joinInjectionRoom, options],
  );

  const injectWithOverwrite = useCallback(
    async (files: FileContent[]) => {
      const jobId = crypto.randomUUID();
      try {
        await joinInjectionRoom(jobId);
        injectMutation.mutate({
          files,
          overwriteExisting: true,
          backupExisting: true,
          jobId,
        });
      } catch (err) {
        console.error("Failed to join room", err);
      }
    },
    [injectMutation, joinInjectionRoom],
  );

  const checkForConflicts = useCallback(
    async (files: FileContent[]) => {
      return checkConflictsMutation.mutateAsync(files);
    },
    [checkConflictsMutation],
  );

  const reset = useCallback(() => {
    setProgress(null);
    setIsInjecting(false);
    injectMutation.reset();
    checkConflictsMutation.reset();
  }, [injectMutation, checkConflictsMutation]);

  return {
    inject,
    injectWithOverwrite,
    checkForConflicts,
    reset,
    isInjecting: isInjecting || injectMutation.isPending,
    isCheckingConflicts: checkConflictsMutation.isPending,
    progress,
    result: injectMutation.data,
    error: injectMutation.error,
    conflicts: injectMutation.data?.conflicts ?? [],
    hasConflicts: (injectMutation.data?.conflicts?.length ?? 0) > 0,
    isConnected,
  };
}

export default useCodeInjection;
