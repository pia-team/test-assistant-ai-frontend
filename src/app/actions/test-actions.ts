interface RunTestsParams {
    tags: string;
    env: string;
    isParallel: boolean;
    threads: number | null;
}

export async function runTestsAction(params: RunTestsParams, token?: string) {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/run-tests`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
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

export async function generateTestsAction(params: GenerateTestsParams, token?: string) {
    if (!token) {
        throw new Error("Unauthorized: No access token provided");
    }

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/generate-tests`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
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
