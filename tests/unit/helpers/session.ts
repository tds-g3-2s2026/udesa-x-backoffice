import type { AdminRole } from '../../../src/features/auth/token';
import { useAuthStore } from '../../../src/stores/authStore';

const base64url = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * A JWT shaped like the ones users-api signs. The signature is garbage on
 * purpose: the frontend never verifies it, only reads the claims.
 */
export const fakeToken = (claims: { sub?: string; role?: string; exp?: number } = {}) =>
  [
    base64url(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })),
    base64url(
      JSON.stringify({
        sub: '11111111-1111-4111-8111-111111111111',
        role: 'superadmin',
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
        ...claims,
      })
    ),
    'signature',
  ].join('.');

export const signInAs = (role: AdminRole, email = `${role}@udesa.edu.ar`) =>
  useAuthStore.getState().signIn({ token: fakeToken({ role }), email });

export const resetSession = () => {
  localStorage.clear();
  useAuthStore.getState().restore();
};
