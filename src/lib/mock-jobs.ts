import type { Job, JobType } from "@/app/actions/job-actions";
import { JOB_UPDATE } from "@/lib/socket-events";

export function createMockJob(type: JobType, payload?: any): Job {
  const now = new Date();
  return {
    id: `mock-${type}-${now.getTime()}`,
    type,
    status: "PENDING",
    request: payload ?? {},
    result: null,
    error: null,
    userId: "mock",
    username: "mock",
    createdAt: now.toISOString(),
    completedAt: null,
  };
}

export function simulateLifecycle(socket: any, job: Job, outcome: "COMPLETED" | "FAILED" = "COMPLETED") {
  socket.emit(JOB_UPDATE, job);
  setTimeout(() => {
    socket.emit(JOB_UPDATE, { ...job, status: "RUNNING" });
  }, 3000);
  setTimeout(() => {
    if (outcome === "COMPLETED") {
      socket.emit(JOB_UPDATE, { ...job, status: "COMPLETED", result: { ok: true }, completedAt: new Date().toISOString() });
    } else {
      socket.emit(JOB_UPDATE, { ...job, status: "FAILED", error: "Mock failure", completedAt: new Date().toISOString() });
    }
  }, 6000);
}
