import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../src/router';
import { apiClient } from '../../src/services/apiClient';
import { renderWithProviders } from './helpers/render';
import { resetSession, signInAs } from './helpers/session';

const renderAt = (pathname: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });
  renderWithProviders(<RouterProvider router={router} />);
  return router;
};

describe('Backoffice App Shell', () => {
  beforeEach(resetSession);
  afterEach(() => vi.restoreAllMocks());

  it('sends a visitor without a session to the login, remembering where they were going', async () => {
    const router = renderAt('/health');

    expect(await screen.findByRole('heading', { name: 'UdeSA-X Backoffice' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
    expect(router.state.location.search).toEqual({ redirect: '/health' });
  });

  it('renders navigation links and header brand for a signed-in administrator', async () => {
    signInAs('moderator');
    renderAt('/');

    expect(await screen.findByText('UdeSA-X Backoffice')).toBeInTheDocument();
    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(screen.getByText('Service Health')).toBeInTheDocument();
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
    // The header shows the local part of the address; the full email lives in the menu.
    expect(screen.getByText('moderator')).toBeInTheDocument();
  });

  it('renders the health route inside the shell', async () => {
    signInAs('moderator');
    renderAt('/health');

    expect(await screen.findByText('UdeSA-X Backoffice')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Microservices Health' })
    ).toBeInTheDocument();
  });

  it('shows the administrators screen to a superadmin only', async () => {
    signInAs('superadmin');
    renderAt('/users');

    expect(await screen.findByRole('heading', { name: 'Administradores' })).toBeInTheDocument();
    // Heading plus the navigation entry.
    expect(screen.getAllByText('Administradores')).toHaveLength(2);
  });

  it('keeps a moderator out of the administrators screen, in the menu and by URL', async () => {
    signInAs('moderator');
    const router = renderAt('/users');

    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('Administradores')).not.toBeInTheDocument();
  });

  it('E5-H4 - lets a moderator search accounts, keeping the text in the address', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: { items: [], next_cursor: null } } as never);
    signInAs('moderator');
    const router = renderAt('/users/search');

    expect(await screen.findByRole('heading', { name: 'Usuarios' })).toBeInTheDocument();
    // Its own route, not the superadmin one: neither redirected nor taken for a detail.
    expect(router.state.location.pathname).toBe('/users/search');
    expect(screen.queryByText('Administradores')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email o handle'), { target: { value: 'gomez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByText('Ninguna cuenta coincide con "gomez"')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.search).toEqual({ q: 'gomez' }));
    expect(get).toHaveBeenCalledWith('/admin/users/search', { params: { q: 'gomez' } });
  });

  it('E5-H4 - opens the detail of an account by its address', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(((url: string) =>
      Promise.resolve({
        data: url.startsWith('/admin/posts/')
          ? { followers: 3, posts: 5 }
          : {
              id: 'acc-1',
              email: 'maria.gomez@udesa.edu.ar',
              handle: '@mariag',
              display_name: 'María Gómez',
              status: 'active',
              is_email_verified: true,
              created_at: '2026-10-20T15:00:00Z',
            },
      })) as never);
    signInAs('moderator');
    renderAt('/users/acc-1');

    expect(await screen.findByRole('heading', { name: 'María Gómez' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Volver a la búsqueda/ })).toHaveAttribute(
      'href',
      '/users/search'
    );
  });

  it('sends a signed-in administrator away from the login', async () => {
    signInAs('superadmin');
    const router = renderAt('/login');

    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
