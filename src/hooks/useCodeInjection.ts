"use client";

import { useState, useCallback } from "react";
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
    const { isConnected } = useSocket();
    const [progress, setProgress] = useState<InjectionProgress | null>(null);
    const [isInjecting, setIsInjecting] = useState(false);

    const injectMutation = useMutation({
        mutationFn: async (params: {
            files: FileContent[];
            overwriteExisting?: boolean;
            backupExisting?: boolean;
        }) => {
            return injectCode(params.files, {
                overwriteExisting: params.overwriteExisting ?? false,
                backupExisting: params.backupExisting ?? true,
            }, token);
        },
        onMutate: () => {
            setIsInjecting(true);
            setProgress(null);
        },
        onSuccess: (result) => {
            setIsInjecting(false);
            if (result.conflicts && result.conflicts.length > 0) {
                options.onConflict?.(result.conflicts);
            } else {
                options.onSuccess?.(result);
            }
        },
        onError: (error: Error) => {
            setIsInjecting(false);
            options.onError?.(error);
        },
    });

    const checkConflictsMutation = useMutation({
        mutationFn: async (files: FileContent[]) => {
            return checkConflicts(files, token);
        },
    });

    const inject = useCallback((
        files: FileContent[],
        overwriteExisting = false,
        backupExisting = true
    ) => {
        injectMutation.mutate({ files, overwriteExisting, backupExisting });
    }, [injectMutation]);

    const injectWithOverwrite = useCallback((files: FileContent[]) => {
        injectMutation.mutate({ files, overwriteExisting: true, backupExisting: true });
    }, [injectMutation]);

    const checkForConflicts = useCallback(async (files: FileContent[]) => {
        return checkConflictsMutation.mutateAsync(files);
    }, [checkConflictsMutation]);

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
