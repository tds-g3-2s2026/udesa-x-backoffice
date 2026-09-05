import axios, { isAxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * What every screen gets when a request fails, whatever failed.
 *
 * The backend answers with Problem Details (RFC 9457); network failures and
 * unexpected bodies are folded into the same shape so the UI has one path.
 */
export interface ApiError {
  /** HTTP status, or 0 when no response arrived. */
  status: number;
  /** Last segment of the Problem Details `type`, or `network` / `unknown`. */
  code: string;
  title: string;
  detail: string;
  errors?: ApiFieldError[];
  /** From the `Retry-After` header, when the server sent one. */
  retryAfterSeconds?: number;
}

interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ApiFieldError[];
}

const isProblemDetails = (body: unknown): body is ProblemDetails =>
  typeof body === 'object' &&
  body !== null &&
  typeof (body as ProblemDetails).type === 'string' &&
  typeof (body as ProblemDetails).title === 'string' &&
  typeof (body as ProblemDetails).detail === 'string';

const NETWORK_ERROR: ApiError = {
  status: 0,
  code: 'network',
  title: 'No se pudo conectar',
  detail: 'Revisá tu conexión e intentá de nuevo',
};

export function toApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) {
    return { status: 0, code: 'unknown', title: 'Error inesperado', detail: 'Intentá de nuevo' };
  }

  const response = error.response;
  if (!response) {
    return NETWORK_ERROR;
  }

  const retryAfter = Number(response.headers?.['retry-after']);
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;

  if (!isProblemDetails(response.data)) {
    return {
      status: response.status,
      code: 'unknown',
      title: 'Error inesperado',
      detail: `El servidor respondió con un error (${response.status})`,
      retryAfterSeconds,
    };
  }

  const body = response.data;
  return {
    status: response.status,
    code: body.type.slice(body.type.lastIndexOf('/') + 1),
    title: body.title,
    detail: body.detail,
    errors: body.errors?.length ? body.errors : undefined,
    retryAfterSeconds,
  };
}
