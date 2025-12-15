import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

const KEYCLOAK_ISSUER = "https://diam.dnext-pia.com/realms/orbitant-realm";
const KEYCLOAK_CLIENT_ID = "orbitant-ui-client";

// Refresh token function
async function refreshAccessToken(token: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    sub?: string;
    error?: string;
}) {
    try {
        const response = await fetch(`${KEYCLOAK_ISSUER}/protocol/openid-connect/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: KEYCLOAK_CLIENT_ID,
                client_secret: process.env.KEYCLOAK_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken || "",
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error("Token refresh failed:", refreshedTokens);
            throw new Error("RefreshAccessTokenError");
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
            error: undefined,
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Keycloak({
            clientId: KEYCLOAK_CLIENT_ID,
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
            issuer: KEYCLOAK_ISSUER,
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at,
                    sub: account.providerAccountId,
                };
            }

            // Return previous token if not expired (with 60 second buffer)
            const expiresAt = token.expiresAt as number | undefined;
            if (expiresAt && Date.now() < (expiresAt * 1000) - 60000) {
                return token;
            }

            // Token is expired, try to refresh
            console.log("Token expired, attempting refresh...");
            return await refreshAccessToken(token as {
                accessToken?: string;
                refreshToken?: string;
                expiresAt?: number;
                sub?: string;
            });
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
            session.error = token.error as string | undefined;
            if (session.user) {
                session.user.id = token.sub as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/auth/error",
        signOut: "/auth/signout",
    },
    trustHost: true,
    basePath: "/api/auth",
});
