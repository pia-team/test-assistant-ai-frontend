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
    const testCases: TestCase[] = [];
    let currentTest: TestCase | null = null;
    const globalVideos: string[] = [];

    const defaultTitle = tags ? `Test Run (${tags})` : "Test Run";
    let detectedBrowser = "Chrome"; // Default, will be overwritten if found in logs

    const createNewTest = (title: string = defaultTitle): TestCase => {
        return {
            id: `test-${Date.now()}-${Math.random()}`,
            title: title,
            status: "PASSED",
            duration: "0s",
            browser: detectedBrowser,
            steps: [],
            video: null,
            videos: [],
            errors: [],
            screenshots: [],
        };
    };

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // ====== Cucumber-JS Output Format ======
        // Starting test run info
        if (line.includes("Starting test run with tags:")) {
            if (!currentTest) {
                currentTest = createNewTest(defaultTitle);
                testCases.push(currentTest);
            }
            currentTest.steps.push({
                type: "info",
                content: line,
                status: "INFO",
            });
        }
        // Browser info from Playwright (🌐 Browser: firefox | Headless: true | SlowMo: 200ms)
        else if (line.includes("Browser:") && (line.includes("🌐") || line.includes("Headless") || line.includes("SlowMo"))) {
            const browserMatch = line.match(/Browser:\s*(\w+)/i);
            if (browserMatch) {
                const browserName = browserMatch[1].toLowerCase();
                if (browserName === "chromium") detectedBrowser = "Chrome";
                else if (browserName === "firefox") detectedBrowser = "Firefox";
                else if (browserName === "webkit") detectedBrowser = "Safari";
                else detectedBrowser = browserMatch[1];

                // Update current test's browser if it exists
                if (currentTest) {
                    currentTest.browser = detectedBrowser;
                }
            }
            if (!currentTest) {
                currentTest = createNewTest(defaultTitle);
                testCases.push(currentTest);
            }
            currentTest.steps.push({
                type: "config",
                content: line,
                status: "INFO",
            });
        }
        // Browser info from Backend logs (Browser: chromium)
        else if (line.toLowerCase().includes("browser:")) {
            const browserMatch = line.match(/browser:\s*(\w+)/i);
            if (browserMatch) {
                const browserName = browserMatch[1].toLowerCase();
                if (browserName === "chromium") detectedBrowser = "Chrome";
                else if (browserName === "firefox") detectedBrowser = "Firefox";
                else if (browserName === "webkit") detectedBrowser = "Safari";
                else detectedBrowser = browserMatch[1];

                if (currentTest) {
                    currentTest.browser = detectedBrowser;
                }
            }
        }
        // Environment info
        else if (line.includes("Environment:") || line.includes("Parallel Execution:") || line.includes("Thread Count:")) {
            if (currentTest) {
                currentTest.steps.push({
                    type: "config",
                    content: line,
                    status: "INFO",
                });
            }
        }
        // Cucumber config loaded
        else if (line.includes("CUCUMBER CONFIG LOADED")) {
            if (!currentTest) {
                currentTest = createNewTest(defaultTitle);
                testCases.push(currentTest);
            }
            // Avoid duplicate config logs
            const alreadyExists = currentTest.steps.some((s) => s.content === "Cucumber yapılandırması yüklendi");
            if (!alreadyExists) {
                currentTest.steps.push({
                    type: "info",
                    content: "Cucumber yapılandırması yüklendi",
                    status: "INFO",
                });
            }
        }
        // Step Start (➡ STEP START: ...)
        else if (line.includes("STEP START:") || line.includes("➡")) {
            if (!currentTest) {
                currentTest = createNewTest(defaultTitle);
                testCases.push(currentTest);
            }
            const stepName = line.replace(/.*STEP START:\s*/, "").replace(/➡\s*/, "").trim();
            currentTest.steps.push({
                type: "step",
                content: `▶ ${stepName}`,
                status: "INFO",
            });
        }
        // Step Pass (✓ STEP PASS: ...)
        else if (line.includes("STEP PASS:") || line.includes("✓")) {
            if (currentTest) {
                const stepName = line.replace(/.*STEP PASS:\s*/, "").replace(/✓\s*/, "").trim();
                currentTest.steps.push({
                    type: "success",
                    content: `✓ ${stepName}`,
                    status: "PASS",
                });
            }
        }
        // Step Fail (✗ STEP FAIL: ... or ❌)
        else if (line.includes("STEP FAIL:") || line.includes("✗") || line.includes("❌")) {
            if (currentTest) {
                const stepName = line.replace(/.*STEP FAIL:\s*/, "").replace(/[✗❌]\s*/, "").trim();
                currentTest.status = "FAILED";
                currentTest.errors.push(stepName);
                currentTest.steps.push({
                    type: "error",
                    content: `✗ ${stepName}`,
                    status: "FAIL",
                });
            }
        }
        // Video recording (🎥 Video kaydedildi: ...)
        else if (line.includes("Video kaydedildi:") || (line.includes("🎥") && !line.includes("Screenshot"))) {
            const fullPath = line.split("Video kaydedildi:")[1]?.trim() || line.split("🎥")[1]?.trim() || "";
            const filename = fullPath.split("\\").pop()?.split("/").pop() || "";
            if (filename) {
                const videoUrl = `http://localhost:8080/videos/${filename}`;
                if (currentTest) {
                    currentTest.video = videoUrl;
                    currentTest.videos.push(videoUrl);
                }
                globalVideos.push(videoUrl);
                if (currentTest) {
                    currentTest.steps.push({
                        type: "video",
                        content: `🎥 Video kaydedildi: ${filename}`,
                        status: "PASS",
                    });
                }
            }
        }
        // Screenshot recording (📸 Screenshot kaydedildi: ...)
        else if (line.includes("Screenshot kaydedildi:") || line.includes("📸")) {
            const fullPath = line.split("Screenshot kaydedildi:")[1]?.trim() || line.split("📸")[1]?.trim() || "";
            const filename = fullPath.split("\\").pop()?.split("/").pop() || "";
            if (filename && filename.endsWith(".png")) {
                const screenshotUrl = `http://localhost:8080/screenshots/${filename}`;
                if (currentTest) {
                    currentTest.screenshots.push(screenshotUrl);
                }
            }
        }
        // Test completed successfully
        else if (line.includes("Test run completed successfully")) {
            if (currentTest) {
                currentTest.steps.push({
                    type: "success",
                    content: "✓ Test çalıştırması başarıyla tamamlandı",
                    status: "PASS",
                });
            }
        }
        // Test failed
        else if (line.includes("Test run failed") || line.includes("failed with exit code")) {
            if (currentTest) {
                currentTest.status = "FAILED";
                currentTest.errors.push(line);
                currentTest.steps.push({
                    type: "error",
                    content: line,
                    status: "FAIL",
                });
            }
        }
        // ====== Legacy Format Support ======
        // Detect Feature and Scenario
        else if (line.includes("Feature:")) {
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
        }
        // General Errors
        else if (line.includes("Error:") || line.includes("Exception") || line.includes("TimeoutError")) {
            if (currentTest) {
                currentTest.status = "FAILED";
                currentTest.errors.push(line);
                currentTest.steps.push({ type: "error", content: line, status: "FAIL" });
            }
        }
        // Assertion errors
        else if (line.includes("AssertionError") || line.includes("expect(") || line.includes("toBeVisible")) {
            if (currentTest) {
                currentTest.status = "FAILED";
                currentTest.errors.push(line);
                currentTest.steps.push({ type: "error", content: line, status: "FAIL" });
            }
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
