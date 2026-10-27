import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { AccountDetailPage } from '../../../../src/features/users/pages/AccountDetailPage';
import { AccountSearchPage } from '../../../../src/features/users/pages/AccountSearchPage';
import type {
  AccountCounts,
  UserAccount,
  UserAccountPage,
} from '../../../../src/features/users/api';
import { apiClient } from '../../../../src/services/apiClient';
import { renderWithProviders } from '../../helpers/render';

// A plain anchor in place of the router's Link: the screens are tested without a
// router. The routes themselves are covered in App.test.tsx.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: { userId: string };
    children: React.ReactNode;
  }) => <a href={params ? to.replace('$userId', params.userId) : to}>{children}</a>,
}));

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

const ok = <T,>(data: T) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

const page = (items: UserAccount[], nextCursor: string | null = null) =>
  ok<UserAccountPage>({ items, next_cursor: nextCursor });

const account = (overrides: Partial<UserAccount> = {}): UserAccount => ({
  id: 'acc-1',
  email: 'maria.gomez@udesa.edu.ar',
  handle: '@mariag',
  display_name: 'María Gómez',
  status: 'active',
  status_reason: null,
  status_changed_at: null,
  is_email_verified: true,
  created_at: '2026-10-20T15:00:00Z',
  ...overrides,
});

const problem = (status: number, code: string, detail: string) =>
  new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status,
      statusText: '',
      headers: {},
      config,
      data: { type: `https://udesa-x.dev/errors/${code}`, title: 'Error', status, detail },
    }
  );

// No response at all: what a service that does not answer looks like.
const unreachable = () => new AxiosError('Network Error', 'ERR_NETWORK', config);

