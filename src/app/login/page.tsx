"use client";

import { useEffect } from "react";
import { useKeycloak } from "@/providers/keycloak-provider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login, authenticated } = useKeycloak();
  const router = useRouter();

  useEffect(() => {
    if (authenticated) {
      router.push("/overview");
    } else {
      // Auto login or show button?
      // Previous behavior was auto-submit form.
      // Let's call login() automatically.
      login();
    }
  }, [authenticated, login, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Redirecting to login...</p>
    </div>
  );
}
