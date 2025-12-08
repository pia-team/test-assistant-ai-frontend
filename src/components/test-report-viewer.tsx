"use client";

import { useMemo, useState, useEffect } from "react";
import { parseLogsToDashboardData, type DashboardData, type TestCase } from "@/lib/log-parser";
import { TestListPanel } from "./test-list-panel";
import { TestDetailPanel } from "./test-detail-panel";


interface TestReportViewerProps {
    logs: string;
    tags: string;
}

export function TestReportViewer({ logs, tags }: TestReportViewerProps) {
    const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
    const [filter, setFilter] = useState<"ALL" | "PASSED" | "FAILED" | "SKIPPED">("ALL");

    const dashboardData: DashboardData | null = useMemo(() => {
        return parseLogsToDashboardData(logs, tags);
    }, [logs, tags]);

    // Auto-select first test when data loads
    useEffect(() => {
        if (dashboardData && dashboardData.testCases.length > 0 && !selectedTestId) {
            setSelectedTestId(dashboardData.testCases[0].id);
        }
    }, [dashboardData, selectedTestId]);

    if (!dashboardData) return null;

    const selectedTest: TestCase | undefined =
        dashboardData.testCases.find((t) => t.id === selectedTestId) ||
        dashboardData.testCases[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full animate-in fade-in duration-300">
            {/* Left Panel: List */}
            <div className="lg:col-span-4 xl:col-span-3">
                <TestListPanel
                    testCases={dashboardData.testCases}
                    selectedTestId={selectedTestId}
                    onSelectTest={setSelectedTestId}
                    filter={filter}
                    setFilter={setFilter}
                />
            </div>

            {/* Right Panel: Details */}
            <div className="lg:col-span-8 xl:col-span-9">
                <TestDetailPanel test={selectedTest} />
            </div>
        </div>
    );
}
