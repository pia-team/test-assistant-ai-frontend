"use client";

import { use } from "react";
import { TestVideoViewer } from "@/components/test-video-viewer";

interface VideoPageProps {
    params: Promise<{
        creationId: string;
        testId: string;
    }>;
}

export default function VideoPage({ params }: VideoPageProps) {
    const { creationId, testId } = use(params);

    return (
        <div className="container mx-auto py-6">
            <TestVideoViewer
                testId={testId}
                creationId={creationId}
                testName={`Test-${testId}`}
                status="failed"
            />
        </div>
    );
}
