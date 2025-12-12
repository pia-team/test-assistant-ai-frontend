'use client';

import { useQuery } from '@tanstack/react-query';

interface RequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  clientIp: string;
  userAgent: string;
  createdAt: string;
  userId?: string;
}

interface RequestLogsResponse {
  content: RequestLog[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

async function fetchRequestLogs(page: number, size: number, method?: string): Promise<RequestLogsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
  });
  
  if (method) {
    params.append('method', method);
  }

  const response = await fetch(`/api/request-logs?${params}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch request logs');
  }

  return response.json();
}

export function useRequestLogs(page = 0, size = 50, method?: string) {
  return useQuery({
    queryKey: ['requestLogs', page, size, method],
    queryFn: () => fetchRequestLogs(page, size, method),
    refetchInterval: 5000,
  });
}

export function useRequestLog(id: string) {
  return useQuery({
    queryKey: ['requestLog', id],
    queryFn: async () => {
      const response = await fetch(`/api/request-logs/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch request log');
      }
      return response.json();
    },
    enabled: !!id,
  });
}
