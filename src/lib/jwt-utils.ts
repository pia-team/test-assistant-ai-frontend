/**
 * JWT utility functions for extracting claims from tokens
 */

/**
 * Extract the Keycloak user ID (sub claim) from a JWT token
 * @param token JWT access token
 * @returns The keycloak ID (sub claim) or null if extraction fails
 */
export function getKeycloakIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    // Decode payload (second part) - handle URL-safe base64
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );

    // Return 'sub' claim (Keycloak subject ID)
    return payload.sub || null;
  } catch (error) {
    console.error("[JWT] Failed to extract keycloakId from token:", error);
    return null;
  }
}

/**
 * Extract username from JWT token
 * @param token JWT access token
 * @returns The preferred_username claim or null
 */
export function getUsernameFromToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    return payload.preferred_username || payload.name || null;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired
 * @param token JWT access token
 * @returns true if expired, false if valid, null if cannot determine
 */
export function isTokenExpired(token: string): boolean | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (!payload.exp) {
      return null;
    }

    // exp is in seconds, Date.now() is in milliseconds
    return Date.now() >= payload.exp * 1000;
  } catch {
    return null;
  }
}
