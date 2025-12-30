import { io, Socket } from 'socket.io-client';

export interface JobProgressPayload {
  id: string;
  progress: number;
  message?: string;
  stepKey?: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface JobCompletedPayload {
  id: string;
  type: string;
  status: 'COMPLETED';
  resultData: Record<string, unknown>;
  completedAt: string;
  durationMs: number;
}

export interface JobFailedPayload {
  id: string;
  type: string;
  status: 'FAILED';
  errorMessage: string;
  completedAt: string;
}

export interface JobCreatedPayload {
  id: string;
  type: string;
  status: 'PENDING';
  userId: string;
  username: string;
  createdAt: string;
}

export interface JobLogPayload {
  id: string;
  log: string;
  timestamp: number;
}

export interface ConnectedPayload {
  sessionId: string;
  serverTime: string;
}

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:9092';

      // Parse URL to extract base URL and path for socket.io
      // e.g., "https://example.com/socket" -> baseUrl: "https://example.com", path: "/socket/socket.io"
      let baseUrl = socketUrl;
      let socketPath = '/socket.io';

      try {
        const url = new URL(socketUrl);
        baseUrl = url.origin;
        if (url.pathname && url.pathname !== '/') {
          // Extract the custom path and append /socket.io
          // Ensure it starts with / and doesn't end with /
          const cleanPath = url.pathname.replace(/\/$/, '');
          socketPath = cleanPath.endsWith('/socket.io') ? cleanPath : `${cleanPath}/socket.io`;
        }
      } catch (e) {
        console.warn('[Socket] Failed to parse socket URL, using as-is:', socketUrl);
      }

      console.log('[Socket] Connecting to:', baseUrl, 'with path:', socketPath);

      // Send token as query parameter for netty-socketio compatibility
      // (netty-socketio doesn't support socket.io v4 auth object)
      this.socket = io(baseUrl, {
        path: socketPath,
        query: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connected', (data: ConnectedPayload) => {
        console.log('[Socket.ts] Socket connected:', data.sessionId);
        this.reconnectAttempts = 0;
        resolve();
      });

      // Debug: Log ALL incoming events
      this.socket.onAny((eventName, ...args) => {
        console.log('[Socket.ts] Received event:', eventName, JSON.stringify(args));
      });

      this.socket.on('error', (error: { code: string; message: string }) => {
        console.error('Socket error:', error);
        if (error.code === 'AUTH_FAILED') {
          reject(new Error('Authentication failed'));
        }
      });

      this.socket.on('disconnect', (reason: string) => {
        console.log('Socket disconnected:', reason);
      });

      this.socket.on('reconnect_attempt', (attempt: number) => {
        this.reconnectAttempts = attempt;
        console.log(`Reconnect attempt ${attempt}/${this.maxReconnectAttempts}`);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        reject(new Error('Reconnection failed'));
      });

      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  subscribeToJob(jobId: string, callbacks: {
    onCreated?: (data: JobCreatedPayload) => void;
    onStarted?: (data: { id: string; status: string; startedAt: string }) => void;
    onProgress?: (data: JobProgressPayload) => void;
    onCompleted?: (data: JobCompletedPayload) => void;
    onFailed?: (data: JobFailedPayload) => void;
    onStopped?: (data: { id: string; cancelledBy: string; completedAt: string }) => void;
    onLog?: (data: JobLogPayload) => void;
  }) {
    if (!this.socket) return;

    this.socket.emit('subscribe', { room: `job:${jobId}` });

    if (callbacks.onCreated) {
      this.socket.on('job:created', callbacks.onCreated);
    }
    if (callbacks.onStarted) {
      this.socket.on('job:started', callbacks.onStarted);
    }
    if (callbacks.onProgress) {
      this.socket.on('job:progress', callbacks.onProgress);
    }
    if (callbacks.onCompleted) {
      this.socket.on('job:completed', callbacks.onCompleted);
    }
    if (callbacks.onFailed) {
      this.socket.on('job:failed', callbacks.onFailed);
    }
    if (callbacks.onStopped) {
      this.socket.on('job:stopped', callbacks.onStopped);
    }
    if (callbacks.onLog) {
      this.socket.on('job:log', callbacks.onLog);
    }
  }

  unsubscribeFromJob(jobId: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe', { room: `job:${jobId}` });
    // We do NOT call socket.off() here because it would remove the global 
    // listeners established in SocketContext.tsx that we need for app-wide 
    // progress updates. Only the room subscription is terminated.
  }

