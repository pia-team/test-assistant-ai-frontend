"use server";

import { auth } from "@/lib/auth";

interface RunTestsParams {
    tags: string;
    env: string;
    isParallel: boolean;
    threads: number | null;
}

export async function runTestsAction(params: RunTestsParams) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const response = await fetch(
        `${process.env.API_URL || "http://localhost:8093"}/api/run-tests`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify(params),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to run tests: ${errorText}`);
    }

    return response.json();
}

interface GenerateTestsParams {
    url?: string;
    jsonSchema: string;
    hasFeatureFile: boolean;
    hasAPITests: boolean;
    hasTestPayload: boolean;
    hasSwaggerTest: boolean;
}

export async function generateTestsAction(params: GenerateTestsParams) {
    const session = await auth();
    if (!session) {
        throw new Error("Unauthorized");
    }

    const response = await fetch(
        `${process.env.API_URL || "http://localhost:8093"}/api/generate-tests`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify(params),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate tests: ${errorText}`);
    }

    return response.json();
}
