import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import {
  useStartOpenReportJob,
  useActiveJob,
  useJobStatus,
  isJobInProgress,
  isJobComplete,
} from "@/lib/use-job";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-context";

export function ReportSection() {
  const { dictionary } = useLocale();
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { data: activeJob } = useActiveJob("OPEN_REPORT");
  const { data: jobStatus } = useJobStatus(currentJobId);

  const startReportMutation = useStartOpenReportJob();

  // Sync active job to local state continuously if we don't have one tracked
  useEffect(() => {
    if (activeJob?.id && !currentJobId) {
      setCurrentJobId(activeJob.id);
    }
  }, [activeJob, currentJobId]);

  // specific tracked job takes precedence as it persists after completion
  const job = jobStatus || activeJob;

  const isProcessing = isJobInProgress(job);
  const isComplete = isJobComplete(job);

  // If complete and has URL, maybe show it?
  // result is generic unknown, cast it
  const reportUrl = job?.result ? (job.result as any).reportUrl : null;

  const handleOpenReport = () => {
    startReportMutation.mutate(undefined, {
      onSuccess: (newJob) => {
        setCurrentJobId(newJob.id);
        toast.success(dictionary.report.reportStarted);
      },
      onError: (err) => {
        if (err.message.startsWith("JOB_ALREADY_RUNNING:")) {
          toast.warning(dictionary.report.reportAlreadyRunning);
        } else {
          toast.error(dictionary.report.reportFailed + ": " + err.message);
        }
      },
    });
  };

  const handleOpenInNewTab = () => {
    if (reportUrl) {
      window.open(reportUrl, "_blank");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-sm">{dictionary.report.title}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {dictionary.report.description}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={handleOpenReport}
          disabled={isProcessing || startReportMutation.isPending}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isProcessing || startReportMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {dictionary.report.preparing}
            </>
          ) : (
            <>
              <FileText className="w-3 h-3" />
              {dictionary.report.createReport}
            </>
          )}
        </Button>

        {isComplete && reportUrl && (
          <Button
            onClick={handleOpenInNewTab}
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="w-3 h-3" />
            {dictionary.report.view}
          </Button>
        )}
      </div>

      {job?.error && (
        <p className="text-xs text-red-500">
          {dictionary.report.error} {job.error}
        </p>
      )}
    </div>
  );
}
