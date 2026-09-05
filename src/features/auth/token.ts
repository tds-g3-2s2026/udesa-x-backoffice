export type AdminRole = 'moderator' | 'superadmin';

export interface TokenClaims {
  sub: string;
  role: string;
  exp: number;
}

export const isAdminRole = (role: string): role is AdminRole =>
  role === 'moderator' || role === 'superadmin';

/**
 * Reads the payload of an access token without verifying it.
 *
 * The signature is the backend's business: every request carries the token
 * and the backend rejects a forged one. Here the claims only drive what the
 * UI shows, which a forged token could not turn into data anyway.
 */
export function decodeClaims(token: string): TokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (typeof payload !== 'object' || payload === null) {
      return null;
    }
    const { sub, role, exp } = payload as Record<string, unknown>;
    if (typeof sub !== 'string' || typeof role !== 'string' || typeof exp !== 'number') {
      return null;
    }
    return { sub, role, exp };
  } catch {
    return null;
  }
}

/** `exp` is in seconds since the epoch; `nowMs` is what `Date.now()` returns. */
export const isExpired = (claims: TokenClaims, nowMs: number = Date.now()): boolean =>
  claims.exp * 1000 <= nowMs;
