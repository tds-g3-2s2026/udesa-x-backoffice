import { beforeEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../../../src/router';
import { renderWithProviders } from '../../helpers/render';
import { resetSession, signInAs } from '../../helpers/session';

vi.mock('../../../../src/features/audit/api', () => ({
  listAuditEntries: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));
beforeEach(resetSession);

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
