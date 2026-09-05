import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../src/router';
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

  it('shows user management to a superadmin only', async () => {
    signInAs('superadmin');
    renderAt('/users');

    expect(await screen.findByRole('heading', { name: 'User Management' })).toBeInTheDocument();
    // Heading plus the navigation entry.
    expect(screen.getAllByText('User Management')).toHaveLength(2);
  });

  it('keeps a moderator out of user management, in the menu and by URL', async () => {
    signInAs('moderator');
    const router = renderAt('/users');

    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('sends a signed-in administrator away from the login', async () => {
    signInAs('superadmin');
    const router = renderAt('/login');

    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
