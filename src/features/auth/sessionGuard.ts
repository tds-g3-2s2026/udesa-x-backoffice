import { type AxiosInstance, isAxiosError } from 'axios';
import { useAuthStore } from '../../stores/authStore';

/**
 * Ends the session when the backend stops accepting the token.
 *
 * A 401 means expired or revoked: nothing the user can fix from the current
 * screen, so the session is dropped and the shell sends them to the login.
 * A 403 is left alone, that is a permission problem on a valid session.
 */
export function attachSessionGuard(client: AxiosInstance): number {
  return client.interceptors.response.use(undefined, (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  });
}
