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

export interface DailyRegistrations {
  /** The day as `YYYY-MM-DD`, in the offset of the request. */
  date: string;
  registrations: number;
}

/** How many days the chart draws, today included. */
export const REGISTRATION_DAYS = 7;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The moment as ISO 8601 in the local offset. `toISOString` always answers in UTC, and
 * users-api starts each day where the offset of `since` says: from UTC midnight, the
 * days of someone east of Greenwich would be labelled one day early.
 */
function toLocalIsoString(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`
  );
}

/** Accounts created per day over the last week, counting days from the local midnight of whoever is looking. */
export async function fetchRegistrations(): Promise<DailyRegistrations[]> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (REGISTRATION_DAYS - 1));
  const { data } = await apiClient.get<{ days: DailyRegistrations[] }>(
    '/admin/metrics/registrations',
    { params: { since: toLocalIsoString(since) } }
  );
  return data.days;
}
