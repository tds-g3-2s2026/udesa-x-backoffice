import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../../src/stores/authStore';
import { fakeToken, resetSession } from '../helpers/session';

describe('authStore', () => {
  beforeEach(resetSession);

  it('signs in from a token and keeps the session for the next load', () => {
    const token = fakeToken({ sub: 'user-1', role: 'moderator' });

    useAuthStore.getState().signIn({ token, email: 'mod@udesa.edu.ar' });

    expect(useAuthStore.getState().user).toEqual({
      id: 'user-1',
      email: 'mod@udesa.edu.ar',
      role: 'moderator',
    });
    expect(localStorage.getItem('access_token')).toBe(token);

    useAuthStore.setState({ token: null, user: null });
    useAuthStore.getState().restore();
    expect(useAuthStore.getState().user?.role).toBe('moderator');
  });

  it('drops a persisted session whose token expired', () => {
    localStorage.setItem('access_token', fakeToken({ exp: Math.floor(Date.now() / 1000) - 1 }));
    localStorage.setItem('session_email', 'admin@udesa.edu.ar');

    useAuthStore.getState().restore();

    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('refuses a token that does not carry an administrator role', () => {
    expect(() =>
      useAuthStore.getState().signIn({ token: fakeToken({ role: 'user' }), email: 'a@b.c' })
    ).toThrow();
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('signOut clears the store and the storage', () => {
    useAuthStore.getState().signIn({ token: fakeToken(), email: 'admin@udesa.edu.ar' });

    useAuthStore.getState().signOut();

    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('session_email')).toBeNull();
  });
});
