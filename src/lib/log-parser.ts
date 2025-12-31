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

// Helper to clean garbled characters from logs
const cleanLogLine = (line: string): string => {
  if (!line) return "";
  return line
    .replace(/ğŸŒ/g, "🌐")
    .replace(/â¡/g, "▶")
    .replace(/âœ“/g, "✓")
    .replace(/âœ"/g, "✓") // Alternative check mark
    .replace(/✗/g, "✗")
    .replace(/âœ˜/g, "✗") // Alternative cross
    .replace(/❌/g, "❌")
    .replace(/ğŸ¥/g, "🎥")
    .replace(/ğŸ“¸/g, "📸")
    .replace(/â˜/g, "☁") // Generic cleanup for other potential artifacts
    .trim();
};

export const parseLogsToDashboardData = (
  logs: string,
  tags: string,
): DashboardData | null => {
  if (!logs) return null;

  const rawLines = logs.split("\n");
  const testCasesMap = new Map<string, TestCase>();
  const knownFeatures: string[] = [];
  const globalSteps: TestStep[] = [];

  let lastActiveTitle: string | null = null;
  let detectedBrowser = "Chrome";

  const getOrCreateTest = (title: string): TestCase => {
    if (!testCasesMap.has(title)) {
      testCasesMap.set(title, {
        id: `test-${title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`,
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

  // First pass: identify features explicitly from standard Feature/Scenario lines
  rawLines.forEach((rawLine) => {
    const line = cleanLogLine(rawLine);
    if (line.includes("Feature:") || line.includes("Scenario:")) {
      const name = line.split(":")[1]?.trim();
      if (name) getOrCreateTest(name);
    }
  });

  rawLines.forEach((rawLine) => {
    const line = cleanLogLine(rawLine);
    if (!line) return;

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
    const isGlobal =
      line.includes("Starting test run") ||
      line.includes("Parallel Execution:") ||
      line.includes("Thread Count:") ||
      line.includes("Environment:") ||
      (line.includes("Browser:") &&
        (line.includes("🌐") ||
          line.includes("Headless") ||
          line.includes("ğŸŒ"))) ||
      line.includes("Cucumber yapılandırması yüklendi") ||
      line.includes("CUCUMBER CONFIG LOADED");

    if (isGlobal) {
      // Deduplicate global lines
      const alreadyExists = globalSteps.some((s) => s.content === line);

      if (!alreadyExists) {
        globalSteps.push({
          type: "info",
          content: line,
          status: "INFO",
        });
      }
      return;
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

    // Dynamic detection of test names from filenames (e.g. login.spec.ts, checkout.feature)
    if (!targetTest) {
      const fileMatch = line.match(
        /([a-zA-Z0-9\-_]+)\.(spec\.ts|test\.ts|feature)/i,
      );
      if (fileMatch) {
        const detectedName = fileMatch[1];
        targetTest = getOrCreateTest(detectedName);
        lastActiveTitle = detectedName;
      }
    }

    // Special case for mentioning common feature names as mentioned by user (Legacy support)
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
    if (
      !targetTest &&
      (line.includes("▶") ||
        line.includes("✓") ||
        line.includes("✗") ||
        line.includes("❌") ||
        line.includes("STEP START") ||
        line.includes("STEP PASS") ||
        line.includes("STEP FAIL"))
    ) {
      if (lastActiveTitle) {
        targetTest = getOrCreateTest(lastActiveTitle);
      } else {
        // FALLBACK: If we have a step but NO test case yet (missing headers), create a generic one
        // This ensures we parse the video/steps properly instead of falling back to raw text "Execution Log"
        const genericTitle = "Test Execution";
        targetTest = getOrCreateTest(genericTitle);
        lastActiveTitle = genericTitle;
      }
    }

    // If it's a generic line and we have an active test, add to it
    if (!targetTest && lastActiveTitle) {
      targetTest = getOrCreateTest(lastActiveTitle);
    }

    // If after all attempts we still don't have a target test,
    // AND the line looks important (error, video), force it into the last active or a default
    if (!targetTest) {
      if (
        line.includes("Video kaydedildi:") ||
        line.includes("🎥") ||
        line.includes("Screenshot kaydedildi:") ||
        line.includes("📸")
      ) {
        const fallbackTitle = lastActiveTitle || "Test Execution";
        targetTest = getOrCreateTest(fallbackTitle);
        lastActiveTitle = fallbackTitle;
      }
    }

    // Processing Logic
    if (targetTest) {
      if (line.includes("STEP START:") || line.includes("▶")) {
        const stepName = line
          .replace(/.*STEP START:\s*/, "")
          .replace(/▶\s*/, "")
          .trim();
        targetTest.steps.push({
          type: "step",
          content: `▶ ${stepName}`,
          status: "INFO",
        });
      } else if (line.includes("STEP PASS:") || line.includes("✓")) {
        const stepName = line
          .replace(/.*STEP PASS:\s*/, "")
          .replace(/✓\s*/, "")
          .trim();
        targetTest.steps.push({
          type: "success",
          content: `✓ ${stepName}`,
          status: "PASS",
        });
      } else if (
        line.includes("STEP FAIL:") ||
        line.includes("✗") ||
        line.includes("❌")
      ) {
        const stepName = line
          .replace(/.*STEP FAIL:\s*/, "")
          .replace(/[✗❌]\s*/, "")
          .trim();
        targetTest.status = "FAILED";
        targetTest.errors.push(stepName);
        targetTest.steps.push({
          type: "error",
          content: `✗ ${stepName}`,
          status: "FAIL",
        });
      } else if (line.includes("Video kaydedildi:") || line.includes("🎥")) {
        // Handle complex paths and clean up
        const parts = line.split("Video kaydedildi:");
        const pathPart =
          parts.length > 1 ? parts[1] : line.split("🎥")[1] || "";
        const fullPath = pathPart.replace(/ğŸ¥/g, "").trim();
        const filename = fullPath.split("\\").pop()?.split("/").pop() || "";

        if (filename) {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
          const videoUrl = `${apiUrl}/videos/${filename}`;
          targetTest.video = videoUrl;
          targetTest.videos.push(videoUrl);
          targetTest.steps.push({
            type: "video",
            content: `🎥 Video kaydedildi: ${filename}`,
            status: "PASS",
          });
        }
      } else if (
        line.includes("Screenshot kaydedildi:") ||
        line.includes("📸")
      ) {
        const parts = line.split("Screenshot kaydedildi:");
        const pathPart =
          parts.length > 1 ? parts[1] : line.split("📸")[1] || "";
        const fullPath = pathPart.replace(/ğŸ“¸/g, "").trim();

        const filename = fullPath.split("\\").pop()?.split("/").pop() || "";
        if (
          filename &&
          (filename.endsWith(".png") || filename.endsWith(".jpg"))
        ) {
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
          const screenshotUrl = `${apiUrl}/screenshots/${filename}`;
          targetTest.screenshots.push(screenshotUrl);
        }
      } else if (
        line.includes("Error:") ||
        line.includes("Exception") ||
        line.includes("AssertionError")
      ) {
        targetTest.status = "FAILED";
        targetTest.errors.push(line);
        targetTest.steps.push({ type: "error", content: line, status: "FAIL" });
      } else {
        if (!line.includes("Feature:") && !line.includes("Scenario:")) {
          targetTest.steps.push({ type: "log", content: line, status: "INFO" });
        }
      }
    } else {
      // Truly orphaned lines that aren't global and we couldn't create a test for (should be rare now)
      // Just drop them to avoid "Execution Log" junk unless explicitly desired.
      // If they are not empty, log them to the LAST detected test if available
      if (line.trim().length > 0 && lastActiveTitle) {
        getOrCreateTest(lastActiveTitle).steps.push({
          type: "log",
          content: line,
          status: "INFO",
        });
      }
    }
  });

  const testCases = Array.from(testCasesMap.values());

  // Merge global steps into ALL detected test cases
  if (testCases.length > 0) {
    testCases.forEach((tc) => {
      tc.steps = [...globalSteps, ...tc.steps];
      tc.duration = `${tc.steps.length * 1.5}s`;
      tc.browser = detectedBrowser; // Sync final detected browser
    });
  } else if (rawLines.length > 0) {
    // Absolute last resort fallback if NO steps/videos were found at all
    const fallback = {
      id: `test-execution-log`,
      title: "Execution Log",
      status: "PASSED" as const,
      duration: "0s",
      browser: detectedBrowser,
      steps: rawLines.map((l) => ({
        type: "log",
        content: cleanLogLine(l),
        status: "INFO" as const,
      })),
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
