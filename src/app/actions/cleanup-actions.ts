"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper to get auth headers
async function getAuthHeaders(token?: string) {
  if (!token) {
    throw new Error("Unauthorized: No access token provided");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// Types
export interface CleanupResult {
  deletedCount: number;
  failedCount: number;
  bytesFreed: number;
  errors: string[];
}

export interface StorageStats {
  videoCount: number;
  videoSizeBytes: number;
  imageCount: number;
  imageSizeBytes: number;
  reportCount: number;
  reportSizeBytes: number;
  videoRetentionDays: number;
  reportRetentionDays: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  videoSizeFormatted: string;
  imageSizeFormatted: string;
  reportSizeFormatted: string;
}

export interface FileInfo {
  path: string;
  name: string;
  sizeBytes: number;
  createdAt: string;
  isDirectory: boolean;
  sizeFormatted: string;
}

/**
 * Delete specific files by path.
 */
export async function deleteFilesAction(
  files: string[],
  token?: string,
): Promise<CleanupResult> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/files`, {
    method: "POST",
    headers,
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete files: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Delete videos older than specified days.
 */
export async function deleteOldVideosAction(
  olderThanDays: number,
  token?: string,
): Promise<CleanupResult> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/old-videos`, {
    method: "POST",
    headers,
    body: JSON.stringify({ olderThanDays }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete old videos: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Delete reports older than specified days.
 */
export async function deleteOldReportsAction(
  olderThanDays: number,
  token?: string,
): Promise<CleanupResult> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/old-reports`, {
    method: "POST",
    headers,
    body: JSON.stringify({ olderThanDays }),
  });

  if (!response.ok) {
    throw new Error(`Failed to delete old reports: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Delete all artifacts for a specific job.
 */
export async function deleteJobArtifactsAction(
  jobId: string,
  token?: string,
): Promise<CleanupResult> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/job/${jobId}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete job artifacts: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Delete all videos (bulk operation).
 */
export async function deleteAllVideosAction(
  token?: string,
): Promise<CleanupResult> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/videos/all`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete all videos: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Get storage statistics.
 */
export async function getStorageStatsAction(
  token?: string,
): Promise<StorageStats> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/stats`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to get storage stats: ${await response.text()}`);
  }

  return response.json();
}

/**
 * List all video files.
 */
export async function listVideosAction(token?: string): Promise<FileInfo[]> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/videos`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to list videos: ${await response.text()}`);
  }

  return response.json();
}

/**
 * List all report directories.
 */
export async function listReportsAction(token?: string): Promise<FileInfo[]> {
  const headers = await getAuthHeaders(token);

  const response = await fetch(`${API_URL}/api/cleanup/reports`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to list reports: ${await response.text()}`);
  }

  return response.json();
}
