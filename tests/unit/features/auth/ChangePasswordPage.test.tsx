import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../../../src/router';
import { useAuthStore } from '../../../../src/stores/authStore';
import { changePassword } from '../../../../src/features/auth/api';
import { renderWithProviders } from '../../helpers/render';
import { fakeToken, resetSession, signInAs } from '../../helpers/session';

vi.mock('../../../../src/features/auth/api', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
  changePassword: vi.fn(),
}));

const mockedChange = vi.mocked(changePassword);

const renderAt = (path: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  renderWithProviders(<RouterProvider router={router} />);
  return router;
};

/**
 * Signs in the way the login does when the backend reports a temporary
 * password. The role is `superadmin` so the guard has only one reason to
 * move this session: a moderator is kept out of `/users` regardless.
 */
const signInWithTemporaryPassword = () =>
  useAuthStore.getState().signIn({
    token: fakeToken({ role: 'superadmin' }),
    email: 'nueva@udesa.edu.ar',
    mustChangePassword: true,
  });

const fillForm = (current: string, chosen: string, repeated = chosen) => {
  fireEvent.change(screen.getByLabelText(/Contraseña temporal/), { target: { value: current } });
  fireEvent.change(screen.getByLabelText(/Nueva contraseña/), { target: { value: chosen } });
  fireEvent.change(screen.getByLabelText(/Repetí la nueva contraseña/), {
    target: { value: repeated },
  });
};

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    resetSession();
    mockedChange.mockReset();
  });

  it('sends an account on a temporary password here from anywhere else', async () => {
    signInWithTemporaryPassword();

    const router = renderAt('/users');

    await waitFor(() => expect(router.state.location.pathname).toBe('/change-password'));
    expect(await screen.findByRole('heading', { name: 'Elegí tu contraseña' })).toBeInTheDocument();
  });

  it('has nothing to offer an account that already chose its password', async () => {
    signInAs('superadmin');

    const router = renderAt('/change-password');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('rejects a password the backend would reject anyway', async () => {
    signInWithTemporaryPassword();
    renderAt('/change-password');
    await screen.findByRole('button', { name: 'Cambiar contraseña' });

    fillForm('Temporal123', 'minuscula1');
    submit();

    expect(
      await screen.findByText('La contraseña debe tener al menos una mayúscula')
    ).toBeInTheDocument();
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('refuses to submit when the confirmation does not match', async () => {
    signInWithTemporaryPassword();
    renderAt('/change-password');
    await screen.findByRole('button', { name: 'Cambiar contraseña' });

    fillForm('Temporal123', 'Elegida2026', 'Elegida2027');
    submit();

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mockedChange).not.toHaveBeenCalled();
  });

  it('closes the session once the password changed, because the backend revoked it', async () => {
    signInWithTemporaryPassword();
    mockedChange.mockResolvedValue(undefined);
    renderAt('/change-password');
    await screen.findByRole('button', { name: 'Cambiar contraseña' });

    fillForm('Temporal123', 'Elegida2026');
    submit();

    expect(await screen.findByText(/se cerraron todas las sesiones/)).toBeInTheDocument();
    expect(mockedChange).toHaveBeenCalledWith({
      current_password: 'Temporal123',
      password: 'Elegida2026',
      password_confirmation: 'Elegida2026',
    });
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('must_change_password')).toBeNull();
  });

  it('shows the backend message when the temporary password is wrong', async () => {
    signInWithTemporaryPassword();
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    mockedChange.mockRejectedValue(
      new AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        config,
        {},
        {
          status: 400,
          statusText: '',
          headers: {},
          config,
          data: {
            type: 'https://udesa-x.dev/errors/invalid-credentials',
            title: 'No se pudo cambiar la contraseña',
            status: 400,
            detail: 'La contraseña actual no es correcta',
          },
        }
      )
    );
    renderAt('/change-password');
    await screen.findByRole('button', { name: 'Cambiar contraseña' });

    fillForm('Equivocada1', 'Elegida2026');
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La contraseña actual no es correcta'
    );
    expect(useAuthStore.getState().token).not.toBeNull();
  });
});
