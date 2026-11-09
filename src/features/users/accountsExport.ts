import { apiClient } from '../../services/apiClient';

/**
 * Downloads every account the search finds for `query`, as the CSV users-api
 * builds (E5-H8). Superadmin only. Asked through the client and not with a
 * plain link, so the request carries the token like any other.
 */
export async function downloadAccounts(query: string): Promise<void> {
  const { data } = await apiClient.get<Blob>('/admin/users/export.csv', {
    params: { q: query },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cuentas.csv';
  link.click();
  URL.revokeObjectURL(url);
}
