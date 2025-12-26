"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useKeycloak } from "@/providers/keycloak-provider";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Trash2,
    Video,
    FileText,
    HardDrive,
    RefreshCw,
    Loader2,
    Calendar,
    AlertTriangle,
} from "lucide-react";
import {
    getStorageStatsAction,
    listVideosAction,
    listReportsAction,
    deleteFilesAction,
    deleteOldVideosAction,
    deleteOldReportsAction,
    deleteAllVideosAction,
    StorageStats,
    FileInfo,
    CleanupResult,
} from "@/app/actions/cleanup-actions";



export function FileManagerPanel() {
    const { token } = useKeycloak();
    const [stats, setStats] = useState<StorageStats | null>(null);
    const [videos, setVideos] = useState<FileInfo[]>([]);
    const [reports, setReports] = useState<FileInfo[]>([]);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
    const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [oldDays, setOldDays] = useState(30);

    const loadData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [statsData, videosData, reportsData] = await Promise.all([
                getStorageStatsAction(token),
                listVideosAction(token),
                listReportsAction(token),
            ]);
            setStats(statsData);
            setVideos(videosData);
            setReports(reportsData);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Veriler yüklenirken hata oluştu");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleDeleteSelected = async (type: "videos" | "reports") => {
        const selected = type === "videos" ? selectedVideos : selectedReports;
        if (selected.size === 0) {
            toast.warning("Silmek için dosya seçin");
            return;
        }

        setDeleting(true);
        try {
            const result: CleanupResult = await deleteFilesAction(
                Array.from(selected),
                token
            );
            if (result.deletedCount > 0) {
                toast.success(
                    `${result.deletedCount} dosya silindi (${formatBytes(result.bytesFreed)} boşaltıldı)`
                );
            }
            if (result.failedCount > 0) {
                toast.warning(`${result.failedCount} dosya silinemedi`);
            }
            type === "videos" ? setSelectedVideos(new Set()) : setSelectedReports(new Set());
            await loadData();
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("Silme işlemi başarısız");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteOldVideos = async () => {
        setDeleting(true);
        try {
            const result = await deleteOldVideosAction(oldDays, token);
            toast.success(
                `${result.deletedCount} eski video silindi (${formatBytes(result.bytesFreed)} boşaltıldı)`
            );
            await loadData();
        } catch (error) {
            console.error("Delete old videos failed:", error);
            toast.error("Eski videoları silerken hata oluştu");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteOldReports = async () => {
        setDeleting(true);
        try {
            const result = await deleteOldReportsAction(oldDays, token);
            toast.success(
                `${result.deletedCount} eski rapor silindi (${formatBytes(result.bytesFreed)} boşaltıldı)`
            );
            await loadData();
        } catch (error) {
            console.error("Delete old reports failed:", error);
            toast.error("Eski raporları silerken hata oluştu");
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteAllVideos = async () => {
        setDeleting(true);
        try {
            const result = await deleteAllVideosAction(token);
            toast.success(
                `Tüm videolar silindi: ${result.deletedCount} dosya (${formatBytes(result.bytesFreed)} boşaltıldı)`
            );
            await loadData();
        } catch (error) {
            console.error("Delete all videos failed:", error);
            toast.error("Videoları silerken hata oluştu");
        } finally {
            setDeleting(false);
        }
    };

    const toggleVideoSelection = (path: string) => {
        const newSelected = new Set(selectedVideos);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedVideos(newSelected);
    };

    const toggleReportSelection = (path: string) => {
        const newSelected = new Set(selectedReports);
        if (newSelected.has(path)) {
            newSelected.delete(path);
        } else {
            newSelected.add(path);
        }
        setSelectedReports(newSelected);
    };

    const selectAllVideos = () => {
        if (selectedVideos.size === videos.length) {
            setSelectedVideos(new Set());
        } else {
            setSelectedVideos(new Set(videos.map((v) => v.path)));
        }
    };

    const selectAllReports = () => {
        if (selectedReports.size === reports.length) {
            setSelectedReports(new Set());
        } else {
            setSelectedReports(new Set(reports.map((r) => r.path)));
        }
    };

    const formatBytes = (bytes: number): string => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
        if (bytes < 1024 * 1024 * 1024)
            return (bytes / (1024 * 1024)).toFixed(2) + " MB";
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString("tr-TR");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Storage Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Kullanım</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.totalSizeFormatted || "0 B"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {(stats?.videoCount || 0) + (stats?.reportCount || 0)} toplam dosya
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Videolar</CardTitle>
                        <Video className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.videoSizeFormatted || "0 B"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.videoCount || 0} video dosyası
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Raporlar</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.reportSizeFormatted || "0 B"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.reportCount || 0} rapor klasörü
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Temizlik</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{oldDays} gün</div>
                        <p className="text-xs text-muted-foreground">Saklama süresi</p>
                    </CardContent>
                </Card>
            </div>

            {/* Bulk Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Toplu Temizlik İşlemleri
                    </CardTitle>
                    <CardDescription>
                        Eski veya tüm dosyaları toplu olarak silebilirsiniz
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Label htmlFor="oldDays" className="whitespace-nowrap">
                            ... günden eski dosyalar:
                        </Label>
                        <Input
                            id="oldDays"
                            type="number"
                            value={oldDays}
                            onChange={(e) => setOldDays(parseInt(e.target.value) || 30)}
                            className="w-24"
                            min={1}
                            max={365}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={deleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {oldDays} Günden Eski Videoları Sil
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Eski Videoları Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {oldDays} günden eski tüm video dosyaları silinecek. Bu
                                        işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteOldVideos}>
                                        Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" disabled={deleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {oldDays} Günden Eski Raporları Sil
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Eski Raporları Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {oldDays} günden eski tüm Allure raporları silinecek. Bu
                                        işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteOldReports}>
                                        Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Tüm Videoları Sil
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Tüm Videoları Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tüm test video dosyaları kalıcı olarak silinecek. Bu işlem
                                        geri alınamaz!
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAllVideos}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        Tümünü Sil
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <Button variant="outline" onClick={loadData} disabled={loading}>
                            <RefreshCw
                                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                            />
                            Yenile
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* File Lists */}
            <Tabs defaultValue="videos" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="videos">
                        <Video className="mr-2 h-4 w-4" />
                        Videolar ({videos.length})
                    </TabsTrigger>
                    <TabsTrigger value="reports">
                        <FileText className="mr-2 h-4 w-4" />
                        Raporlar ({reports.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="videos">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Video Dosyaları</CardTitle>
                                <CardDescription>
                                    Test koşmalarından oluşan video kayıtları
                                </CardDescription>
                            </div>
                            {selectedVideos.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteSelected("videos")}
                                    disabled={deleting}
                                >
                                    {deleting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Seçilenleri Sil ({selectedVideos.size})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {videos.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Henüz video dosyası yok
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedVideos.size === videos.length}
                                                    onCheckedChange={selectAllVideos}
                                                />
                                            </TableHead>
                                            <TableHead>Dosya Adı</TableHead>
                                            <TableHead>Boyut</TableHead>
                                            <TableHead>Oluşturulma</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {videos.map((video) => (
                                            <TableRow key={video.path}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedVideos.has(video.path)}
                                                        onCheckedChange={() =>
                                                            toggleVideoSelection(video.path)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {video.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{video.sizeFormatted}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(video.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="reports">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Allure Raporları</CardTitle>
                                <CardDescription>
                                    Test koşmalarından oluşan HTML raporları
                                </CardDescription>
                            </div>
                            {selectedReports.size > 0 && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteSelected("reports")}
                                    disabled={deleting}
                                >
                                    {deleting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-2 h-4 w-4" />
                                    )}
                                    Seçilenleri Sil ({selectedReports.size})
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            {reports.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    Henüz rapor yok
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedReports.size === reports.length}
                                                    onCheckedChange={selectAllReports}
                                                />
                                            </TableHead>
                                            <TableHead>Job ID</TableHead>
                                            <TableHead>Boyut</TableHead>
                                            <TableHead>Oluşturulma</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports.map((report) => (
                                            <TableRow key={report.path}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedReports.has(report.path)}
                                                        onCheckedChange={() =>
                                                            toggleReportSelection(report.path)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {report.name}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{report.sizeFormatted}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDate(report.createdAt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
