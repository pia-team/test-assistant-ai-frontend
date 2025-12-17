import { io, Socket } from 'socket.io-client';

export interface JobProgressPayload {
  id: string;
  progress: number;
  message?: string;
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
      
      // Send token as query parameter for netty-socketio compatibility
      // (netty-socketio doesn't support socket.io v4 auth object)
      this.socket = io(socketUrl, {
        query: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connected', (data: ConnectedPayload) => {
        console.log('Socket connected:', data.sessionId);
        this.reconnectAttempts = 0;
        resolve();
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
  }

  unsubscribeFromJob(jobId: string) {
    if (!this.socket) return;

    this.socket.emit('unsubscribe', { room: `job:${jobId}` });
    this.socket.off('job:created');
    this.socket.off('job:started');
    this.socket.off('job:progress');
    this.socket.off('job:completed');
    this.socket.off('job:failed');
    this.socket.off('job:stopped');
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
    this.socket.emit('subscribe', { room: `user:${userId}` });
  }

  subscribeToAllJobsRoom() {
    if (!this.socket) return;
    this.socket.emit('subscribe', { room: 'jobs:all' });
  }

  onJobCreated(callback: (data: JobCreatedPayload) => void) {
    this.socket?.on('job:created', callback);
  }

  onJobStarted(callback: (data: { id: string; status: string; startedAt: string }) => void) {
    this.socket?.on('job:started', callback);
  }

  onJobProgress(callback: (data: JobProgressPayload) => void) {
    this.socket?.on('job:progress', callback);
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

  offAllJobEvents() {
    if (!this.socket) return;
    this.socket.off('job:created');
    this.socket.off('job:started');
    this.socket.off('job:progress');
    this.socket.off('job:completed');
    this.socket.off('job:failed');
    this.socket.off('job:stopped');
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
