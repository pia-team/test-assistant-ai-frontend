import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Keycloak({
            clientId: "orbitant-ui-client",
            clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
            issuer: "https://diam.dnext-pia.com/realms/orbitant-realm",
        }),
    ],
    callbacks: {
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                token.sub = account.providerAccountId;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string;
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
