import { signIn } from "@/lib/auth";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ callbackUrl?: string }>;
}) {
    const params = await searchParams;
    const callbackUrl = params.callbackUrl || "/home";

    return (
        <form
            action={async () => {
                "use server";
                await signIn("keycloak", { redirectTo: callbackUrl });
            }}
        >
            <button type="submit" style={{ display: "none" }} autoFocus />
            <script
                dangerouslySetInnerHTML={{
                    __html: `document.forms[0].requestSubmit()`,
                }}
            />
        </form>
    );
}
