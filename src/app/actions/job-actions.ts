"use server";



export type JobType = "GENERATE_TESTS" | "RUN_TESTS" | "UPLOAD_JSON" | "OPEN_REPORT";
export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "STOPPED";

export interface JobUser {
    id: string;
    keycloakId?: string;
    username?: string;
    email?: string;
    fullName?: string;
}

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    progress?: number;
    progressMessage?: string;
    stepKey?: string;
    currentStep?: number;
    totalSteps?: number;
    request?: unknown;
    result?: unknown;
    error?: string | null;
    userId?: string;
    username?: string;
    user?: JobUser;
    cancelledBy?: string | JobUser;
    createdAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
}

// ... imports and types remain same

const API_URL = process.env.API_URL || "http://localhost:8093";

// Helper to get auth headers from client token
async function getAuthHeaders(token?: string) {
    if (!token) {
        console.error("SERVER ACTION ERROR: No token provided");
        throw new Error("Unauthorized: No access token provided");
    }

    // console.log("SERVER ACTION: Token provided (length: " + token.length + ")");
    return {
        Authorization: `Bearer ${token}`,
    };
}

// Start generate-tests job
export async function startGenerateTestsJob(params: {
    url?: string;
    jsonSchema: string;
    hasFeatureFile: boolean;
    hasAPITests: boolean;
    hasTestPayload: boolean;
    hasSwaggerTest: boolean;
}, token?: string): Promise<Job> {
    const headers = await getAuthHeaders(token);

    // ... rest of function using headers
    const response = await fetch(`${API_URL}/api/jobs/generate-tests`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    });

    if (response.status === 409) {
        const data = await response.json();
        throw new Error(`JOB_ALREADY_RUNNING:${JSON.stringify(data.activeJob)}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to start job: ${await response.text()}`);
    }

    return response.json();
}

// Start run-tests job
export async function startRunTestsJob(params: {
    tags: string;
    env: string;
    project?: string;
    isParallel: boolean;
    threads: number | null;
    browser?: string;
    headless?: boolean;
}, token?: string): Promise<Job> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs/run-tests`, {
        method: "POST",
        headers: {
            ...headers,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
    });

    if (response.status === 409) {
        const data = await response.json();
        throw new Error(`JOB_ALREADY_RUNNING:${JSON.stringify(data.activeJob)}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to start job: ${await response.text()}`);
    }

    return response.json();
}

// Start upload-json job
export async function startUploadJsonJob(formData: FormData, token?: string): Promise<Job> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs/upload-json`, {
        method: "POST",
        headers,
        body: formData,
    });

    if (response.status === 409) {
        const data = await response.json();
        throw new Error(`JOB_ALREADY_RUNNING:${JSON.stringify(data.activeJob)}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to start job: ${await response.text()}`);
    }

    return response.json();
}

// Get job status
export async function getJobStatus(jobId: string, token?: string): Promise<Job> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
        method: "GET",
        headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to get job status: ${await response.text()}`);
    }

    return response.json();
}

// Get active job by type
export async function getActiveJob(type: JobType, token?: string): Promise<Job | null> {
    const headers = await getAuthHeaders(token);
    const url = `${API_URL}/api/jobs/active/${type}`;

    console.log("SERVER ACTION: getActiveJob calling", url);

    const response = await fetch(url, {
        method: "GET",
        headers,
    });

    console.log("SERVER ACTION: getActiveJob response status:", response.status);

    if (response.status === 204) {
        return null;
    }

    if (!response.ok) {
        throw new Error(`Failed to get active job: ${await response.text()}`);
    }

    return response.json();
}

// Get all jobs
export async function getAllJobs(token?: string): Promise<Job[]> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs?size=100`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to get jobs: ${await response.text()}`);
    }

    const data = await response.json();
    // Handle paginated response from backend
    return data.content || data || [];
}

// Get jobs by type with pagination
export async function getJobsByType(
    type: JobType,
    page: number = 0,
    size: number = 10,
    token?: string
): Promise<{ content: Job[]; totalElements: number; totalPages: number; number: number }> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(
        `${API_URL}/api/jobs/type/${type}?page=${page}&size=${size}&sort=createdAt,desc`,
        {
            method: "GET",
            headers,
            cache: "no-store",
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get jobs by type: ${await response.text()}`);
    }

    return response.json();
}

// Cancel job
export async function cancelJob(jobId: string, token?: string): Promise<void> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to cancel job: ${await response.text()}`);
    }
}

// Start open report job
export async function startOpenReportJob(token?: string): Promise<Job> {
    const headers = await getAuthHeaders(token);

    const response = await fetch(`${API_URL}/api/jobs/report/open`, {
        method: "POST",
        headers,
    });

    if (response.status === 409) {
        const data = await response.json();
        throw new Error(`JOB_ALREADY_RUNNING:${JSON.stringify(data.activeJob)}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to start job: ${await response.text()}`);
    }

    return response.json();
}
