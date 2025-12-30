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
    screenshots: string[];
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
    const testCasesMap = new Map<string, TestCase>();
    const knownFeatures: string[] = [];
    const globalSteps: TestStep[] = [];

    let lastActiveTitle: string | null = null;
    let detectedBrowser = "Chrome";

    const getOrCreateTest = (title: string): TestCase => {
        if (!testCasesMap.has(title)) {
            testCasesMap.set(title, {
                id: `test-${title}-${Math.random().toString(36).substr(2, 9)}`,
                title: title,
                status: "PASSED",
                duration: "0s",
                browser: detectedBrowser,
                steps: [],
                video: null,
                videos: [],
                errors: [],
                screenshots: [],
            });
            if (!knownFeatures.includes(title)) {
                knownFeatures.push(title);
            }
        }
        return testCasesMap.get(title)!;
    };

    // First pass: identify features explicitly
    lines.forEach(line => {
        if (line.includes("Feature:") || line.includes("Scenario:")) {
            const name = line.split(":")[1]?.trim();
            if (name) getOrCreateTest(name);
        }
    });

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Browser detection (global)
        if (line.toLowerCase().includes("browser:")) {
            const browserMatch = line.match(/browser:\s*(\w+)/i);
            if (browserMatch) {
                const browserName = browserMatch[1].toLowerCase();
                if (browserName === "chromium") detectedBrowser = "Chrome";
                else if (browserName === "firefox") detectedBrowser = "Firefox";
                else if (browserName === "webkit") detectedBrowser = "Safari";
                else detectedBrowser = browserMatch[1];
            }
        }

        // Check if it's a global line (Starting test run, Parallel, Thread count, Browser config)
        const isGlobal = line.includes("Starting test run") ||
            line.includes("Parallel Execution:") ||
            line.includes("Thread Count:") ||
            line.includes("Environment:") ||
            (line.includes("Browser:") && (line.includes("🌐") || line.includes("Headless"))) ||
            line.includes("Cucumber yapılandırması yüklendi");

        if (isGlobal) {
            globalSteps.push({
                type: "info",
                content: line,
                status: "INFO"
            });
            return; // Skip further processing for this line in the loop
        }

        // Logic to find which test this line belongs to
        let targetTest: TestCase | null = null;

        for (const feature of knownFeatures) {
            if (line.toLowerCase().includes(feature.toLowerCase())) {
                targetTest = getOrCreateTest(feature);
                lastActiveTitle = feature;
                break;
            }
        }

        // Special case for mentioning common feature names as mentioned by user
        if (!targetTest) {
            if (line.toLowerCase().includes("dcmuiv2")) {
                targetTest = getOrCreateTest("dcmuiv2");
                lastActiveTitle = "dcmuiv2";
            } else if (line.toLowerCase().includes("demoqa")) {
                targetTest = getOrCreateTest("demoqa");
                lastActiveTitle = "demoqa";
            }
        }

        // Use last active title for step/success/fail lines if unmatched
        if (!targetTest && (line.includes("▶") || line.includes("✓") || line.includes("✗") || line.includes("❌") || line.includes("STEP START") || line.includes("STEP PASS") || line.includes("STEP FAIL"))) {
            if (lastActiveTitle) {
                targetTest = getOrCreateTest(lastActiveTitle);
            }
        }

        // If it's a generic line and we have an active test, add to it
        if (!targetTest && lastActiveTitle) {
            targetTest = getOrCreateTest(lastActiveTitle);
        }

        // If we found a target test, parse the line content
        if (targetTest) {
            if (line.includes("STEP START:") || line.includes("▶")) {
                const stepName = line.replace(/.*STEP START:\s*/, "").replace(/▶\s*/, "").trim();
                targetTest.steps.push({ type: "step", content: `▶ ${stepName}`, status: "INFO" });
            } else if (line.includes("STEP PASS:") || line.includes("✓")) {
                const stepName = line.replace(/.*STEP PASS:\s*/, "").replace(/✓\s*/, "").trim();
                targetTest.steps.push({ type: "success", content: `✓ ${stepName}`, status: "PASS" });
            } else if (line.includes("STEP FAIL:") || line.includes("✗") || line.includes("❌")) {
                const stepName = line.replace(/.*STEP FAIL:\s*/, "").replace(/[✗❌]\s*/, "").trim();
                targetTest.status = "FAILED";
                targetTest.errors.push(stepName);
                targetTest.steps.push({ type: "error", content: `✗ ${stepName}`, status: "FAIL" });
            } else if (line.includes("Video kaydedildi:") || line.includes("🎥")) {
                const fullPath = line.split("Video kaydedildi:")[1]?.trim() || line.split("🎥")[1]?.trim() || "";
                const filename = fullPath.split("\\").pop()?.split("/").pop() || "";
                if (filename) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                    const videoUrl = `${apiUrl}/videos/${filename}`;
                    targetTest.video = videoUrl;
                    targetTest.videos.push(videoUrl);
                    targetTest.steps.push({ type: "video", content: `🎥 Video kaydedildi: ${filename}`, status: "PASS" });
                }
            } else if (line.includes("Screenshot kaydedildi:") || line.includes("📸")) {
                const fullPath = line.split("Screenshot kaydedildi:")[1]?.trim() || line.split("📸")[1]?.trim() || "";
                const filename = fullPath.split("\\").pop()?.split("/").pop() || "";
                if (filename && filename.endsWith(".png")) {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
                    const screenshotUrl = `${apiUrl}/screenshots/${filename}`;
                    targetTest.screenshots.push(screenshotUrl);
                }
            } else if (line.includes("Error:") || line.includes("Exception") || line.includes("AssertionError")) {
                targetTest.status = "FAILED";
                targetTest.errors.push(line);
                targetTest.steps.push({ type: "error", content: line, status: "FAIL" });
            } else {
                if (!line.includes("Feature:") && !line.includes("Scenario:")) {
                    targetTest.steps.push({ type: "log", content: line, status: "INFO" });
                }
            }
        }
    });

    const testCases = Array.from(testCasesMap.values());

    // Merge global steps into ALL detected test cases
    if (testCases.length > 0) {
        testCases.forEach(tc => {
            tc.steps = [...globalSteps, ...tc.steps];
            tc.duration = `${tc.steps.length * 1.5}s`;
            tc.browser = detectedBrowser; // Sync final detected browser
        });
    } else if (lines.length > 0) {
        // Fallback ONLY if absolutely no features were found.
        // User says they DON'T want generic tabs, but we need to show SOMETHING if logs exist.
        // Let's create one "Execution Log" as a last resort, but we try to avoid it.
        const fallback = {
            id: `test-raw-${Date.now()}`,
            title: "Execution Log",
            status: "PASSED" as const,
            duration: "0s",
            browser: detectedBrowser,
            steps: lines.map(l => ({ type: "log", content: l, status: "INFO" as const })),
            video: null,
            videos: [],
            errors: [],
            screenshots: [],
        };
        testCases.push(fallback);
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
