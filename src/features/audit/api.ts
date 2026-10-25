import { apiClient } from '../../services/apiClient';

export interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_id: string;
  actor_email: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
}

export async function listAuditEntries(limit: number, offset: number): Promise<AuditPage> {
  const { data } = await apiClient.get<AuditPage>('/admin/audit', { params: { limit, offset } });
  return data;
}
