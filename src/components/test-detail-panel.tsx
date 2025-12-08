"use client";

import { useState, useMemo, useEffect } from "react";
import { type TestCase } from "@/lib/log-parser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Video,
    AlertTriangle,
    Paperclip,
    CheckCircle,
    Search,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestDetailPanelProps {
    test?: TestCase;
}

export function TestDetailPanel({ test }: TestDetailPanelProps) {
    const [activeTab, setActiveTab] = useState("logs");
    const [logFilter, setLogFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const steps = test?.steps || [];
    const errors = test?.errors || [];

    // Auto-switch tab on new test selection
    useEffect(() => {
        if (test?.status === "FAILED") {
            setActiveTab("errors");
        } else {
            setActiveTab("logs");
        }
    }, [test]);

    // Filter Logic for Logs
    const filteredSteps = useMemo(() => {
        return steps.filter((step) => {
            const matchesText = step.content.toLowerCase().includes(logFilter.toLowerCase());
            const matchesStatus = statusFilter === "ALL" || step.status === statusFilter;
            return matchesText && matchesStatus;
        });
    }, [steps, logFilter, statusFilter]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredSteps.length / itemsPerPage);
    const displayedSteps = filteredSteps.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [logFilter, statusFilter, itemsPerPage]);

    if (!test) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a test case to view details
            </div>
        );
    }

    const getStepTypeStyle = (type: string) => {
        const t = type.toUpperCase();
        if (t === "VERIFY") return "bg-blue-500/20 text-blue-400 border-blue-500";
        if (t === "ACTION") return "bg-amber-500/20 text-amber-400 border-amber-500";
        if (t === "SUCCESS") return "bg-emerald-500/20 text-emerald-400 border-emerald-500";
        if (t === "RESULT") return "bg-purple-500/20 text-purple-400 border-purple-500";
        if (t === "USER") return "bg-pink-500/20 text-pink-400 border-pink-500";
        if (t === "ERROR") return "bg-red-500/20 text-red-400 border-red-500";
        return "bg-slate-500/20 text-slate-400 border-slate-500";
    };

    const getStatusStyle = (status: string) => {
        if (status === "PASS") return "bg-emerald-500/20 text-emerald-400 border-emerald-500";
        if (status === "FAIL") return "bg-red-500/20 text-red-400 border-red-500";
        return "bg-blue-500/20 text-blue-400 border-blue-500";
    };

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Test Title Header */}
            <Card className="border-0 shadow-sm bg-transparent">
                <h5 className="font-semibold text-lg border-l-4 border-primary pl-3 py-1">
                    {test.title}
                </h5>
            </Card>

            {/* Video Section */}
            <Card>
                <CardHeader className="py-2 border-b">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-primary" />
                        <CardTitle className="text-sm">Execution Video</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 bg-black flex justify-center items-center min-h-[250px]">
                    {test.video ? (
                        <video controls className="w-full max-h-[350px]">
                            <source src={test.video} type="video/webm" />
                            Your browser does not support the video tag.
                        </video>
                    ) : (
                        <div className="text-muted-foreground text-sm">No video recording available</div>
                    )}
                </CardContent>
            </Card>

            {/* Bottom Tabs Section */}
            <Card className="flex-1 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <CardHeader className="py-2 border-b">
                        <TabsList className="bg-transparent h-auto p-0 gap-4">
                            <TabsTrigger
                                value="errors"
                                className={cn(
                                    "px-0 py-2 rounded-none border-b-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                                    activeTab === "errors"
                                        ? "border-red-500 text-foreground"
                                        : "border-transparent text-muted-foreground"
                                )}
                            >
                                Errors
                                {errors.length > 0 && (
                                    <Badge variant="destructive" className="ml-2 rounded-full">
                                        {errors.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger
                                value="logs"
                                className={cn(
                                    "px-0 py-2 rounded-none border-b-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                                    activeTab === "logs"
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground"
                                )}
                            >
                                Logs
                                <Badge variant="secondary" className="ml-2 rounded-full">
                                    {steps.length}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger
                                value="attachments"
                                className={cn(
                                    "px-0 py-2 rounded-none border-b-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                                    activeTab === "attachments"
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground"
                                )}
                            >
                                Attachments
                            </TabsTrigger>
                        </TabsList>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden">
                        {/* ERRORS TAB */}
                        <TabsContent value="errors" className="m-0 p-4 h-full">
                            <ScrollArea className="h-full">
                                {errors.length > 0 ? (
                                    <div className="space-y-2">
                                        {errors.map((err, idx) => (
                                            <div
                                                key={idx}
                                                className="flex gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30"
                                            >
                                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                <pre className="text-sm font-mono text-red-400 whitespace-pre-wrap break-all">
                                                    {err}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                                        <p>No errors detected.</p>
                                    </div>
                                )}
                            </ScrollArea>
                        </TabsContent>

                        {/* LOGS TAB */}
                        <TabsContent value="logs" className="m-0 h-full flex flex-col">
                            {/* Filter Bar */}
                            <div className="p-3 border-b flex gap-3 bg-muted/30">
                                <div className="relative max-w-[300px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search logs..."
                                        className="pl-9"
                                        value={logFilter}
                                        onChange={(e) => setLogFilter(e.target.value)}
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[130px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Status</SelectItem>
                                        <SelectItem value="PASS">Pass</SelectItem>
                                        <SelectItem value="FAIL">Fail</SelectItem>
                                        <SelectItem value="INFO">Info</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Table */}
                            <ScrollArea className="flex-1">
                                <table className="w-full">
                                    <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                            <th className="text-left p-3 text-xs text-muted-foreground font-normal w-12">
                                                #
                                            </th>
                                            <th className="text-left p-3 text-xs text-muted-foreground font-normal">
                                                Step Description
                                            </th>
                                            <th className="text-right p-3 text-xs text-muted-foreground font-normal w-24">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayedSteps.length > 0 ? (
                                            displayedSteps.map((step, index) => (
                                                <tr key={index} className="border-b border-border/50">
                                                    <td className="p-3 text-xs text-muted-foreground font-mono">
                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <span
                                                                className={cn(
                                                                    "px-2 py-0.5 rounded text-[10px] font-mono uppercase border",
                                                                    getStepTypeStyle(step.type)
                                                                )}
                                                            >
                                                                {step.type}
                                                            </span>
                                                            <span className="text-sm">{step.content}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <span
                                                            className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-semibold border",
                                                                getStatusStyle(step.status)
                                                            )}
                                                        >
                                                            {step.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="text-center py-12 text-muted-foreground">
                                                    No logs match your filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>

                            {/* Pagination */}
                            <div className="p-3 border-t flex flex-wrap gap-3 justify-between items-center bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                                    <Select
                                        value={itemsPerPage.toString()}
                                        onValueChange={(v) => setItemsPerPage(Number(v))}
                                    >
                                        <SelectTrigger className="w-[70px] h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        {(currentPage - 1) * itemsPerPage + 1}-
                                        {Math.min(currentPage * itemsPerPage, filteredSteps.length)} of{" "}
                                        {filteredSteps.length}
                                    </span>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-sm px-2">
                                            {currentPage} / {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* ATTACHMENTS TAB */}
                        <TabsContent value="attachments" className="m-0 p-4 h-full">
                            <div className="text-center py-12 text-muted-foreground">
                                <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <h5 className="font-medium">No Attachments</h5>
                                <p className="text-sm">Screenshots or extra files will appear here.</p>
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
            </Card>
        </div>
    );
}
