'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED';

export interface JobState {
  id: string | null;
  status: JobStatus;
  progress: number;
  message: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

const initialState: JobState = {
  id: null,
  status: 'PENDING',
  progress: 0,
  message: null,
  result: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

export function useJobWithSocket(jobId: string | null) {
  const { subscribeToJob, unsubscribeFromJob, isConnected } = useSocket();
  const [jobState, setJobState] = useState<JobState>(initialState);

  const resetState = useCallback(() => {
    setJobState(initialState);
  }, []);

  useEffect(() => {
    if (!jobId || !isConnected) {
      return;
    }

    setJobState(prev => ({ ...prev, id: jobId }));

    subscribeToJob(jobId, {
      onStarted: (data) => {
        if (data.id === jobId) {
          setJobState(prev => ({
            ...prev,
            status: 'RUNNING',
            startedAt: data.startedAt,
          }));
        }
      },
      onProgress: (data) => {
        if (data.id === jobId) {
          setJobState(prev => ({
            ...prev,
            progress: data.progress,
            message: data.message || prev.message,
          }));
        }
      },
      onCompleted: (data) => {
        if (data.id === jobId) {
          setJobState(prev => ({
            ...prev,
            status: 'COMPLETED',
            progress: 100,
            result: data.resultData,
            completedAt: data.completedAt,
          }));
        }
      },
      onFailed: (data) => {
        if (data.id === jobId) {
          setJobState(prev => ({
            ...prev,
            status: 'FAILED',
            error: data.errorMessage,
            completedAt: data.completedAt,
          }));
        }
      },
      onStopped: (data) => {
        if (data.id === jobId) {
          setJobState(prev => ({
            ...prev,
            status: 'STOPPED',
            error: `Cancelled by ${data.cancelledBy}`,
            completedAt: data.completedAt,
          }));
        }
      },
    });

    return () => {
      unsubscribeFromJob(jobId);
    };
  }, [jobId, isConnected, subscribeToJob, unsubscribeFromJob]);

  return {
    ...jobState,
    isRunning: jobState.status === 'RUNNING' || jobState.status === 'PENDING',
    isCompleted: jobState.status === 'COMPLETED',
    isFailed: jobState.status === 'FAILED',
    isStopped: jobState.status === 'STOPPED',
    resetState,
  };
}
