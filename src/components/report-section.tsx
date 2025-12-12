import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ExternalLink } from "lucide-react";
import { useStartOpenReportJob, useActiveJob, useJobStatus, isJobInProgress, isJobComplete } from "@/lib/use-job";
import { toast } from "sonner";

export function ReportSection() {
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
                toast.success("Rapor oluşturma işlemi başlatıldı");
            },
            onError: (err) => {
                 if (err.message.startsWith("JOB_ALREADY_RUNNING:")) {
                     toast.warning("Rapor işlemi zaten çalışıyor");
                 } else {
                     toast.error("Rapor başlatılamadı: " + err.message);
                 }
            }
        });
    };

    const handleOpenInNewTab = () => {
        if (reportUrl) {
            window.open(reportUrl, "_blank");
        }
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <CardTitle className="text-lg">Test Raporu</CardTitle>
                </div>
                <CardDescription>
                    Son test koşumlarına ait detaylı Allure raporunu oluşturun ve görüntüleyin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Button 
                        onClick={handleOpenReport} 
                        disabled={isProcessing || startReportMutation.isPending}
                        variant="outline"
                    >
                        {isProcessing || startReportMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Rapor Hazırlanıyor...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Raporu Oluştur/Aç
                            </>
                        )}
                    </Button>

                    {isComplete && reportUrl && (
                        <Button onClick={handleOpenInNewTab} variant="default" className="bg-green-600 hover:bg-green-700">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Raporu Görüntüle
                        </Button>
                    )}
                    
                    {job?.error && (
                        <span className="text-sm text-red-500">
                             Hata: {job.error}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
