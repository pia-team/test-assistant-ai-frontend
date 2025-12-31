import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Upload, Play, Activity, Wifi, WifiOff } from "lucide-react";
import { JobDashboard } from "./job-dashboard";
import { Badge } from "@/components/ui/badge";

export default async function HomePage() {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const activity =
    (dict as Record<string, Record<string, string>>).activity || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">
              {activity.title || "Test Activities"}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {activity.subtitle ||
              "Real-time status and history of all test operations"}
          </p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/generate-tests">
          <Card className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 group-hover:scale-110 transition-transform">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {dict.nav?.generateTests || "Generate Tests"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered test generation
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/upload-json">
          <Card className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {dict.nav?.uploadJson || "Upload JSON"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  JSON/HAR file analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/test-run">
          <Card className="group hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {dict.nav?.testRun || "Run Tests"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Execute Playwright tests
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Job Dashboard */}
      <div className="max-w-full">
        <JobDashboard />
      </div>
    </div>
  );
}
