import { apiClient } from '../../services/apiClient';

/** The services the gateway reports on, in the order the screen lists them. */
export const SERVICES = ['users-api', 'posts-api', 'api-gateway'] as const;

export type ServiceName = (typeof SERVICES)[number];

/** Past this a service counts as down, whatever it answers later. */
export const HEALTH_TIMEOUT_MS = 5000;

export interface ServiceHealth {
  version: string;
  latencyMs: number;
}

/** Resolves only when the service is up: any other status, a network error or the timeout rejects. */
export async function fetchHealth(service: ServiceName): Promise<ServiceHealth> {
  const started = performance.now();
  const { data } = await apiClient.get<{ status: string; version: string }>(`/health/${service}`, {
    timeout: HEALTH_TIMEOUT_MS,
  });
  return { version: data.version, latencyMs: Math.round(performance.now() - started) };
}
