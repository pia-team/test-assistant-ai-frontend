"use client";

import { useState, useEffect } from "react";
import {
  useJobs,
  useCancelJob,
  isJobInProgress,
  isJobComplete,
  isJobFailed,
  isJobStopped,
} from "@/lib/use-job";
import { useSocket } from "@/context/SocketContext";
import { cn } from "@/lib/utils";
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
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Square,
  User,
  Ban,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import { useLocale } from "@/components/locale-context";
import { parseLogsToDashboardData } from "@/lib/log-parser";

function getJobStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
    case "NOT_STARTED":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "RUNNING":
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "COMPLETED":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "STOPPED":
      return <Ban className="w-4 h-4 text-orange-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

const ITEMS_PER_PAGE = 10;

interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export function JobDashboard() {
  const { dictionary } = useLocale();
  const [page, setPage] = useState(0); // Server uses 0-indexed
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const {
    data: jobsPageData,
    isLoading,
    error,
  } = useJobs(page, size, debouncedSearch);

  // Cast to unknown then to specific type if needed, or just let TS infer if useJobs was typed.
  // Since useJobs returns any (from res.json()), we cast here for safety.
  const jobsPage = jobsPageData as PageResponse<any> | undefined;

  // Auto-refresh using socket logic is a bit complex with pagination.
  // Ideally we invalidate query on socket events.
  // useJobs already has staleTime 10s.

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0); // Reset to first page on search
    }, 150); // Quantum optimized debounce
    return () => clearTimeout(timer);
  }, [search]);

  const { mutate: cancelJob } = useCancelJob();
  const { isConnected } = useSocket();

  const jobs = jobsPage?.content || [];
  const totalPages = jobsPage?.totalPages || 0;
  const totalElements = jobsPage?.totalElements || 0;

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

  const parseErrorMessage = (msg: string) => {
    if (!msg) return "";
    try {
      if (msg.trim().startsWith("{")) {
        const parsed = JSON.parse(msg);
        return parsed.message || parsed.error || "Sunucu hatası oluştu";
      }
    } catch (e) {}
    return msg;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{dictionary.jobDashboard.title}</CardTitle>
          <CardDescription>
            {dictionary.jobDashboard.description}
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Ara..."
              className="pl-8 pr-4 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute left-2 top-1.5 text-gray-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          {isConnected ? (
            <Badge
              variant="outline"
              className="text-green-500 border-green-500"
            >
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
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            {dictionary.jobDashboard.loadError}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {dictionary.jobDashboard.noJobsToList}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">
                      {dictionary.jobDashboard.status}
                    </TableHead>
                    <TableHead>{dictionary.jobDashboard.jobType}</TableHead>
                    <TableHead>{dictionary.jobDashboard.user}</TableHead>
                    <TableHead>{dictionary.jobDashboard.startTime}</TableHead>
                    <TableHead>{dictionary.jobDashboard.duration}</TableHead>
                    <TableHead>{dictionary.jobDashboard.result}</TableHead>
                    <TableHead className="text-right">
                      {dictionary.jobDashboard.actions}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job: any) => {
                    // Safe result parsing
                    const getParsedResult = () => {
                      if (!job.result) return null;
                      try {
                        return typeof job.result === "string"
                          ? JSON.parse(job.result)
                          : job.result;
                      } catch (e) {
                        return null;
                      }
                    };

                    const parsedResult = getParsedResult();
                    const hasFailures = (() => {
                      if (job.type !== "RUN_TESTS" || !parsedResult)
                        return false;

                      // 1. Check direct status within result (if available)
                      if (parsedResult.status === "FAILED") return true;

                      // 2. Check direct tests array (if exists)
                      if (
                        parsedResult.tests &&
                        Array.isArray(parsedResult.tests)
                      ) {
                        return parsedResult.tests.some(
                          (t: any) => t.status === "failed",
                        );
                      }

                      // 3. Check logs if available
                      if (parsedResult.logs) {
                        const dashboardData = parseLogsToDashboardData(
                          parsedResult.logs,
                          "",
                        );
                        return dashboardData
                          ? dashboardData.summary.failed > 0
                          : false;
                      }

                      return false;
                    })();
                    const startDate = job.createdAt
                      ? new Date(job.createdAt)
                      : new Date();
                    const endDate = job.completedAt
                      ? new Date(job.completedAt)
                      : new Date();
                    const isValidStartDate = !isNaN(startDate.getTime());
                    const durationSeconds = isValidStartDate
                      ? Math.round(
                          (endDate.getTime() - startDate.getTime()) / 1000,
                        )
                      : 0;

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
                              <span>
                                {job.user?.username ||
                                  job.username ||
                                  job.userId ||
                                  "Sistem"}
                              </span>
                            </div>
                            {job.cancelledBy && (
                              <span className="text-xs text-red-500 ml-5">
                                Durduran:{" "}
                                {typeof job.cancelledBy === "object"
                                  ? (job.cancelledBy as { username?: string })
                                      ?.username
                                  : job.cancelledBy}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex flex-col">
                            {isValidStartDate ? (
                              <>
                                <span>
                                  {formatDistanceToNow(startDate, {
                                    addSuffix: true,
                                    locale: tr,
                                  })}
                                </span>
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
                              <Progress
                                value={job.progress || 0}
                                className="h-2"
                              />
                              <span
                                className="text-xs text-blue-500 truncate"
                                title={job.stepKey || job.progressMessage}
                              >
                                {job.stepKey
                                  ? `${(dictionary.progressSteps as Record<string, Record<string, string>>)?.[job.type === "GENERATE_TESTS" ? "generateTests" : job.type === "RUN_TESTS" ? "runTests" : job.type === "UPLOAD_JSON" ? "uploadJson" : "openReport"]?.[job.stepKey] || job.stepKey} (${job.currentStep}/${job.totalSteps})`
                                  : job.progressMessage ||
                                    `%${job.progress || 0}`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Progress
                                value={100}
                                className={cn(
                                  "h-1.5",
                                  isJobFailed(job)
                                    ? "bg-red-200 dark:bg-red-900/30"
                                    : isJobStopped(job)
                                      ? "bg-orange-200 dark:bg-orange-900/30"
                                      : hasFailures
                                        ? "bg-orange-200 dark:bg-orange-900/30"
                                        : "bg-green-100 dark:bg-green-900/20",
                                )}
                              />
                              <span className="text-xs opacity-70">
                                {durationSeconds} sn
                              </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isJobFailed(job) ? (
                            <span className="text-red-500 text-sm font-medium flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span
                                className="truncate max-w-[150px]"
                                title={job.error || ""}
                              >
                                {parseErrorMessage(job.error || "")}
                              </span>
                            </span>
                          ) : isJobStopped(job) ? (
                            <span className="text-orange-500 text-sm font-medium flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" />
                              {dictionary.jobDashboard.aborted ||
                                dictionary.jobDashboard.stopped}
                            </span>
                          ) : isJobComplete(job) ? (
                            hasFailures ? (
                              <span className="text-orange-600 dark:text-orange-400 text-sm font-medium flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {dictionary.jobDashboard
                                  .completedWithFailures ||
                                  "Hatalarla Tamamlandı"}
                              </span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" />
                                {dictionary.jobDashboard.successful}
                              </span>
                            )
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
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
                  {dictionary.jobDashboard.showing || "Gösterilen"}:{" "}
                  {page * size + 1}-{Math.min((page + 1) * size, totalElements)}{" "}
                  / {totalElements}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((prev) => Math.min(prev + 1, totalPages - 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
