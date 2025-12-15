import { redirect } from "next/navigation";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const params = await searchParams;
    const callbackUrl = params.callbackUrl || "/home";
    
    // Automatically redirect to Keycloak login
    const signInUrl = `/api/auth/signin/keycloak?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    redirect(signInUrl);
}
