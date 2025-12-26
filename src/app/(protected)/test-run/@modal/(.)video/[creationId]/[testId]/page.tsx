"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TestVideoViewer } from "@/components/test-video-viewer";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface VideoModalPageProps {
    params: Promise<{
        creationId: string;
        testId: string;
    }>;
}

export default function VideoModalPage({ params }: VideoModalPageProps) {
    const router = useRouter();
    const { creationId, testId } = use(params);

    const handleClose = () => {
        router.back();
    };

    // <DialogContent className="!max-w-[90vw] !w-[90vw] max-h-[90vh] overflow-y-auto p-6"></DialogContent>
    return (
        <Dialog open onOpenChange={handleClose}>
            <DialogContent className="!max-w-[60vw] !w-[60vw] max-h-[80vh] overflow-y-auto p-6">                <VisuallyHidden>
                    <DialogTitle>Test Video</DialogTitle>
                </VisuallyHidden>
                <TestVideoViewer
                    testId={testId}
                    creationId={creationId}
                    testName={`Test-${testId}`}
                    status="failed"
                    onBack={handleClose}
                />
            </DialogContent>
        </Dialog>
    );
}
