import { RequestLogDashboard } from '@/components/RequestLogDashboard';

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Request Monitoring</h1>
        <p className="text-muted-foreground">
          View and analyze API request logs in real-time
        </p>
      </div>
      <RequestLogDashboard />
    </div>
  );
}
