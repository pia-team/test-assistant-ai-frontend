"use server";

import { auth } from "@/lib/auth";

export interface FileContent {
    fileName: string;
    code: string;
}

export interface UploadJsonResponse {
    featureFiles?: FileContent[];
    stepDefinitions?: FileContent[];
    apiTests?: FileContent[];
    testPayloads?: FileContent[];
    [key: string]: FileContent[] | undefined;
}

export async function uploadJsonAction(formData: FormData): Promise<UploadJsonResponse> {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("No file provided");
    }

    // Create a new FormData to send to backend
    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const response = await fetch(
        `${process.env.API_URL || "http://localhost:8093"}/api/upload-json-ai`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
            },
            body: backendFormData,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await response.json();

    // Handle "Did not generate tests" case
    if (result.message === "Did not generate tests" || result === "Did not generate tests") {
        throw new Error("Could not generate tests from the provided file");
    }

    return result;
}
