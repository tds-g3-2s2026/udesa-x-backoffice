import { apiClient } from '../../services/apiClient';

export interface AccountMetrics {
  active_users: number;
  accounts_under_review: number;
}

export async function fetchAccountMetrics(): Promise<AccountMetrics> {
  const { data } = await apiClient.get<AccountMetrics>('/admin/metrics');
  return data;
}

/** Posts published since the local midnight of whoever is looking. */
export async function fetchPostsToday(): Promise<number> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const { data } = await apiClient.get<{ published: number }>('/admin/posts/metrics', {
    params: { since: midnight.toISOString() },
  });
  return data.published;
}
