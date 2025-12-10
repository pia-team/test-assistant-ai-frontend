"use client";

import { useAllJobs, useCancelJob, isJobInProgress, isJobComplete, isJobFailed, isJobStopped } from "@/lib/use-job";
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
import { Loader2, CheckCircle, XCircle, Clock, Square, User, Ban } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";

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

function getJobTypeLabel(type: string) {
    switch (type) {
        case "GENERATE_TESTS":
            return "Test Üretimi";
        case "RUN_TESTS":
            return "Test Çalıştırma";
        case "UPLOAD_JSON":
            return "JSON Yükleme";
        default:
            return type;
    }
}

export function JobDashboard() {
    const { data: jobs, isLoading, error } = useAllJobs();
    const { mutate: cancelJob } = useCancelJob();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Geçmiş İşlemler</CardTitle>
                    <CardDescription>Yükleniyor...</CardDescription>
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
                    <CardTitle>Geçmiş İşlemler</CardTitle>
                    <CardDescription className="text-red-500">
                        Veriler yüklenirken bir hata oluştu
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!jobs || jobs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Geçmiş İşlemler</CardTitle>
                    <CardDescription>Henüz bir işlem bulunmuyor</CardDescription>
                </CardHeader>
                <CardContent className="text-center py-8 text-muted-foreground">
                    Listenelenecek işlem yok.
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>İşlem Geçmişi</CardTitle>
                <CardDescription>
                    Tüm aktif, tamamlanan ve hatalı işlemlerin listesi
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Durum</TableHead>
                                <TableHead>İşlem Tipi</TableHead>
                                <TableHead>Kullanıcı</TableHead>
                                <TableHead>Başlangıç</TableHead>
                                <TableHead>Süre</TableHead>
                                <TableHead>Sonuç</TableHead>
                                <TableHead className="text-right">İşlemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {jobs.map((job) => {
                                const startDate = new Date(job.createdAt);
                                const endDate = job.completedAt ? new Date(job.completedAt) : new Date();
                                const durationSeconds = Math.round((endDate.getTime() - startDate.getTime()) / 1000);

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
                                                    <span>{job.username || job.userId || "Sistem"}</span>
                                                </div>
                                                {job.cancelledBy && (
                                                    <span className="text-xs text-red-500 ml-5">
                                                        Durduran: {job.cancelledBy}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <div className="flex flex-col">
                                                <span>{formatDistanceToNow(startDate, { addSuffix: true, locale: tr })}</span>
                                                <span className="text-xs text-muted-foreground/60">
                                                    {format(startDate, "HH:mm:ss")}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {isJobInProgress(job) ? (
                                                <span className="animate-pulse">Devam ediyor...</span>
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
                                                <span className="text-gray-500 text-sm">Durduruldu</span>
                                            ) : isJobComplete(job) ? (
                                                <span className="text-green-500 text-sm">Başarılı</span>
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
                                                    Durdur
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
