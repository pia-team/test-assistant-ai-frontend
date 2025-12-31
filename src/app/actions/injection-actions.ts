"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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
  token?: string,
): Promise<InjectionResult> {
  if (!token) {
    // Instead of throwing, we can return a failure result or throw specific error
    // But for consistency with the new pattern, let's keep the throw for auth issues
    // or return a structured error if preferred. Let's stick to throwing for Auth
    // as it's a pre-condition.
    // Actually, to be safe against ANY crash, let's wrap everything.
    console.error("[injectCode] No token provided");
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: ["Unauthorized: No access token provided"],
      message: "Unauthorized",
    };
  }

  try {
    const headers = await getAuthHeaders(token);
    const targetUrl = `${API_URL}/api/inject-code`;

    console.log(`[injectCode] Attempting to fetch: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        files,
        overwriteExisting: options.overwriteExisting ?? false,
        backupExisting: options.backupExisting ?? true,
        jobId: options.jobId,
      }),
    });

    // Handle non-JSON responses (e.g. 502 Bad Gateway from Nginx)
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error(
        `[injectCode] Invalid response from backend (${response.status}): ${text.substring(0, 200)}...`,
      );
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [
          `Backend returned ${response.status} (${response.statusText})`,
        ],
        message: `Server returned non-JSON response: ${response.status}`,
      };
    }

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
      console.error(`[injectCode] Backend error (${response.status}):`, result);
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [result.message || response.statusText],
        message:
          result.message || `Injection failed with status ${response.status}`,
      };
    }

    return result;
  } catch (error) {
    console.error("[injectCode] Critical error during injection:", error);
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message:
        error instanceof Error
          ? `System Error: ${error.message}`
          : "System Error",
    };
  }
}

export async function checkConflicts(
  files: FileContent[],
  token?: string,
): Promise<InjectionResult> {
  if (!token) {
    console.error("[checkConflicts] No token provided");
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: ["Unauthorized: No access token provided"],
      message: "Unauthorized",
    };
  }

  try {
    const headers = await getAuthHeaders(token);
    const targetUrl = `${API_URL}/api/inject-code/conflicts`;
    console.log(`[checkConflicts] Fetching: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(files),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [`Backend returned ${response.status}`],
        message: `Server returned non-JSON response`,
      };
    }

    const result = await response.json();

    if (!response.ok) {
      console.error(
        `[checkConflicts] Backend error (${response.status}):`,
        result,
      );
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [result.message || response.statusText],
        message: result.message || "Conflict check failed",
      };
    }

    return result;
  } catch (error) {
    console.error("[checkConflicts] Error:", error);
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: "System Error during conflict check",
    };
  }
}

export async function resolveConflict(
  files: FileContent[],
  token?: string,
): Promise<InjectionResult> {
  if (!token) {
    console.error("[resolveConflict] No token provided");
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: ["Unauthorized"],
      message: "Unauthorized",
    };
  }

  try {
    const headers = await getAuthHeaders(token);
    const targetUrl = `${API_URL}/api/inject-code/resolve-conflict`;
    console.log(`[resolveConflict] Fetching: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        files,
        overwriteExisting: true,
        backupExisting: true,
      }),
    });

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [`Backend returned ${response.status}`],
        message: `Server returned non-JSON response`,
      };
    }

    const result = await response.json();

    if (!response.ok) {
      console.error(
        `[resolveConflict] Backend error (${response.status}):`,
        result,
      );
      return {
        success: false,
        injectedFiles: [],
        conflicts: [],
        errors: [result.message || response.statusText],
        message: result.message || "Conflict resolution failed",
      };
    }

    return result;
  } catch (error) {
    console.error("[resolveConflict] Error:", error);
    return {
      success: false,
      injectedFiles: [],
      conflicts: [],
      errors: [error instanceof Error ? error.message : "Unknown error"],
      message: "System Error during conflict resolution",
    };
  }
}
