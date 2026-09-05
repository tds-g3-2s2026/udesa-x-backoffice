import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../../../src/router';
import { useAuthStore } from '../../../../src/stores/authStore';
import { type LoginResponse, adminLogin } from '../../../../src/features/auth/api';
import { renderWithProviders } from '../../helpers/render';
import { fakeToken, resetSession } from '../../helpers/session';

vi.mock('../../../../src/features/auth/api', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
}));

const mockedLogin = vi.mocked(adminLogin);

const problem = (status: number, code: string, detail: string, headers = {}) => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers,
      config,
      data: {
        type: `https://udesa-x.dev/errors/${code}`,
        title: 'No se pudo iniciar sesión',
        status,
        detail,
      },
    }
  );
};

const renderLogin = (search = '') => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [`/login${search}`] }),
  });
  renderWithProviders(<RouterProvider router={router} />);
  return router;
};

const submit = (email: string, password: string) => {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Contraseña/), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
};

describe('LoginPage', () => {
  beforeEach(() => {
    resetSession();
    mockedLogin.mockReset();
  });

  it('validates the fields before calling the backend', async () => {
    renderLogin();
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('sin-arroba', '');

    expect(await screen.findByText('Ingresá un email válido')).toBeInTheDocument();
    expect(screen.getByText('Ingresá tu contraseña')).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it('signs in and lands on the page the visitor was heading to', async () => {
    const token = fakeToken({ role: 'superadmin' });
    mockedLogin.mockResolvedValue({ access_token: token, token_type: 'bearer', expires_in: 900 });
    const router = renderLogin('?redirect=%2Fhealth');
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('admin@udesa.edu.ar', 'Admin1234');

    await waitFor(() => expect(router.state.location.pathname).toBe('/health'));
    expect(mockedLogin).toHaveBeenCalledWith({
      email: 'admin@udesa.edu.ar',
      password: 'Admin1234',
    });
    expect(useAuthStore.getState().user).toMatchObject({
      email: 'admin@udesa.edu.ar',
      role: 'superadmin',
    });
    expect(
      await screen.findByRole('heading', { name: 'Microservices Health' })
    ).toBeInTheDocument();
  });

  it('ignores a redirect that points outside the app', async () => {
    mockedLogin.mockResolvedValue({
      access_token: fakeToken(),
      token_type: 'bearer',
      expires_in: 900,
    });
    const router = renderLogin('?redirect=https%3A%2F%2Fevil.example');
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('admin@udesa.edu.ar', 'Admin1234');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows the backend message on wrong credentials and keeps the session empty', async () => {
    mockedLogin.mockRejectedValue(problem(401, 'invalid-credentials', 'Credenciales inválidas'));
    renderLogin();
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('admin@udesa.edu.ar', 'Incorrecta1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas');
    expect(useAuthStore.getState().token).toBeNull();
  });

  it('shows the lockout message with its wait time', async () => {
    mockedLogin.mockRejectedValue(
      problem(429, 'too-many-attempts', 'La cuenta quedó bloqueada temporalmente por 30 minutos', {
        'retry-after': '1800',
      })
    );
    renderLogin();
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('admin@udesa.edu.ar', 'Admin1234');

    expect(await screen.findByRole('alert')).toHaveTextContent('30 minutos');
  });

  it('tells a regular user this account has no access', async () => {
    mockedLogin.mockRejectedValue(
      problem(403, 'not-an-administrator', 'Esta cuenta no tiene acceso al backoffice')
    );
    renderLogin();
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('alumno@udesa.edu.ar', 'Contrasena1');

    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene acceso al backoffice');
  });

  it('blocks the form while the request is in flight', async () => {
    // Executor form: the project targets lib ES2023, without Promise.withResolvers.
    let finish: (value: LoginResponse) => void = () => {};
    mockedLogin.mockReturnValue(new Promise<LoginResponse>((resolve) => (finish = resolve)));
    renderLogin();
    await screen.findByRole('button', { name: 'Ingresar' });

    submit('admin@udesa.edu.ar', 'Admin1234');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Ingresar' })).toBeDisabled());
    expect(screen.getByLabelText(/Email/)).toBeDisabled();
    finish({ access_token: fakeToken(), token_type: 'bearer', expires_in: 900 });
    await waitFor(() => expect(useAuthStore.getState().user).not.toBeNull());
  });
});
