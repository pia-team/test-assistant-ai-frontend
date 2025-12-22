"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8093";

export interface FileContent {
    fileName: string;
    code: string;
}

export interface InjectedFile {
    fileName: string;
    absolutePath: string;
    bytesWritten: number;
    created: boolean;
    overwritten: boolean;
}

export interface ConflictInfo {
    fileName: string;
    existingContent: string;
    newContent: string;
    backupPath?: string;
}

export interface InjectionResult {
    success: boolean;
    injectedFiles: InjectedFile[];
    conflicts: ConflictInfo[];
    errors: string[];
    message: string;
}

export interface InjectionOptions {
    overwriteExisting?: boolean;
    backupExisting?: boolean;
    jobId?: string;
}

// ... existing code ...

async function getAuthHeaders(token?: string): Promise<HeadersInit> {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

export async function injectCode(
    files: FileContent[],
    options: InjectionOptions = {},
    token?: string
): Promise<InjectionResult> {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/inject-code`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            files,
            overwriteExisting: options.overwriteExisting ?? false,
            backupExisting: options.backupExisting ?? true,
            jobId: options.jobId,
        }),
    });

    const result = await response.json();

    if (response.status === 409) {
        return {
            success: false,
            injectedFiles: [],
            conflicts: result.conflicts || [],
            errors: [],
            message: result.message || "Conflicts detected",
        };
    }

    if (!response.ok) {
        throw new Error(result.message || `Injection failed: ${response.statusText}`);
    }

    return result;
}

export async function checkConflicts(
    files: FileContent[],
    token?: string
): Promise<InjectionResult> {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/inject-code/conflicts`, {
        method: "POST",
        headers,
        body: JSON.stringify(files),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conflict check failed: ${errorText}`);
    }

    return response.json();
}

export async function resolveConflict(
    files: FileContent[],
    token?: string
): Promise<InjectionResult> {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/inject-code/resolve-conflict`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            files,
            overwriteExisting: true,
            backupExisting: true,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Conflict resolution failed: ${errorText}`);
    }

    return response.json();
}
