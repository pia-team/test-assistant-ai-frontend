'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { socketService, JobProgressPayload, JobCompletedPayload, JobFailedPayload, JobCreatedPayload } from '@/lib/socket';
import { getKeycloakIdFromToken } from '@/lib/jwt-utils';
import type { Job } from '@/app/actions/job-actions';

interface SocketContextType {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribeToJob: (jobId: string, callbacks: JobCallbacks) => void;
  unsubscribeFromJob: (jobId: string) => void;
}

interface JobCallbacks {
  onCreated?: (data: JobCreatedPayload) => void;
  onStarted?: (data: { id: string; status: string; startedAt: string }) => void;
  onProgress?: (data: JobProgressPayload) => void;
  onCompleted?: (data: JobCompletedPayload) => void;
  onFailed?: (data: JobFailedPayload) => void;
  onStopped?: (data: { id: string; cancelledBy: string; completedAt: string }) => void;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const globalSubscriptionRef = useRef<boolean>(false);

  const updateJobInCache = useCallback((jobId: string, updates: Partial<Job>) => {
    queryClient.setQueryData<Job | null>(['job', jobId], (old) => {
      if (!old) return old;
      return { ...old, ...updates };
    });

    queryClient.setQueryData<Job[]>(['allJobs'], (old) => {
      if (!old) return old;
      return old.map(job => job.id === jobId ? { ...job, ...updates } : job);
    });

    const jobTypes = ['GENERATE_TESTS', 'RUN_TESTS', 'UPLOAD_JSON', 'OPEN_REPORT'];
    jobTypes.forEach(type => {
      queryClient.setQueryData<Job | null>(['activeJob', type], (old) => {
        if (!old || old.id !== jobId) return old;
        return { ...old, ...updates };
      });
    });
  }, [queryClient]);

  const addJobToCache = useCallback((jobData: JobCreatedPayload) => {
    const newJob: Job = {
      id: jobData.id,
      type: jobData.type as Job['type'],
      status: 'PENDING',
      progress: 0,
      createdAt: jobData.createdAt,
      userId: jobData.userId,
      username: jobData.username,
    };

    queryClient.setQueryData<Job | null>(['activeJob', jobData.type], newJob);
    queryClient.setQueryData<Job | null>(['job', jobData.id], newJob);

    queryClient.setQueryData<Job[]>(['allJobs'], (old) => {
      if (!old) return [newJob];
      const exists = old.some(j => j.id === jobData.id);
      if (exists) return old;
      return [newJob, ...old];
    });
  }, [queryClient]);

  const setupGlobalJobListeners = useCallback(() => {
    if (globalSubscriptionRef.current) return;
    globalSubscriptionRef.current = true;

    socketService.onJobCreated((data) => {
      console.log('[Socket] Job created:', data.id);
      addJobToCache(data);
    });

    socketService.onJobStarted((data) => {
      console.log('[Socket] Job started:', data.id);
      updateJobInCache(data.id, { 
        status: 'RUNNING', 
        startedAt: data.startedAt 
      });
    });

    socketService.onJobProgress((data) => {
      console.log('[Socket] Job progress:', data.id, data.progress, data.message);
      updateJobInCache(data.id, { 
        progress: data.progress,
        progressMessage: data.message 
      });
    });

    socketService.onJobCompleted((data) => {
      console.log('[Socket] Job completed:', data.id);
      updateJobInCache(data.id, { 
        status: 'COMPLETED', 
        progress: 100,
        result: data.resultData,
        completedAt: data.completedAt 
      });
      queryClient.invalidateQueries({ queryKey: ['allJobs'] });
    });

    socketService.onJobFailed((data) => {
      console.log('[Socket] Job failed:', data.id);
      updateJobInCache(data.id, { 
        status: 'FAILED', 
        error: data.errorMessage,
        completedAt: data.completedAt 
      });
      queryClient.invalidateQueries({ queryKey: ['allJobs'] });
    });

    socketService.onJobStopped((data) => {
      console.log('[Socket] Job stopped:', data.id);
      updateJobInCache(data.id, { 
        status: 'STOPPED',
        cancelledBy: data.cancelledBy,
        completedAt: data.completedAt 
      });
      queryClient.invalidateQueries({ queryKey: ['allJobs'] });
    });
  }, [addJobToCache, updateJobInCache, queryClient]);

  const connect = useCallback(async () => {
    if (!session?.accessToken) {
      console.warn('[Socket] No access token available for socket connection');
      return;
    }

    try {
      await socketService.connect(session.accessToken);
      setIsConnected(true);
      console.log('[Socket] Connected successfully');
      
      setupGlobalJobListeners();
      
      // F006: Use keycloakId from JWT token instead of session.user.id
      // Backend emits to user:{keycloakId} room, so frontend must subscribe with same ID
      const keycloakId = getKeycloakIdFromToken(session.accessToken);
      if (keycloakId) {
        console.log('[Socket] Subscribing to user room:', `user:${keycloakId}`);
        socketService.subscribeToUserRoom(keycloakId);
      } else {
        console.warn('[Socket] Could not extract keycloakId from token, cannot subscribe to user room');
      }
    } catch (error) {
      console.error('[Socket] Failed to connect:', error);
      setIsConnected(false);
    }
  }, [session?.accessToken, session?.user?.id, setupGlobalJobListeners]);

  const disconnect = useCallback(() => {
    globalSubscriptionRef.current = false;
    socketService.disconnect();
    setIsConnected(false);
  }, []);

  const subscribeToJob = useCallback((jobId: string, callbacks: JobCallbacks) => {
    socketService.subscribeToJob(jobId, callbacks);
  }, []);

  const unsubscribeFromJob = useCallback((jobId: string) => {
    socketService.unsubscribeFromJob(jobId);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [status, session?.accessToken, connect, disconnect]);

  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
      
      if (!connected && status === 'authenticated' && session?.accessToken) {
        console.log('[Socket] Connection lost, attempting reconnect...');
        connect();
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [status, session?.accessToken, connect]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        connect,
        disconnect,
        subscribeToJob,
        unsubscribeFromJob,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
