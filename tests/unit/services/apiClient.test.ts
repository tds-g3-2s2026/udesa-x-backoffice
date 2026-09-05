import { describe, it, expect } from 'vitest';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { toApiError } from '../../../src/services/apiClient';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

const failedRequest = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      data,
      headers,
      config,
    }
  );

describe('toApiError', () => {
  it('maps a Problem Details response field by field', () => {
    const error = toApiError(
      failedRequest(
        429,
        {
          type: 'https://udesa-x.dev/errors/too-many-attempts',
          title: 'Demasiados intentos',
          status: 429,
          detail: 'La cuenta quedó bloqueada temporalmente por 30 minutos',
          traceId: 'abc',
          instance: '/admin/auth/login',
        },
        { 'retry-after': '1800' }
      )
    );

    expect(error).toEqual({
      status: 429,
      code: 'too-many-attempts',
      title: 'Demasiados intentos',
      detail: 'La cuenta quedó bloqueada temporalmente por 30 minutos',
      errors: undefined,
      retryAfterSeconds: 1800,
    });
  });

  it('keeps the field errors of a validation failure', () => {
    const error = toApiError(
      failedRequest(422, {
        type: 'https://udesa-x.dev/errors/validation-failed',
        title: 'La solicitud tiene campos inválidos',
        status: 422,
        detail: 'Revisá los campos indicados y volvé a intentar.',
        errors: [{ field: 'email', message: 'value is not a valid email address' }],
      })
    );

    expect(error.code).toBe('validation-failed');
    expect(error.errors).toEqual([
      { field: 'email', message: 'value is not a valid email address' },
    ]);
  });

  it('folds a response that is not Problem Details into an unknown error', () => {
    const error = toApiError(failedRequest(502, '<html>Bad Gateway</html>'));

    expect(error.status).toBe(502);
    expect(error.code).toBe('unknown');
    expect(error.detail).toContain('502');
  });

  it('reports a network failure when no response arrived', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK', config));

    expect(error).toMatchObject({ status: 0, code: 'network', title: 'No se pudo conectar' });
  });

  it('never throws on something that is not an axios error', () => {
    expect(toApiError(new Error('boom'))).toMatchObject({ status: 0, code: 'unknown' });
  });
});
