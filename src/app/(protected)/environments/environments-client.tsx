"use client";

import React, { useEffect, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Edit2,
    Trash2,
    Plus,
    Rocket,
    Globe,
    Search,
    Loader2,
    ChevronLeft,
    ExternalLink,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import Link from "next/link";

interface Environment {
    id: string;
    name: string;
    envKey: string;
    baseLoginUrl: string;
    username: string;
    password?: string;
}

const ENV_OPTIONS = [
    { label: 'Üretim (Prod)', value: 'prod' },
    { label: 'Hazırlık (Staging)', value: 'staging' },
    { label: 'Geliştirme (Dev)', value: 'dev' },
];

const envSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
    envKey: z.string().min(1, "Ortam tipi seçilmelidir"),
    baseLoginUrl: z.string().min(1, "Giriş URL gereklidir").refine(val => val.startsWith("http"), "Geçerli bir URL (http/https) giriniz"),
    username: z.string().min(1, "Kullanıcı adı gereklidir"),
    password: z.string().min(1, "Şifre gereklidir"),
});

type EnvFormValues = z.infer<typeof envSchema>;

export function EnvironmentsClient({ dictionary }: { dictionary: any }) {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const form = useForm<EnvFormValues>({
        resolver: zodResolver(envSchema),
        defaultValues: {
            name: "",
            envKey: "dev",
            baseLoginUrl: "",
            username: "",
            password: "",
        }
    });

    const fetchEnvironments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/environments`);
            if (res.ok) {
                const data = await res.json();
                setEnvironments(data);
            }
        } catch (error) {
            console.error("Failed to fetch environments:", error);
            toast.error("Ortamlar yüklenirken bir hata oluştu");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEnvironments();
    }, []);

    const onEdit = (env: Environment) => {
        form.reset({
            id: env.id,
            name: env.name,
            envKey: env.envKey,
            baseLoginUrl: env.baseLoginUrl,
            username: env.username,
            password: env.password || "********", // Backend might not return password, placeholder
        });
        setIsEditModalOpen(true);
    };

    const onSubmit = async (values: EnvFormValues) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/environments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                toast.success(values.id ? "Profil güncellendi" : "Profil oluşturuldu");
                setIsEditModalOpen(false);
                fetchEnvironments();
            } else {
                toast.error("İşlem başarısız oldu");
            }
        } catch (error) {
            toast.error("Bir hata oluştu");
        }
    };

    const onDelete = async (id: string, name: string) => {
        if (!confirm(`${name} profilini silmek istediğinize emin misiniz?`)) return;

        setIsDeleting(id);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/environments/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success("Profil silindi");
                fetchEnvironments();
            } else {
                toast.error("Silme işlemi başarısız");
            }
        } catch (error) {
            toast.error("Bir hata oluştu");
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredEnvironments = environments.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.envKey.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                        <Link href="/test-run" className="hover:text-indigo-600 transition-colors flex items-center gap-1">
                            <ChevronLeft className="w-4 h-4" /> Test Koşusu
                        </Link>
                        <span>/</span>
                        <span className="text-slate-900 dark:text-slate-100">Ortam Yönetimi</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
                        <Globe className="w-8 h-8 text-indigo-500" />
                        Ortam Profilleri
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Test süreçlerinde kullanılacak kayıtlı ortam bilgilerini yönetin.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        form.reset({
                            name: "",
                            envKey: "dev",
                            baseLoginUrl: "",
                            username: "",
                            password: "",
                        });
                        setIsEditModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Ortam Ekle
                </Button>
            </motion.div>

            <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg">Kayıtlı Profiller</CardTitle>
                            <CardDescription>Toplam {environments.length} profil bulundu</CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Profil adı veya tip ile ara..."
                                className="pl-10 h-10 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                            <p className="text-slate-500 animate-pulse">Ortamlar yükleniyor...</p>
                        </div>
                    ) : filteredEnvironments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-slate-400" />
                            </div>
                            <h3 className="text-lg font-semibold">Profil Bulunamadı</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mb-6">
                                {searchTerm ? "Aramanızla eşleşen profil bulunamadı." : "Henüz herhangi bir ortam profili oluşturmadınız."}
                            </p>
                            {!searchTerm && (
                                <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
                                    İlk Profili Oluştur
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[250px]">Profil Adı</TableHead>
                                        <TableHead>Ortam Tipi</TableHead>
                                        <TableHead>Giriş URL</TableHead>
                                        <TableHead>Kullanıcı</TableHead>
                                        <TableHead className="text-right">İşlemler</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {filteredEnvironments.map((env) => (
                                            <motion.tr
                                                key={env.id}
                                                layout
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                            >
                                                <TableCell className="font-semibold text-slate-700 dark:text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                        {env.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`font-medium ${env.envKey === 'prod' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            env.envKey === 'staging' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                            }`}
                                                    >
                                                        {ENV_OPTIONS.find(o => o.value === env.envKey)?.label || env.envKey}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate text-slate-500 italic text-xs">
                                                    {env.baseLoginUrl}
                                                </TableCell>
                                                <TableCell className="text-slate-600 font-mono text-xs">
                                                    {env.username}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                            onClick={() => onEdit(env)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                                                            disabled={isDeleting === env.id}
                                                            onClick={() => onDelete(env.id, env.name)}
                                                        >
                                                            {isDeleting === env.id ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {form.getValues("id") ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                            {form.getValues("id") ? "Profili Düzenle" : "Yeni Profil Ekle"}
                        </DialogTitle>
                        <DialogDescription>
                            Test ortamı bilgilerini eksiksiz doldurun.
                        </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Profil Adı</Label>
                                        <FormControl>
                                            <Input placeholder="Örn: Müşteri Paneli Prod" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="envKey"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label>Ortam Tipi</Label>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seçiniz" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {ENV_OPTIONS.map(opt => (
                                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label>Kullanıcı Adı</Label>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="baseLoginUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Giriş (Base) URL</Label>
                                        <FormControl>
                                            <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <Label>Şifre</Label>
                                        <FormControl>
                                            <Input type="password" placeholder="******" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                                    İptal
                                </Button>
                                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {form.getValues("id") ? "Güncelle" : "Kaydet"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
