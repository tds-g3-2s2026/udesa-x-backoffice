import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { AccountDetailPage } from '../../../../src/features/users/pages/AccountDetailPage';
import { AccountSearchPage } from '../../../../src/features/users/pages/AccountSearchPage';
import {
  REMOVED_BY_MODERATION,
  type AccountCounts,
  type AccountPost,
  type AccountPostPage,
  type UserAccount,
  type UserAccountPage,
} from '../../../../src/features/users/api';
import { apiClient } from '../../../../src/services/apiClient';
import { renderWithProviders } from '../../helpers/render';
import { resetSession, signInAs } from '../../helpers/session';

// A plain anchor in place of the router's Link: the screens are tested without a
// router. The routes themselves are covered in App.test.tsx.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [name, value]) => path.replace(`$${name}`, value),
        to
      )}
    >
      {children}
    </a>
  ),
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
  bio: null,
  status: 'active',
  status_reason: null,
  status_changed_at: null,
  is_email_verified: true,
  created_at: '2026-10-20T15:00:00Z',
  last_login_at: null,
  ...overrides,
});

// Midday UTC: the date is the same in any time zone the tests run in, the hour is not.
const lastLogin = (date: string) => new RegExp(`^${date}, [0-9]{2}:[0-9]{2}$`);

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
  resetSession();
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

  it('E5-H9.CA2 - shows the last connection of every account', async () => {
    get.mockResolvedValueOnce(
      page([
        account({ last_login_at: '2026-11-07T12:30:00Z' }),
        account({ id: 'acc-2', handle: '@segunda', last_login_at: '2026-11-01T12:00:00Z' }),
      ])
    );

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);

    expect(await screen.findByText('@mariag')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Última conexión' })).toBeInTheDocument();
    expect(screen.getByText(lastLogin('07/11/2026'))).toBeInTheDocument();
    expect(screen.getByText(lastLogin('01/11/2026'))).toBeInTheDocument();
  });

  it('E5-H9.CA2 - says when an account never logged in', async () => {
    get.mockResolvedValueOnce(page([account({ last_login_at: null })]));

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);

    expect(await screen.findByText('@mariag')).toBeInTheDocument();
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('says when nothing matches', async () => {
    get.mockResolvedValueOnce(page([]));

    renderWithProviders(<AccountSearchPage query="zzz" onSearch={vi.fn()} />);

    expect(await screen.findByText('Ninguna cuenta coincide con "zzz"')).toBeInTheDocument();
  });

  it('E5-H8.CA2 - shows the export button only to a superadmin', async () => {
    get.mockResolvedValue(page([account()]));

    signInAs('moderator');
    const moderator = renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);
    expect(await screen.findByText('@mariag')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Exportar CSV/ })).not.toBeInTheDocument();
    moderator.unmount();

    signInAs('superadmin');
    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /Exportar CSV/ })).toBeInTheDocument();
  });

  it('E5-H8.CA1 - downloads the accounts of the search as a CSV', async () => {
    signInAs('superadmin');
    const file = new Blob(['ID,Handle'], { type: 'text/csv' });
    get.mockImplementation(((url: string) =>
      Promise.resolve(url.endsWith('export.csv') ? ok(file) : page([account()]))) as never);
    // jsdom has no object URLs and does not navigate: both are stubbed.
    const createObjectURL = vi.fn(() => 'blob:cuentas');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Exportar CSV/ }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(get).toHaveBeenCalledWith('/admin/users/export.csv', {
      params: { q: 'gomez' },
      responseType: 'blob',
    });
    expect(createObjectURL).toHaveBeenCalledWith(file);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('cuentas.csv');
    expect(link.href).toBe('blob:cuentas');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cuentas');
    click.mockRestore();
  });

  it('shows the problem when the export fails', async () => {
    signInAs('superadmin');
    get.mockImplementation(((url: string) =>
      url.endsWith('export.csv')
        ? Promise.reject(unreachable())
        : Promise.resolve(page([account()]))) as never);

    renderWithProviders(<AccountSearchPage query="gomez" onSearch={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /Exportar CSV/ }));

    expect(await screen.findByText('No se pudo conectar')).toBeInTheDocument();
  });
});

