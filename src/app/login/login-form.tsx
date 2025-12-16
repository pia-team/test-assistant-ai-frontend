"use client";

import { useEffect, useRef } from "react";

interface LoginFormProps {
    action: () => Promise<void>;
}

export function LoginForm({ action }: LoginFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        // Auto-submit the form on mount
        formRef.current?.requestSubmit();
    }, []);

    return (
        <form ref={formRef} action={action}>
            <p className="text-muted-foreground">Redirecting to login...</p>
            <noscript>
                <button type="submit">Login with Keycloak</button>
            </noscript>
        </form>
    );
}
