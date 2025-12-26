"use server";

export interface FileContent {
    fileName: string;
    code: string;
}

export interface UploadJsonResponse {
    featureFiles?: FileContent[] | FileContent;
    stepDefinitions?: FileContent[] | FileContent;
    apiTests?: FileContent[] | FileContent;
    testPayloads?: FileContent[] | FileContent;
    [key: string]: FileContent[] | FileContent | undefined;
}

export async function uploadJsonAction(formData: FormData, token?: string): Promise<UploadJsonResponse> {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("No file provided");
    }

    const tags = formData.get("tags") as string;

    // Create a new FormData to send to backend
    const backendFormData = new FormData();
    backendFormData.append("file", file);
    if (tags) {
        backendFormData.append("tags", tags);
    }

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/upload-json-ai`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
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
