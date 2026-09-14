import { apiClient } from '../../services/apiClient';

export interface AdminCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** The account is on a temporary password and cannot do anything else yet. */
  must_change_password: boolean;
}

export interface PasswordChange {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export async function adminLogin(credentials: AdminCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/admin/auth/login', credentials);
  return data;
}

/** Revokes the current token server side. The bearer comes from the interceptor. */
export async function adminLogout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/**
 * Replaces the password of the signed-in account.
 *
 * Succeeding revokes every session of the account, this one included, so the
 * caller has to send the person back to the login instead of carrying on.
 */
export async function changePassword(change: PasswordChange): Promise<void> {
  await apiClient.post('/me/change-password', change);
}
