import { apiClient } from '../../services/apiClient';

/** Where a message stands. It only moves forward: pending, read, resolved. */
export type FeedbackStatus = 'pending' | 'read' | 'resolved';

/** A comment or bug report sent from the app, as users-api keeps it. */
export interface FeedbackMessage {
  id: string;
  user_id: string;
  /** Copied when it was sent: it still says who wrote it after the account is gone. */
  handle: string;
  /** False once the account was deleted; a blocked account still has its detail. */
  account_available: boolean;
  message: string;
  device_os: string;
  app_version: string;
  status: FeedbackStatus;
  created_at: string;
}

export interface FeedbackMessagePage {
  items: FeedbackMessage[];
  next_cursor: string | null;
}

/** One status at a time, newest first, in pages of twenty. */
export async function listFeedback(
  status: FeedbackStatus,
  cursor: string | null
): Promise<FeedbackMessagePage> {
  const { data } = await apiClient.get<FeedbackMessagePage>('/admin/feedback', {
    params: cursor ? { status, cursor } : { status },
  });
  return data;
}

export async function markFeedbackRead(id: string): Promise<void> {
  await apiClient.post(`/admin/feedback/${id}/read`);
}

export async function resolveFeedback(id: string): Promise<void> {
  await apiClient.post(`/admin/feedback/${id}/resolve`);
}