const get = vi.spyOn(apiClient, 'get');
const post = vi.spyOn(apiClient, 'post');

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('AccountSearchPage', () => {
  it('E5-H4.CA2 - sends the partial text and lists the matching accounts', async () => {
    get.mockResolvedValueOnce(
      page([
        account(),
        account({
          id: 'acc-2',
          email: 'otra@gmail.com',
          handle: '@gomezito',
          display_name: null,
          status: 'suspended',
        }),
      ])
    );

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);

    expect(await screen.findByText('@mariag')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/admin/users/search', { params: { q: 'gomez' } });
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    // `suspended` is what an administrator's block leaves: it reads "Bloqueada".
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '@gomezito' })).toHaveAttribute('href', '/users/acc-2');
  });

  it('E5-H4.CA3 - the next page sends the cursor, and the previous one goes back to the first page', async () => {
    get
      .mockResolvedValueOnce(page([account()], 'cursor-1'))
      .mockResolvedValueOnce(page([account({ id: 'acc-2', handle: '@segunda' })]))
      .mockResolvedValueOnce(page([account()], 'cursor-1'));

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);
    await screen.findByText('@mariag');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    expect(await screen.findByText('@segunda')).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith('/admin/users/search', {
      params: { q: 'gomez', cursor: 'cursor-1' },
    });
    expect(screen.getByText('Página 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Anterior/ }));

    // The cached page shows at once, and it is asked again in the background in
    // case an account changed status meanwhile.
    expect(await screen.findByText('@mariag')).toBeInTheDocument();
    expect(screen.getByText('Página 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith('/admin/users/search', { params: { q: 'gomez' } })
    );
  });

  it('asks for three characters without calling the backend', () => {
    renderWithProviders(<AccountSearchPage query="ab" onSearch={vi.fn()} />);

    expect(screen.getByText('La búsqueda necesita al menos 3 caracteres.')).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('invites to search while there is no text yet', () => {
    renderWithProviders(<AccountSearchPage query="" onSearch={vi.fn()} />);

    expect(screen.getByText(/Escribí parte del email o del handle/)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('hands the trimmed text to the route when the form is submitted', () => {
    const onSearch = vi.fn();
    renderWithProviders(<AccountSearchPage query="" onSearch={onSearch} />);

    fireEvent.change(screen.getByLabelText('Email o handle'), { target: { value: '  gomez  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(onSearch).toHaveBeenCalledWith('gomez');
  });

  it('shows the problem when the search fails', async () => {
    get.mockRejectedValueOnce(
      problem(400, 'invalid-cursor', 'El cursor no tiene un formato reconocible')
    );

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);

    expect(
      await screen.findByText('El cursor no tiene un formato reconocible')
    ).toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    get.mockResolvedValueOnce(page([]));

    renderWithProviders(<AccountSearchPage query="zzz" onSearch={vi.fn()} />);

    expect(await screen.findByText('Ninguna cuenta coincide con "zzz"')).toBeInTheDocument();
  });
});

describe('AccountDetailPage', () => {
  /** Answers each of the two requests the screen makes, by path. */
  const answer = (detail: () => Promise<unknown>, counts: () => Promise<unknown>) =>
    get.mockImplementation(((url: string) =>
      url.startsWith('/admin/posts/') ? counts() : detail()) as never);

  it('E5-H4.CA1 - shows status, registration date, followers and posts', async () => {
    answer(
      async () => ok(account({ status: 'under_review' })),
      async () => ok<AccountCounts>({ followers: 12, posts: 34 })
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('María Gómez')).toBeInTheDocument();
    expect(screen.getByText('@mariag')).toBeInTheDocument();
    expect(screen.getByText('ID: acc-1')).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(screen.getByText('Se registró el 20/10/2026')).toBeInTheDocument();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('34')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/admin/users/acc-1');
    expect(get).toHaveBeenCalledWith('/admin/posts/accounts/acc-1/counts');
  });

  it('keeps the account visible when posts-api does not answer', async () => {
    answer(
      async () => ok(account()),
      async () => {
        throw unreachable();
      }
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('No se pudo conectar')).toBeInTheDocument();
    expect(screen.getByText('María Gómez')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('shows the problem of the backend when the account does not exist', async () => {
    answer(
      async () => {
        throw problem(404, 'account-not-found', 'La cuenta no existe');
      },
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );

    renderWithProviders(<AccountDetailPage userId="acc-9" />);

    expect(await screen.findByText('La cuenta no existe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a la búsqueda/ })).toHaveAttribute(
      'href',
      '/users/search'
    );
  });

  it('marks an account that did not verify its email', async () => {
    answer(
      async () => ok(account({ is_email_verified: false, display_name: null })),
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Email sin verificar')).toBeInTheDocument();
    // Without a display name, the handle is the title.
    expect(screen.getByRole('heading', { name: '@mariag' })).toBeInTheDocument();
    expect(screen.getAllByText('@mariag')).toHaveLength(1);
    expect(screen.getByText('ID: acc-1')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('E5-H5.CA2 - the detail shows blocked after the action', async () => {
    let stored = account();
    answer(
      async () => ok(stored),
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );
    post.mockImplementation(async () => {
      stored = account({
        status: 'suspended',
        status_reason: 'Spam reiterado',
        status_changed_at: '2026-10-25T13:00:00Z',
      });
      return ok(undefined);
    });

    renderWithProviders(<AccountDetailPage userId="acc-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bloquear' }));
    // The modal opens with a transition: the field is there a moment later.
    fireEvent.change(await screen.findByLabelText(/Motivo/), {
      target: { value: 'Spam reiterado' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear cuenta' }));

    // The modal closes once the block went through.
    await waitFor(() => expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument());
    // Asked again after the block, not patched locally: what shows is what was stored.
    expect(await screen.findByText('Bloqueada el 25/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Spam reiterado')).toBeInTheDocument();
    expect(screen.getByText('Bloqueada')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/admin/users/acc-1/block', { reason: 'Spam reiterado' });
  });

  it('shows why a blocked account was blocked, and does not offer to block it again', async () => {
    answer(
      async () =>
        ok(
          account({
            status: 'suspended',
            status_reason: 'Acoso a otros usuarios',
            status_changed_at: '2026-10-21T10:00:00Z',
          })
        ),
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Acoso a otros usuarios')).toBeInTheDocument();
    expect(screen.getByText('Bloqueada el 21/10/2026')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bloquear' })).not.toBeInTheDocument();
  });

  it('E5-H5.CA1 - the reason travels with the request, and a refusal keeps the modal open', async () => {
    answer(
      async () => ok(account()),
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );
    post.mockRejectedValueOnce(
      problem(
        422,
        'administrator-cannot-be-blocked',
        'Las cuentas de administradores no se bloquean'
      )
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bloquear' }));
    fireEvent.change(await screen.findByLabelText(/Motivo/), { target: { value: '  Spam  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear cuenta' }));

    expect(
      await screen.findByText('Las cuentas de administradores no se bloquean')
    ).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/admin/users/acc-1/block', { reason: 'Spam' });
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('  Spam  ');

    // Closed and opened again: the refusal belonged to the attempt that closed.
    fireEvent.keyDown(screen.getByLabelText(/Motivo/), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));
    expect(await screen.findByLabelText(/Motivo/)).toHaveValue('');
    expect(
      screen.queryByText('Las cuentas de administradores no se bloquean')
    ).not.toBeInTheDocument();
  });
});
