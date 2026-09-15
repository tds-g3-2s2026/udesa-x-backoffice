import { apiClient } from '../../services/apiClient';

/** The two roles this screen can hand out. `user` belongs to the app, not here. */
export type AdministratorRole = 'moderator' | 'superadmin';

/**
 * `null` once the owner chose their own password; until then the backend says
 * whether the temporary one is still usable. The screen only reads it.
 */
export type TemporaryPasswordStatus = 'pending' | 'expired';

export interface Administrator {
  id: string;
  email: string;
  handle: string;
  role: string;
  temporary_password_status: TemporaryPasswordStatus | null;
  temporary_password_expires_at: string | null;
}

export interface NewAdministrator {
  email: string;
  handle: string;
  role: AdministratorRole;
}

/**
 * The account plus the password it was handed. The backend keeps no copy, so
 * this is the only response that ever carries it.
 */
export interface AdministratorCredential {
  id: string;
  email: string;
  handle: string;
  role: string;
  temporary_password: string;
}

export async function listAdministrators(): Promise<Administrator[]> {
  const { data } = await apiClient.get<Administrator[]>('/admin/users');
  return data;
}

export async function createAdministrator(
  administrator: NewAdministrator
): Promise<AdministratorCredential> {
  const { data } = await apiClient.post<AdministratorCredential>('/admin/users', administrator);
  return data;
}

/** A new temporary password for an account that never used the first one. */
export async function resetTemporaryPassword(id: string): Promise<AdministratorCredential> {
  const { data } = await apiClient.post<AdministratorCredential>(
    `/admin/users/${id}/reset-temporary-password`
  );
  return data;
}
