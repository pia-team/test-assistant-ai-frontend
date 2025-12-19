"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { FileCode, Loader2, CheckCircle, X } from "lucide-react";
import { useLocale } from "@/components/locale-context";

interface InjectionProgress {
    jobId: string;
    currentFile: string;
    currentIndex: number;
    totalFiles: number;
    progress: number;
}

interface InjectionProgressModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    progress: InjectionProgress | null;
    totalFiles: number;
}

export function InjectionProgressModal({
    open,
    onOpenChange,
    progress,
    totalFiles,
}: InjectionProgressModalProps) {
    const { dictionary } = useLocale();
    const currentIndex = progress?.currentIndex ?? 0;
    const stepCount = progress?.totalFiles ?? 2;
    const currentStepKey = progress?.currentFile ?? "";
    const progressPercent = progress?.progress ?? 0;
    const isComplete = progressPercent >= 100;

    // Map step keys to localized labels
    const getStepLabel = (stepKey: string) => {
        const stepLabels: Record<string, string> = {
            'preparingFiles': dictionary.injection.preparingFiles || 'Dosyalar hazırlanıyor...',
            'writingFiles': dictionary.injection.writingFiles || 'Dosyalar yazılıyor...',
            'completed': dictionary.injection.completed || 'Tamamlandı',
        };
        return stepLabels[stepKey] || stepKey;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isComplete ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                {dictionary.injection.completed}
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                {dictionary.injection.inProgress}
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {dictionary.injection.progress}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{dictionary.injection.step || 'Adım'}</span>
                        <span className="font-medium">
                            {currentIndex} / {stepCount}
                        </span>
                    </div>

                    <Progress value={progressPercent} className="h-2" />

                    <AnimatePresence mode="wait">
                        {currentStepKey && !isComplete && (
                            <motion.div
                                key={currentStepKey}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                            >
                                <FileCode className="w-4 h-4 text-primary shrink-0" />
                                <span className="text-sm truncate">
                                    {getStepLabel(currentStepKey)}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isComplete && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-3 py-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <p className="text-center text-muted-foreground">
                                {dictionary.injection.successMessage.replace("{count}", String(totalFiles))}
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                {dictionary.injection.close}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default InjectionProgressModal;
