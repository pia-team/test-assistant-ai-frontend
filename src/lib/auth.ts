// Mock auth library to replace NextAuth during Keycloak migration
// This allows existing server actions to compile, though they won't strictly validate tokens server-side
// until a new verification method is implemented.

export const handlers = { GET: () => { }, POST: () => { } };
export const auth = async () => ({
    user: { id: "mock-user" },
    accessToken: "mock-token-from-server-action-placeholder"
});
export const signIn = async () => { };
export const signOut = async () => { };
