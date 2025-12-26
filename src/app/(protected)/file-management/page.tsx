"use client";

import { FileManagerPanel } from "@/components/file-manager-panel";

export default function FileManagementPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Dosya Yönetimi</h1>
                <p className="text-muted-foreground mt-2">
                    Test videolarını, raporlarını ve diğer dosyaları yönetin
                </p>
            </div>
            <FileManagerPanel />
        </div>
    );
}
