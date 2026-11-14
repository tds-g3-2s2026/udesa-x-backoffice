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

/** An app account's state as users-api stores it. */
export type AccountStatus = 'active' | 'suspended' | 'under_review';

/**
 * What the panel shows for each state. `suspended` reads "Bloqueada": it is
 * the state an administrator's block leaves (E5-H5), whatever the column says.
 */
export const ACCOUNT_STATUS: Record<AccountStatus, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'green' },
  suspended: { label: 'Bloqueada', color: 'red' },
  under_review: { label: 'En revisión', color: 'yellow' },
};

/** An app account as `GET /admin/users/search` and `GET /admin/users/{id}` answer it (E5-H4). */
export interface UserAccount {
  id: string;
  email: string;
  handle: string;
  display_name: string | null;
  /** What the account wrote about itself, `null` if it never wrote anything (E5-H10). */
  bio: string | null;
  status: AccountStatus;
  /** Why and when `status` last changed. Only an administrator's block leaves a reason. */
  status_reason: string | null;
  status_changed_at: string | null;
  is_email_verified: boolean;
  created_at: string;
  /** The last successful login (E5-H9), `null` if the account never logged in since it is recorded. */
  last_login_at: string | null;
}

/**
 * Date and time of the last login, or "Nunca". 24 hour time, as in the audit log.
 */
export const formatLastLogin = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : 'Nunca';

/** Twenty accounts and the cursor for the next page, `null` once there is none. */
export interface UserAccountPage {
  items: UserAccount[];
  next_cursor: string | null;
}

/** The two numbers of an account that live in posts-api. */
export interface AccountCounts {
  followers: number;
  posts: number;
}

/**
 * App accounts whose email or handle contain `query`, newest first. The cursor
 * is opaque: what the previous page returned as `next_cursor`, sent back as is.
 */
export async function searchAccounts(
  query: string,
  cursor: string | null = null
): Promise<UserAccountPage> {
  const { data } = await apiClient.get<UserAccountPage>('/admin/users/search', {
    params: cursor ? { q: query, cursor } : { q: query },
  });
  return data;
}

export async function getAccount(id: string): Promise<UserAccount> {
  const { data } = await apiClient.get<UserAccount>(`/admin/users/${id}`);
  return data;
}

/** From posts-api: the gateway sends `/admin/posts` there and the rest of `/admin` to users-api. */
export async function getAccountCounts(id: string): Promise<AccountCounts> {
  const { data } = await apiClient.get<AccountCounts>(`/admin/posts/accounts/${id}/counts`);
  return data;
}

/**
 * Blocks an app account with a reason (E5-H5). users-api ends every session it
 * has open at once; blocking it again keeps the first reason.
 */
export async function blockAccount(id: string, reason: string): Promise<void> {
  await apiClient.post(`/admin/users/${id}/block`, { reason });
}

/** The text users-api and posts-api write over cleaned content (E5-H10). */
export const REMOVED_BY_MODERATION = '[Contenido eliminado por moderación]';

/**
 * Replaces the biography with `REMOVED_BY_MODERATION` (E5-H10). The name and
 * the sessions of the account stay; asking again changes nothing.
 */
export async function cleanAccountContent(id: string): Promise<void> {
  await apiClient.post(`/admin/users/${id}/clean-content`);
}

/** A post of the account, with the few fields its list shows. */
export interface AccountPost {
  id: string;
  content: string;
  createdAt: string;
  /** The post this one answers, `null` if it answers nothing. */
  parentId: string | null;
  images: { id: string }[];
}

export interface AccountPostPage {
  items: AccountPost[];
  nextCursor: string | null;
}

/**
 * What the account wrote, replies included, newest first and twenty per page
 * (E5-H10). posts-api does not apply the visibility of the account here.
 */
export async function listAccountPosts(
  id: string,
  cursor: string | null = null
): Promise<AccountPostPage> {
  const { data } = await apiClient.get<AccountPostPage>(`/admin/posts/accounts/${id}/posts`, {
    params: cursor ? { cursor } : {},
  });
  return data;
}
