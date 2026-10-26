import { apiClient } from '../../services/apiClient';

/** The closed list of E3-H5 CA.1, as posts-api stores it. */
export type ReportReason = 'spam' | 'harassment' | 'inappropriate_content' | 'impersonation';

/** The same labels the app shows when somebody reports. */
export const REPORT_REASON: Record<ReportReason, string> = {
  spam: 'Spam',
  harassment: 'Acoso',
  inappropriate_content: 'Contenido inapropiado',
  impersonation: 'Suplantación de identidad',
};

/** One account of the inbox with what is still pending about it (E5-H7). */
export interface ReportCase {
  userId: string;
  handle: string | null;
  /** Different people who reported it: what orders the inbox. */
  distinctReporters: number;
  reports: number;
  lastReportedAt: string;
  reasons: ReportReason[];
}

export interface ReportCasePage {
  items: ReportCase[];
  nextCursor: string | null;
}

/**
 * The inbox in the order posts-api decides: most different reporters first.
 * Under `/admin/posts` because the gateway sends that prefix to posts-api.
 */
export async function listCases(cursor: string | null = null): Promise<ReportCasePage> {
  const { data } = await apiClient.get<ReportCasePage>('/admin/posts/reports/cases', {
    params: cursor ? { cursor } : {},
  });
  return data;
}

/** The reports were unfounded: they leave the inbox and the account is released. */
export async function dismissCase(userId: string): Promise<void> {
  await apiClient.post(`/admin/posts/reports/cases/${userId}/dismiss`);
}

/** The case was dealt with: its reports leave the inbox as resolved. */
export async function resolveCase(userId: string): Promise<void> {
  await apiClient.post(`/admin/posts/reports/cases/${userId}/resolve`);
}

/**
 * The block of E5-H5 in users-api. Written here again and not imported from
 * `features/users`: a feature does not import another's files (README).
 */
export async function suspendAccount(userId: string, reason: string): Promise<void> {
  await apiClient.post(`/admin/users/${userId}/block`, { reason });
}
