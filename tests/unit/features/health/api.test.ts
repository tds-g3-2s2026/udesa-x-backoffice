import { afterEach, describe, expect, it, vi } from 'vitest';
import { AxiosError, type AxiosAdapter } from 'axios';
import { HEALTH_TIMEOUT_MS, fetchHealth } from '../../../../src/features/health/api';
import { apiClient } from '../../../../src/services/apiClient';

/**
 * A browser request to a service that never answers. It keeps the timeout
 * axios sets on it and fires `ontimeout` like the real one, so the test goes
 * through axios' own XHR adapter rather than around it.
 */
class HungRequest {
  timeout = 0;
  ontimeout: (() => void) | null = null;
  open() {}
  setRequestHeader() {}
  getAllResponseHeaders() {
    return '';
  }
  abort() {}
  send() {
    if (this.timeout > 0) {
      setTimeout(() => this.ontimeout?.(), this.timeout);
    }
  }
}

const answering =
  (status: number, data: unknown, seen: string[] = []): AxiosAdapter =>
  async (config) => {
    seen.push(config.url ?? '');
    const response = { status, statusText: '', data, headers: {}, config };
    if (status !== 200) {
      throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, {}, response);
    }
    return response;
  };

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('fetchHealth', () => {
  it('E5-H11.CA1 reads the health of a service through the gateway', async () => {
    const seen: string[] = [];
    apiClient.defaults.adapter = answering(200, { status: 'ok', version: '0.4.0' }, seen);

    const health = await fetchHealth('posts-api');

    expect(seen).toEqual(['/health/posts-api']);
    expect(health.version).toBe('0.4.0');
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('rejects when the gateway reports the service as down', async () => {
    apiClient.defaults.adapter = answering(503, { status: 'down' });

    await expect(fetchHealth('users-api')).rejects.toMatchObject({ response: { status: 503 } });
  });

  it('E5-H11.CA3 gives up on a service that does not answer within 5 seconds', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('XMLHttpRequest', HungRequest);

    let outcome: unknown;
    const pending = fetchHealth('users-api').catch((error: unknown) => (outcome = error));

    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS - 1);
    expect(outcome).toBeUndefined();

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(outcome).toMatchObject({ code: 'ECONNABORTED' });
  });
});
