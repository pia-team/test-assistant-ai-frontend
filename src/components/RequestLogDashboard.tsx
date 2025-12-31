"use client";

import { useState } from "react";
import { useRequestLogs } from "@/hooks/useRequestLogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/locale-context";

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-green-500";
  if (status >= 300 && status < 400) return "bg-blue-500";
  if (status >= 400 && status < 500) return "bg-yellow-500";
  if (status >= 500) return "bg-red-500";
  return "bg-gray-500";
}

function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-blue-500";
    case "POST":
      return "bg-green-500";
    case "PUT":
      return "bg-yellow-500";
    case "DELETE":
      return "bg-red-500";
    case "PATCH":
      return "bg-purple-500";
    default:
      return "bg-gray-500";
  }
}

export function RequestLogDashboard() {
  const { dictionary } = useLocale();
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const { data, isLoading, refetch, isFetching } = useRequestLogs(page, size);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{dictionary.requestLog.title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
          />
          {dictionary.requestLog.refresh}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            {dictionary.requestLog.loading}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      {dictionary.requestLog.time}
                    </th>
                    <th className="text-left p-2">
                      {dictionary.requestLog.method}
                    </th>
                    <th className="text-left p-2">
                      {dictionary.requestLog.path}
                    </th>
                    <th className="text-left p-2">
                      {dictionary.requestLog.status}
                    </th>
                    <th className="text-left p-2">
                      {dictionary.requestLog.duration}
                    </th>
                    <th className="text-left p-2">
                      {dictionary.requestLog.ip}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.content.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-muted-foreground">
                        {formatTime(log.createdAt)}
                      </td>
                      <td className="p-2">
                        <Badge className={getMethodColor(log.method)}>
                          {log.method}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono text-xs max-w-xs truncate">
                        {log.path}
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusColor(log.statusCode)}>
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {formatDuration(log.durationMs)}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {log.clientIp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                {dictionary.requestLog.total.replace(
                  "{count}",
                  String(data?.totalElements || 0),
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm py-1">
                  {dictionary.requestLog.page
                    .replace("{current}", String(page + 1))
                    .replace("{total}", String(data?.totalPages || 1))}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= (data?.totalPages || 1) - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
