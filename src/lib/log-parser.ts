export interface TestStep {
    type: string;
    content: string;
    status: "PASS" | "FAIL" | "INFO";
}

export interface TestCase {
    id: string;
    title: string;
    status: "PASSED" | "FAILED" | "SKIPPED";
    duration: string;
    browser: string;
    steps: TestStep[];
    video: string | null;
    videos: string[];
    errors: string[];
}

export interface DashboardData {
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
    };
    testCases: TestCase[];
}

export const parseLogsToDashboardData = (
    logs: string,
    tags: string
): DashboardData | null => {
    if (!logs) return null;

    const lines = logs.split("\n");
    const testCases: TestCase[] = [];
    let currentTest: TestCase | null = null;
    let globalVideos: string[] = [];

    const defaultTitle = tags ? `Test Run (${tags})` : "Test Run";

    const createNewTest = (title: string = defaultTitle): TestCase => {
        return {
            id: `test-${Date.now()}-${Math.random()}`,
            title: title,
            status: "PASSED",
            duration: "0s",
            browser: "Chrome",
            steps: [],
            steps: [],
            video: null,
            videos: [],
            errors: [],
        };
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Detect Feature and Scenario
        if (line.includes("Feature:")) {
            const featureName = line.split("Feature:")[1]?.trim() || "";
            if (currentTest && ["Test Run", "Test Execution", "User Journey"].includes(currentTest.title)) {
                currentTest.title = featureName;
            }
        } else if (line.includes("Scenario:") || line.includes("Test Case:")) {
            const scenarioName = line.split(":")[1]?.trim() || "";
            if (currentTest && currentTest.steps.length === 0) {
                currentTest.title = scenarioName;
            } else {
                if (currentTest && currentTest.steps.length > 0) {
                    currentTest = createNewTest(scenarioName);
                    testCases.push(currentTest);
                } else {
                    if (currentTest) {
                        currentTest.title = scenarioName;
                    } else {
                        currentTest = createNewTest(scenarioName);
                        testCases.push(currentTest);
                    }
                }
            }
        } else if (line.includes("Starting test run") && !currentTest) {
            currentTest = createNewTest("Test Run");
            testCases.push(currentTest);
        }

        // Parse Step Details
        if (line.includes("Name of Text is :")) {
            if (!currentTest) {
                currentTest = createNewTest("User Journey");
                testCases.push(currentTest);
            }
            currentTest.steps.push({
                type: "text",
                content: line.split("Name of Text is :")[1]?.trim() || "",
                status: "PASS",
            });
        } else if (line.includes("Name of user is:")) {
            if (!currentTest) {
                currentTest = createNewTest("User Journey");
                testCases.push(currentTest);
            }
            currentTest.steps.push({
                type: "user",
                content: line.split("Name of user is:")[1]?.trim() || "",
                status: "PASS",
            });
        } else if (line.includes("User is attempting to")) {
            if (!currentTest) {
                currentTest = createNewTest("User Journey");
                testCases.push(currentTest);
            }
            currentTest.steps.push({ type: "action", content: line, status: "INFO" });
        } else if (line.includes("User successfully")) {
            if (currentTest) {
                currentTest.steps.push({ type: "success", content: line, status: "PASS" });
            }
        } else if (line.includes("Verifying warning")) {
            if (currentTest) {
                currentTest.steps.push({ type: "verify", content: line, status: "INFO" });
            }
        } else if (line.includes("Actual warning message:")) {
            if (currentTest) {
                currentTest.steps.push({
                    type: "result",
                    content: line.split("Actual warning message:")[1]?.trim() || "",
                    status: "PASS",
                });
            }
        }

        // Detect Errors
        else if (line.includes("Error:") || line.includes("failed") || line.includes("Exception")) {
            if (currentTest) {
                currentTest.status = "FAILED";
                currentTest.errors.push(line);
                currentTest.steps.push({ type: "error", content: line, status: "FAIL" });
            }
        }

        // Detect Video
        else if (line.includes("Video kaydedildi:")) {
            const fullPath = line.split("Video kaydedildi:")[1]?.trim() || "";
            const filename = fullPath.split("\\").pop() || "";
            const videoUrl = `http://localhost:8093/videos/${filename}`;
            if (currentTest) {
                currentTest.video = videoUrl;
                currentTest.videos.push(videoUrl);
            }
            globalVideos.push(videoUrl);
        }
    });

    // Fallback if no specific steps parsed but we have logs
    if (!currentTest && lines.length > 0) {
        currentTest = createNewTest("Raw Execution Log");
        currentTest.steps = lines.map((l) => ({ type: "log", content: l, status: "INFO" as const }));
        testCases.push(currentTest);
    }

    if (currentTest) {
        if (currentTest.videos.length === 0 && globalVideos.length > 0) {
            currentTest.videos = [...globalVideos];
            currentTest.video = globalVideos[0];
        } else if (!currentTest.video && currentTest.videos.length > 0) {
            currentTest.video = currentTest.videos[0];
        }
        currentTest.duration = `${currentTest.steps.length * 2}s`;
        if (!testCases.includes(currentTest)) testCases.push(currentTest);
    }

    const total = testCases.length;
    const passed = testCases.filter((t) => t.status === "PASSED").length;
    const failed = testCases.filter((t) => t.status === "FAILED").length;
    const skipped = testCases.filter((t) => t.status === "SKIPPED").length;

    return {
        summary: { total, passed, failed, skipped },
        testCases,
    };
};
