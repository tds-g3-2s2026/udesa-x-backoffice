import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { UsersPage } from '../../../../src/features/users/pages/UsersPage';
import {
  type Administrator,
  createAdministrator,
  listAdministrators,
  resetTemporaryPassword,
} from '../../../../src/features/users/api';
import { renderWithProviders } from '../../helpers/render';

vi.mock('../../../../src/features/users/api', () => ({
  listAdministrators: vi.fn(),
  createAdministrator: vi.fn(),
  resetTemporaryPassword: vi.fn(),
}));

const mockedList = vi.mocked(listAdministrators);
const mockedCreate = vi.mocked(createAdministrator);
const mockedReset = vi.mocked(resetTemporaryPassword);

const administrator = (overrides: Partial<Administrator> = {}): Administrator => ({
  id: 'adm-1',
  email: 'moderadora@udesa.edu.ar',
  handle: '@moderadora',
  role: 'moderator',
  temporary_password_status: null,
  temporary_password_expires_at: null,
  ...overrides,
});

const problem = (status: number, code: string, title: string, detail: string) => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: { type: `https://udesa-x.dev/errors/${code}`, title, status, detail },
    }
  );
};

const fillCreationForm = (email: string, handle: string) => {
  fireEvent.change(screen.getByLabelText(/Email/), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/Handle/), { target: { value: handle } });
};

const openCreationForm = async () => {
  fireEvent.click(screen.getByRole('button', { name: /Crear administrador/ }));
  return screen.findByRole('button', { name: 'Crear' });
};

describe('UsersPage', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedReset.mockReset();
    mockedList.mockResolvedValue([]);
  });

  it('lists the administrators the backend returns', async () => {
    mockedList.mockResolvedValue([
      administrator({ id: 'adm-1', handle: '@superadmin', role: 'superadmin' }),
      administrator({ id: 'adm-2' }),
    ]);

    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('@superadmin')).toBeInTheDocument();
    expect(screen.getByText('Superadministrador')).toBeInTheDocument();
    expect(screen.getByText('@moderadora')).toBeInTheDocument();
    expect(screen.getByText('Moderador')).toBeInTheDocument();
  });

  it('says so when there is no administrator yet instead of inventing rows', async () => {
    renderWithProviders(<UsersPage />);

    expect(await screen.findByText('Todavía no hay administradores')).toBeInTheDocument();
  });

  it('shows the temporary password once after creating an account', async () => {
    mockedCreate.mockResolvedValue({
      id: 'adm-2',
      email: 'nueva@udesa.edu.ar',
      handle: '@nueva_admin',
      role: 'moderator',
      temporary_password: 'Temporal123',
    });

    renderWithProviders(<UsersPage />);
    await openCreationForm();
    fillCreationForm('nueva@udesa.edu.ar', '@nueva_admin');
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByTestId('temporary-password')).toHaveTextContent('Temporal123');
    expect(mockedCreate).toHaveBeenCalledWith({
      email: 'nueva@udesa.edu.ar',
      handle: '@nueva_admin',
      role: 'moderator',
    });
    // The listing is asked again, so the new account shows up without a reload.
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it('rejects a malformed handle before reaching the backend', async () => {
    renderWithProviders(<UsersPage />);
    await openCreationForm();
    fillCreationForm('nueva@udesa.edu.ar', 'sin-arroba');
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByText(/El handle debe empezar con @/)).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('shows the backend message when the email is outside the allowed domain', async () => {
    mockedCreate.mockRejectedValue(
      problem(
        400,
        'email-domain-not-allowed',
        'No se pudo crear la cuenta',
        'El correo de un administrador tiene que ser del dominio @udesa.edu.ar'
      )
    );

    renderWithProviders(<UsersPage />);
    await openCreationForm();
    fillCreationForm('ajena@gmail.com', '@ajena_admin');
    fireEvent.click(screen.getByRole('button', { name: 'Crear' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El correo de un administrador tiene que ser del dominio @udesa.edu.ar'
    );
  });

  it('offers to regenerate a pending credential and shows the fresh password', async () => {
    mockedList.mockResolvedValue([
      administrator({
        temporary_password_status: 'expired',
        temporary_password_expires_at: '2026-09-01T10:00:00Z',
      }),
    ]);
    mockedReset.mockResolvedValue({
      id: 'adm-1',
      email: 'moderadora@udesa.edu.ar',
      handle: '@moderadora',
      role: 'moderator',
      temporary_password: 'Regenerada9',
    });

    renderWithProviders(<UsersPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Regenerar' }));

    expect(await screen.findByTestId('temporary-password')).toHaveTextContent('Regenerada9');
    expect(mockedReset).toHaveBeenCalledWith('adm-1');
  });

  it('does not offer to regenerate an account that already chose its password', async () => {
    mockedList.mockResolvedValue([administrator()]);

    renderWithProviders(<UsersPage />);
    const row = (await screen.findByText('@moderadora')).closest('tr') as HTMLElement;

    expect(within(row).getByText('Contraseña propia')).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: 'Regenerar' })).not.toBeInTheDocument();
  });
});
