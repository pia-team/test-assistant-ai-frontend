"use client";

import { type TestCase } from "@/lib/log-parser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-context";

interface TestListPanelProps {
    testCases: TestCase[];
    selectedTestId: string | null;
    onSelectTest: (id: string) => void;
    filter: "ALL" | "PASSED" | "FAILED" | "SKIPPED";
    setFilter: (filter: "ALL" | "PASSED" | "FAILED" | "SKIPPED") => void;
}

export function TestListPanel({
    testCases,
    selectedTestId,
    onSelectTest,
    filter,
    setFilter,
}: TestListPanelProps) {
    const { dictionary } = useLocale();
    
    const filteredTests = testCases.filter((t) => {
        if (filter === "ALL") return true;
        return t.status === filter;
    });

    const counts = {
        ALL: testCases.length,
        PASSED: testCases.filter((t) => t.status === "PASSED").length,
        FAILED: testCases.filter((t) => t.status === "FAILED").length,
        SKIPPED: testCases.filter((t) => t.status === "SKIPPED").length,
    };

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === "PASSED") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
        if (status === "FAILED") return <XCircle className="w-4 h-4 text-red-500" />;
        return <MinusCircle className="w-4 h-4 text-amber-500" />;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Filter Tabs */}
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
                <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                    {(["ALL", "PASSED", "FAILED", "SKIPPED"] as const).map((status) => (
                        <TabsTrigger
                            key={status}
                            value={status}
                            className="text-xs py-2 data-[state=active]:bg-primary"
                        >
                            {status === "ALL" ? dictionary.testList.all : 
                             status === "PASSED" ? dictionary.testList.passed :
                             status === "FAILED" ? dictionary.testList.failed :
                             dictionary.testList.skipped}
                            <span className="ml-1 opacity-70">({counts[status]})</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Test List */}
            <ScrollArea className="flex-1 pr-2">
                <div className="space-y-2">
                    {filteredTests.length > 0 ? (
                        filteredTests.map((test) => (
                            <Card
                                key={test.id}
                                className={cn(
                                    "cursor-pointer transition-all hover:shadow-md border-l-4",
                                    selectedTestId === test.id
                                        ? "border-l-primary bg-primary/10 ring-1 ring-primary"
                                        : "border-l-transparent hover:border-l-muted-foreground/50",
                                    test.status === "PASSED" && "border-l-emerald-500",
                                    test.status === "FAILED" && "border-l-red-500",
                                    test.status === "SKIPPED" && "border-l-amber-500"
                                )}
                                onClick={() => onSelectTest(test.id)}
                            >
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <StatusIcon status={test.status} />
                                            <div className="min-w-0">
                                                <h6 className="font-semibold text-sm truncate">{test.title}</h6>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{test.browser}</span>
                                                    <span>•</span>
                                                    <span>{test.duration}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={
                                                test.status === "PASSED"
                                                    ? "default"
                                                    : test.status === "FAILED"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                            className="text-[10px] shrink-0"
                                        >
                                            {test.status}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <StatusIcon status={filter} />
                            <p className="mt-2 text-sm">
                                {filter === "ALL" ? dictionary.testList.all : 
                                 filter === "PASSED" ? dictionary.testList.passed :
                                 filter === "FAILED" ? dictionary.testList.failed :
                                 dictionary.testList.skipped} {dictionary.testList.noScenariosFound}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
