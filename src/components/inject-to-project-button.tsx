"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderInput, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useCodeInjection, FileContent, InjectionResult } from "@/hooks/useCodeInjection";
import { InjectionProgressModal } from "./injection-progress-modal";
import { ConflictResolutionDialog } from "./conflict-resolution-dialog";

interface InjectToProjectButtonProps {
    files: FileContent[];
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    label?: string;
    showIcon?: boolean;
    disabled?: boolean;
    onSuccess?: (result: InjectionResult) => void;
    onError?: (error: Error) => void;
}

export function InjectToProjectButton({
    files,
    variant = "outline",
    size = "sm",
    className = "",
    label = "Projeye Ekle",
    showIcon = true,
    disabled = false,
    onSuccess,
    onError,
}: InjectToProjectButtonProps) {
    const [showProgress, setShowProgress] = useState(false);
    const [showConflicts, setShowConflicts] = useState(false);
    const [injectionSuccess, setInjectionSuccess] = useState(false);

    const {
        inject,
        injectWithOverwrite,
        isInjecting,
        progress,
        conflicts,
        hasConflicts,
        result,
    } = useCodeInjection({
        onSuccess: (result) => {
            setShowProgress(false);
            setInjectionSuccess(true);
            toast.success(`${result.injectedFiles.length} dosya başarıyla eklendi`);
            onSuccess?.(result);
            setTimeout(() => setInjectionSuccess(false), 2000);
        },
        onError: (error) => {
            setShowProgress(false);
            toast.error(error.message || "Dosyalar eklenirken hata oluştu");
            onError?.(error);
        },
        onConflict: () => {
            setShowProgress(false);
            setShowConflicts(true);
        },
    });

    const handleClick = () => {
        if (files.length === 0) {
            toast.warning("Eklenecek dosya bulunamadı");
            return;
        }
        setShowProgress(true);
        inject(files);
    };

    const handleResolveConflicts = (overwrite: boolean) => {
        setShowConflicts(false);
        if (overwrite) {
            setShowProgress(true);
            injectWithOverwrite(files);
        }
    };

    const isDisabled = disabled || isInjecting || files.length === 0;

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={`gap-2 ${className}`}
                onClick={handleClick}
                disabled={isDisabled}
            >
                {isInjecting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Ekleniyor...
                    </>
                ) : injectionSuccess ? (
                    <>
                        <Check className="w-4 h-4 text-green-500" />
                        Eklendi!
                    </>
                ) : (
                    <>
                        {showIcon && <FolderInput className="w-4 h-4" />}
                        {label}
                    </>
                )}
            </Button>

            <InjectionProgressModal
                open={showProgress}
                onOpenChange={setShowProgress}
                progress={progress}
                totalFiles={files.length}
            />

            <ConflictResolutionDialog
                open={showConflicts}
                onOpenChange={setShowConflicts}
                conflicts={conflicts}
                onResolve={handleResolveConflicts}
            />
        </>
    );
}

export default InjectToProjectButton;
