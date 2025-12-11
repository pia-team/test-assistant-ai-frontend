"use client";

import { useSocket } from "@/providers/socket-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SocketDebugPage() {
  const { isConnected, connectionStatus } = useSocket();
  const queryClient = useQueryClient();

  const emitFakeJobUpdate = () => {
    const fake = {
      id: "debug-job-" + Date.now(),
      type: "GENERATE_TESTS",
      status: "RUNNING",
      createdAt: new Date().toISOString(),
      completedAt: null,
      userId: "debug",
      username: "debug",
      error: null,
    } as any;

    queryClient.setQueryData(["job", fake.id], fake);
    queryClient.setQueryData(["activeJob", fake.type], fake);
    queryClient.setQueryData(["allJobs"], (old: any[] = []) => [fake, ...old]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Socket Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span>Bağlantı:</span>
          <Badge variant="outline">{String(isConnected)}</Badge>
          <Badge
            className={
              connectionStatus === "connected"
                ? "bg-green-500"
                : connectionStatus === "connecting"
                ? "bg-yellow-500"
                : "bg-red-500"
            }
          >
            {connectionStatus}
          </Badge>
        </div>
        <Button onClick={emitFakeJobUpdate}>Fake job_update ekle</Button>
      </CardContent>
    </Card>
  );
}
