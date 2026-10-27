import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../../../src/router';
import { renderWithProviders } from '../../helpers/render';
import { resetSession, signInAs } from '../../helpers/session';
import { apiClient } from '../../../../src/services/apiClient';
import { getAccount, getAccountCounts } from '../../../../src/features/users/api';

vi.mock('../../../../src/features/users/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/features/users/api')>()),
  getAccount: vi.fn(),
  getAccountCounts: vi.fn(),
}));
const get = vi.spyOn(apiClient, 'get');

beforeEach(() => {
  resetSession();
  get.mockReset().mockResolvedValue({ data: { items: [], total: 0 } });
});

it.each(['moderator', 'superadmin'] as const)(
  'allows %s to open the audit route and navigation',
  async (role) => {
    signInAs(role);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/audit'] }),
    });
    renderWithProviders(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: 'Auditoría' })).toBeInTheDocument();
    expect(screen.getAllByText('Auditoría')).toHaveLength(2);
    expect(router.state.location.pathname).toBe('/audit');
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/admin/audit', { params: { limit: 20, offset: 0 } })
    );
  }
);

it.each(['moderator', 'superadmin'] as const)(
  'allows %s to open the existing account detail from an audit handle',
  async (role) => {
    signInAs(role);
    get.mockResolvedValue({
      data: {
        total: 1,
        items: [
          {
            id: 'audit-1',
            occurred_at: '2026-10-25T10:00:00Z',
            actor_id: 'admin-1',
            actor_email: 'admin@udesa.edu.ar',
            action: 'report.dismissed',
            target_type: 'user',
            target_id: 'account-1',
            target_handle: '@mariag',
            details: {},
          },
        ],
      },
    });
    vi.mocked(getAccount).mockResolvedValue({
      id: 'account-1',
      email: 'maria@udesa.edu.ar',
      handle: '@mariag',
      display_name: 'María Gómez',
      status: 'active',
      status_reason: null,
      status_changed_at: null,
      is_email_verified: true,
      created_at: '2026-10-20T10:00:00Z',
    });
    vi.mocked(getAccountCounts).mockResolvedValue({ followers: 2, posts: 3 });
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/audit'] }),
    });
    renderWithProviders(<RouterProvider router={router} />);

    fireEvent.click(await screen.findByRole('link', { name: '@mariag' }));

    expect(await screen.findByRole('heading', { name: 'María Gómez' })).toBeInTheDocument();
    expect(screen.getByText('maria@udesa.edu.ar')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/users/account-1'));
    expect(getAccount).toHaveBeenCalledWith('account-1');
  }
);

it('requires a session to open the audit route', async () => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ['/audit'] }),
  });
  renderWithProviders(<RouterProvider router={router} />);
  await screen.findByLabelText(/Email/);
  expect(router.state.location.pathname).toBe('/login');
});
