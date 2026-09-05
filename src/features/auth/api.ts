import { apiClient } from '../../services/apiClient';

export interface AdminCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function adminLogin(credentials: AdminCredentials): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/admin/auth/login', credentials);
  return data;
}

/** Revokes the current token server side. The bearer comes from the interceptor. */
export async function adminLogout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