  subscribeToUserEvents(userId: string, callbacks: {
    onJobCreated?: (data: JobCreatedPayload) => void;
    onJobProgress?: (data: JobProgressPayload) => void;
    onJobCompleted?: (data: JobCompletedPayload) => void;
    onJobFailed?: (data: JobFailedPayload) => void;
  }) {
    if (!this.socket) return;

    this.socket.emit('subscribe', { room: `user:${userId}` });

    if (callbacks.onJobCreated) {
      this.socket.on('job:created', callbacks.onJobCreated);
    }
    if (callbacks.onJobProgress) {
      this.socket.on('job:progress', callbacks.onJobProgress);
    }
    if (callbacks.onJobCompleted) {
      this.socket.on('job:completed', callbacks.onJobCompleted);
    }
    if (callbacks.onJobFailed) {
      this.socket.on('job:failed', callbacks.onJobFailed);
    }
  }

  ping() {
    this.socket?.emit('ping');
  }

  onPong(callback: (data: { serverTime: string }) => void) {
    this.socket?.on('pong', callback);
  }

  subscribeToUserRoom(userId: string) {
    if (!this.socket) return;
    console.log('[Socket.ts] Subscribing to user room:', `user:${userId}`);
    this.socket.emit('subscribe', { room: `user:${userId}` });
  }

  subscribeToAllJobsRoom() {
    if (!this.socket) return;
    this.socket.emit('subscribe', { room: 'jobs:all' });
  }

  joinInjectionRoom(jobId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      const room = `injection:${jobId}`;
      console.log('[Socket.ts] Joining injection room:', room);

      // Set a timeout for the ACK
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for room join ACK'));
      }, 5000);

      this.socket.emit('subscribe', { room }, (response: { status: string; room: string; message?: string }) => {
        clearTimeout(timeout);
        if (response.status === 'subscribed') {
          console.log('[Socket.ts] Successfully joined room:', room);
          resolve();
        } else {
          console.error('[Socket.ts] Failed to join room:', response);
          reject(new Error(response.message || 'Failed to join injection room'));
        }
      });
    });
  }

  leaveInjectionRoom(jobId: string) {
    if (!this.socket) return;
    const room = `injection:${jobId}`;
    console.log('[Socket.ts] Leaving injection room:', room);
    this.socket.emit('unsubscribe', { room });
  }

  onJobCreated(callback: (data: JobCreatedPayload) => void) {
    this.socket?.on('job:created', callback);
  }

  onJobStarted(callback: (data: { id: string; status: string; startedAt: string }) => void) {
    this.socket?.on('job:started', callback);
  }

  onJobProgress(callback: (data: JobProgressPayload) => void) {
    this.socket?.on('job:progress', (data) => {
      console.log('[Socket.ts] RAW job:progress received:', JSON.stringify(data));
      callback(data);
    });
  }

  onJobCompleted(callback: (data: JobCompletedPayload) => void) {
    this.socket?.on('job:completed', callback);
  }

  onJobFailed(callback: (data: JobFailedPayload) => void) {
    this.socket?.on('job:failed', callback);
  }

  onJobStopped(callback: (data: { id: string; cancelledBy: string; completedAt: string }) => void) {
    this.socket?.on('job:stopped', callback);
  }

  onJobLog(callback: (data: JobLogPayload) => void) {
    this.socket?.on('job:log', callback);
  }

  offJobLog() {
    this.socket?.off('job:log');
  }

  offAllJobEvents() {
    if (!this.socket) return;
    this.socket.off('job:created');
    this.socket.off('job:started');
    this.socket.off('job:progress');
    this.socket.off('job:completed');
    this.socket.off('job:failed');
    this.socket.off('job:stopped');
    this.socket.off('job:log');
  }

  // Code Injection Events
  onInjectionStart(callback: (data: { jobId: string; totalFiles: number }) => void) {
    this.socket?.on('injection:start', callback);
  }

  onInjectionProgress(callback: (data: {
    jobId: string;
    currentFile: string;
    currentIndex: number;
    totalFiles: number;
    progress: number;
  }) => void) {
    this.socket?.on('injection:progress', callback);
  }

  onInjectionConflict(callback: (data: {
    jobId: string;
    fileName: string;
    existingContent: string;
  }) => void) {
    this.socket?.on('injection:conflict', callback);
  }

  onInjectionCompleted(callback: (data: {
    jobId: string;
    injectedFiles: Array<{
      fileName: string;
      absolutePath: string;
      bytesWritten: number;
      created: boolean;
      overwritten: boolean;
    }>;
    totalFiles: number;
  }) => void) {
    this.socket?.on('injection:completed', callback);
  }

  onInjectionFailed(callback: (data: { jobId: string; error: string }) => void) {
    this.socket?.on('injection:failed', callback);
  }

  offAllInjectionEvents() {
    if (!this.socket) return;
    this.socket.off('injection:start');
    this.socket.off('injection:progress');
    this.socket.off('injection:conflict');
    this.socket.off('injection:completed');
    this.socket.off('injection:failed');
  }

  disconnect() {
    if (this.socket) {
      this.offAllJobEvents();
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
