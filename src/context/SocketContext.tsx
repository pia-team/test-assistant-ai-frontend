'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { socketService, JobProgressPayload, JobCompletedPayload, JobFailedPayload, JobCreatedPayload } from '@/lib/socket';

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

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    if (!session?.accessToken) {
      console.warn('No access token available for socket connection');
      return;
    }

    try {
      await socketService.connect(session.accessToken);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect to socket:', error);
      setIsConnected(false);
    }
  }, [session?.accessToken]);

  const disconnect = useCallback(() => {
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
      setIsConnected(socketService.isConnected());
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

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
