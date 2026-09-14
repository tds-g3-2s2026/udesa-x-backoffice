import { create } from 'zustand';
import { type AdminRole, decodeClaims, isAdminRole, isExpired } from '../features/auth/token';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
}

export interface Session {
  token: string;
  /** Not in the token: kept from the login form so the shell can show it. */
  email: string;
  /**
   * From the login response, not from the token. While it is on the backend
   * answers 403 to everything except changing the password, so the app has no
   * reason to show anything else.
   */
  mustChangePassword?: boolean;
}

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  mustChangePassword: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
  /** Re-reads the persisted session, dropping it if it expired meanwhile. */
  restore: () => void;
}

// The request interceptor in `services/apiClient.ts` reads this same key.
const TOKEN_KEY = 'access_token';
const EMAIL_KEY = 'session_email';
const MUST_CHANGE_KEY = 'must_change_password';

const EMPTY = { token: null, user: null, mustChangePassword: false };

function toUser(session: Session): AdminUser | null {
  const claims = decodeClaims(session.token);
  if (!claims || isExpired(claims) || !isAdminRole(claims.role)) {
    return null;
  }
  return { id: claims.sub, email: session.email, role: claims.role };
}

function readStoredSession(): Pick<AuthState, 'token' | 'user' | 'mustChangePassword'> {
  const token = localStorage.getItem(TOKEN_KEY);
  const email = localStorage.getItem(EMAIL_KEY);
  if (!token || !email) {
    return EMPTY;
  }

  const user = toUser({ token, email });
  if (!user) {
    // Expired or not an administrator's token: nothing to resume, and leaving
    // it around would only send a request destined to fail.
    clearStoredSession();
    return EMPTY;
  }
  return { token, user, mustChangePassword: localStorage.getItem(MUST_CHANGE_KEY) === 'true' };
}

function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(MUST_CHANGE_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  ...readStoredSession(),
  signIn: (session) => {
    const user = toUser(session);
    if (!user) {
      throw new Error('The token is not a valid administrator session');
    }
    const mustChangePassword = session.mustChangePassword === true;
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(EMAIL_KEY, session.email);
    localStorage.setItem(MUST_CHANGE_KEY, String(mustChangePassword));
    set({ token: session.token, user, mustChangePassword });
  },
  signOut: () => {
    clearStoredSession();
    set(EMPTY);
  },
  restore: () => set(readStoredSession()),
}));
