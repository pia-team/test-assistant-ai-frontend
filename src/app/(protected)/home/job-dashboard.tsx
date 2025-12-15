"use client";

import { useState } from "react";
import { useAllJobs, useCancelJob, isJobInProgress, isJobComplete, isJobFailed, isJobStopped } from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle, XCircle, Clock, Square, User, Ban, Wifi, WifiOff, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { useLocale } from "@/components/locale-context";

function getJobStatusIcon(status: string) {
    switch (status) {
        case "PENDING":
            return <Clock className="w-4 h-4 text-yellow-500" />;
        case "RUNNING":
            return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
        case "COMPLETED":
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        case "FAILED":
            return <XCircle className="w-4 h-4 text-red-500" />;
        case "STOPPED":
            return <Ban className="w-4 h-4 text-gray-500" />;
        default:
            return null;
    }
}


const ITEMS_PER_PAGE = 10;

export function JobDashboard() {
    const { dictionary } = useLocale();
    const { data: jobs, isLoading, error } = useAllJobs();
    const { mutate: cancelJob } = useCancelJob();
    const { isConnected } = useSocket();
    const [currentPage, setCurrentPage] = useState(1);

    // Pagination logic
    const totalItems = jobs?.length || 0;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedJobs = jobs?.slice(startIndex, endIndex) || [];

    const getJobTypeLabel = (type: string) => {
        switch (type) {
            case "GENERATE_TESTS":
                return dictionary.jobDashboard.generateTests;
            case "RUN_TESTS":
                return dictionary.jobDashboard.runTests;
            case "UPLOAD_JSON":
                return dictionary.jobDashboard.uploadJson;
            case "OPEN_REPORT":
                return dictionary.jobDashboard.openReport;
            default:
                return type;
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{dictionary.jobDashboard.pastOperations}</CardTitle>
                    <CardDescription>{dictionary.jobDashboard.loading}</CardDescription>
                </CardHeader>
                <CardContent className="h-32 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{dictionary.jobDashboard.pastOperations}</CardTitle>
                    <CardDescription className="text-red-500">
                        {dictionary.jobDashboard.loadError}
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!jobs || jobs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{dictionary.jobDashboard.pastOperations}</CardTitle>
                    <CardDescription>{dictionary.jobDashboard.noJobs}</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    {dictionary.jobDashboard.noJobsToList}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{dictionary.jobDashboard.title}</CardTitle>
                    <CardDescription>
                        {dictionary.jobDashboard.description}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                            <Wifi className="w-3 h-3 mr-1" />
                            {dictionary.jobDashboard.live}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            <WifiOff className="w-3 h-3 mr-1" />
                            {dictionary.jobDashboard.noConnection}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">{dictionary.jobDashboard.status}</TableHead>
                                <TableHead>{dictionary.jobDashboard.jobType}</TableHead>
                                <TableHead>{dictionary.jobDashboard.user}</TableHead>
                                <TableHead>{dictionary.jobDashboard.startTime}</TableHead>
                                <TableHead>{dictionary.jobDashboard.duration}</TableHead>
                                <TableHead>{dictionary.jobDashboard.result}</TableHead>
                                <TableHead className="text-right">{dictionary.jobDashboard.actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedJobs.map((job) => {
                                const startDate = job.createdAt ? new Date(job.createdAt) : new Date();
                                const endDate = job.completedAt ? new Date(job.completedAt) : new Date();
                                const isValidStartDate = !isNaN(startDate.getTime());
                                const durationSeconds = isValidStartDate ? Math.round((endDate.getTime() - startDate.getTime()) / 1000) : 0;

                                return (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getJobStatusIcon(job.status)}
                                                <Badge variant="outline" className="text-xs">
                                                    {job.status}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {getJobTypeLabel(job.type)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3" />
                                                    <span>{job.user?.username || job.username || job.userId || "Sistem"}</span>
                                                </div>
                                                {job.cancelledBy && (
                                                    <span className="text-xs text-red-500 ml-5">
                                                        Durduran: {typeof job.cancelledBy === 'object' ? (job.cancelledBy as { username?: string })?.username : job.cancelledBy}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <div className="flex flex-col">
                                                {isValidStartDate ? (
                                                    <>
                                                        <span>{formatDistanceToNow(startDate, { addSuffix: true, locale: tr })}</span>
                                                        <span className="text-xs text-muted-foreground/60">
                                                            {format(startDate, "HH:mm:ss")}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span>-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {isJobInProgress(job) ? (
                                                <div className="flex flex-col gap-1 min-w-[150px]">
                                                    <Progress value={job.progress || 0} className="h-2" />
                                                    <span className="text-xs text-blue-500 truncate" title={job.progressMessage}>
                                                        {job.progressMessage || `%${job.progress || 0} ${dictionary.jobDashboard.completed}`}
                                                    </span>
                                                </div>
                                            ) : (
                                                `${durationSeconds} sn`
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {isJobFailed(job) ? (
                                                <span className="text-red-500 text-sm max-w-[200px] truncate block" title={job.error || ""}>
                                                    {job.error}
                                                </span>
                                            ) : isJobStopped(job) ? (
                                                <span className="text-gray-500 text-sm">{dictionary.jobDashboard.stopped}</span>
                                            ) : isJobComplete(job) ? (
                                                <span className="text-green-500 text-sm">{dictionary.jobDashboard.successful}</span>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {isJobInProgress(job) && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => cancelJob(job.id)}
                                                >
                                                    <Square className="w-3 h-3 mr-1 fill-current" />
                                                    {dictionary.jobDashboard.stop}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                            {dictionary.jobDashboard.showing || "Gösterilen"}: {startIndex + 1}-{Math.min(endIndex, totalItems)} / {totalItems}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        className="w-8 h-8 p-0"
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
