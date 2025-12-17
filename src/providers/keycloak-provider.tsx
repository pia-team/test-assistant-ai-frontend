"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import Keycloak from "keycloak-js";

interface KeycloakContextType {
    authenticated: boolean;
    keycloak: Keycloak | null;
    token: string | undefined;
    logout: () => void;
    login: () => void;
}

const KeycloakContext = createContext<KeycloakContextType>({
    authenticated: false,
    keycloak: null,
    token: undefined,
    logout: () => { },
    login: () => { },
});

export const useKeycloak = () => useContext(KeycloakContext);

export const KeycloakProvider = ({ children }: { children: React.ReactNode }) => {
    const [keycloak, setKeycloak] = useState<Keycloak | null>(null);
    const [authenticated, setAuthenticated] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const initKeycloak = async () => {
            // Configuration from environment variables or fallback to known previous config
            const keycloakInstance = new Keycloak({
                url: process.env.NEXT_PUBLIC_KEYCLOAK_URL || "https://diam.dnext-pia.com",
                realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM || "orbitant-realm",
                clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || "orbitant-ui-client",
            });

            const isPublicPage = window.location.pathname.startsWith("/auth/signout");
            const initOptions = {
                onLoad: isPublicPage ? "check-sso" : "login-required",
                checkLoginIframe: false,
                pkceMethod: "S256",
            };

            try {
                // @ts-ignore - Keycloak types might mismatch slightly for init options but strings are valid
                const authenticated = await keycloakInstance.init(initOptions);

                setKeycloak(keycloakInstance);
                setAuthenticated(authenticated);
                setInitialized(true);
            } catch (error) {
                console.error("Keycloak initialization failed:", error);
                setInitialized(true);
            }
        };

        initKeycloak();
    }, []);

    const login = () => {
        keycloak?.login();
    };

    const logout = () => {
        keycloak?.logout({
            redirectUri: window.location.origin + "/auth/signout", // Redirect to signout page
        });
    };

    if (!initialized) {
        return <div className="flex h-screen items-center justify-center">Loading authentication...</div>;
    }

    return (
        <KeycloakContext.Provider
            value={{
                authenticated,
                keycloak,
                token: keycloak?.token,
                login,
                logout,
            }}
        >
            {children}
        </KeycloakContext.Provider>
    );
};
