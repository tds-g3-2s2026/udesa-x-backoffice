import { describe, it, expect, beforeEach } from 'vitest';
import axios, { AxiosError, type AxiosAdapter } from 'axios';
import { attachSessionGuard } from '../../../../src/features/auth/sessionGuard';
import { useAuthStore } from '../../../../src/stores/authStore';
import { resetSession, signInAs } from '../../helpers/session';

/** An axios instance whose every request fails with the given status. */
const clientAnswering = (status: number) => {
  const adapter: AxiosAdapter = (config) => {
    const response = { status, statusText: '', data: {}, headers: {}, config };
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        'ERR_BAD_REQUEST',
        config,
        {},
        response
      )
    );
  };
  const client = axios.create({ adapter });
  attachSessionGuard(client);
  return client;
};

describe('attachSessionGuard', () => {
  beforeEach(() => {
    resetSession();
    signInAs('superadmin');
  });

  it('signs out when the backend answers 401', async () => {
    await expect(clientAnswering(401).get('/anything')).rejects.toThrow();

    expect(useAuthStore.getState().user).toBeNull();
  });

  it('leaves the session alone on 403', async () => {
    await expect(clientAnswering(403).get('/anything')).rejects.toThrow();

    expect(useAuthStore.getState().user?.role).toBe('superadmin');
  });
});