describe('AccountDetailPage', () => {
  /** Answers each of the three requests the screen makes, by path. */
  const answer = (
    detail: () => Promise<unknown>,
    counts: () => Promise<unknown>,
    posts: () => Promise<unknown> = async () => ok<AccountPostPage>({ items: [], nextCursor: null })
  ) =>
    get.mockImplementation(((url: string) => {
      if (url.endsWith('/posts')) {
        return posts();
      }
      return url.startsWith('/admin/posts/') ? counts() : detail();
    }) as never);

  const accountPost = (overrides: Partial<AccountPost> = {}): AccountPost => ({
    id: 'post-1',
    content: 'Compren seguidores en mi perfil',
    createdAt: '2026-11-10T15:00:00Z',
    parentId: null,
    images: [],
    ...overrides,
  });

  const noCounts = async () => ok<AccountCounts>({ followers: 0, posts: 0 });

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

  it('E5-H9.CA2 - the detail shows the last connection too', async () => {
    answer(
      async () => ok(account({ last_login_at: '2026-11-07T12:30:00Z' })),
      async () => ok<AccountCounts>({ followers: 0, posts: 0 })
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(
      await screen.findByText(/^Última conexión: 07\/11\/2026, [0-9]{2}:[0-9]{2}$/)
    ).toBeInTheDocument();
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

  it('E5-H10.CA1 - offers Limpiar Contenido on the account detail', async () => {
    answer(async () => ok(account({ bio: 'Vendo seguidores, escribime' })), noCounts);

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Vendo seguidores, escribime')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar Contenido' })).toBeInTheDocument();
  });

  it('E5-H10.CA2 - clears the biography after confirming and shows the placeholder', async () => {
    let bio: string | null = 'Vendo seguidores, escribime';
    answer(async () => ok(account({ bio })), noCounts);
    post.mockImplementation(async () => {
      bio = REMOVED_BY_MODERATION;
      return ok(undefined);
    });
    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar Contenido' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Limpiar biografía' }));

    expect(await screen.findByText(REMOVED_BY_MODERATION)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/admin/users/acc-1/clean-content');
    // Already cleared: nothing left to clear, and blocking stays available.
    expect(screen.queryByRole('button', { name: 'Limpiar Contenido' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bloquear' })).toBeInTheDocument();
  });

  it('does not offer to clear an account without a biography', async () => {
    answer(async () => ok(account({ bio: null })), noCounts);

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Sin biografía')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar Contenido' })).not.toBeInTheDocument();
  });

  it('E5-H10 - lists the posts of the account, each with a link to its detail', async () => {
    answer(
      async () => ok(account()),
      noCounts,
      async () =>
        ok<AccountPostPage>({
          items: [
            accountPost(),
            accountPost({ id: 'post-2', content: 'Una respuesta', parentId: 'post-0' }),
          ],
          nextCursor: null,
        })
    );

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Compren seguidores en mi perfil')).toBeInTheDocument();
    expect(screen.getByText('Respuesta')).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Ver publicación' }).map((a) => a.getAttribute('href'))
    ).toEqual(['/posts/post-1', '/posts/post-2']);
    expect(get).toHaveBeenCalledWith('/admin/posts/accounts/acc-1/posts', { params: {} });
  });

  it('pages the posts with the cursor posts-api hands out', async () => {
    answer(
      async () => ok(account()),
      noCounts,
      async () => ok<AccountPostPage>({ items: [accountPost()], nextCursor: 'next-page' })
    );
    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/admin/posts/accounts/acc-1/posts', {
        params: { cursor: 'next-page' },
      })
    );
    expect(await screen.findByRole('button', { name: 'Anterior' })).toBeEnabled();
  });

  it('says when the account has no posts', async () => {
    answer(async () => ok(account()), noCounts);

    renderWithProviders(<AccountDetailPage userId="acc-1" />);

    expect(await screen.findByText('Esta cuenta no tiene publicaciones.')).toBeInTheDocument();
  });
});
