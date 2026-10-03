import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../../../src/features/dashboard/pages/DashboardPage';
import { fetchAccountMetrics, fetchPostsToday } from '../../../../src/features/dashboard/api';
import { fetchHealth } from '../../../../src/features/health/api';
import type * as HealthApi from '../../../../src/features/health/api';
import { renderWithProviders } from '../../helpers/render';

vi.mock('../../../../src/features/dashboard/api', () => ({
  fetchAccountMetrics: vi.fn(),
  fetchPostsToday: vi.fn(),
}));
vi.mock('../../../../src/features/health/api', async (importOriginal) => ({
  ...(await importOriginal<typeof HealthApi>()),
  fetchHealth: vi.fn(),
}));

const valueOf = (label: string) =>
  screen.getByText(label, { exact: true }).nextElementSibling?.textContent;

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(fetchAccountMetrics).mockResolvedValue({
      active_users: 1500,
      accounts_under_review: 0,
    });
    vi.mocked(fetchPostsToday).mockResolvedValue(0);
    vi.mocked(fetchHealth).mockImplementation((service) =>
      service === 'posts-api'
        ? Promise.reject(new Error('503'))
        : Promise.resolve({ version: '0.1.0', latencyMs: 5 })
    );
  });

  it('shows what the services answer, zeros included', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => expect(valueOf('Microservices')).toBe('2/3 Online'));
    expect(valueOf('Active Users')).toBe('1.500');
    expect(valueOf('Posts Today')).toBe('0');
    expect(valueOf('Accounts Under Review')).toBe('0');
  });

  it('marks a number it could not read instead of inventing one', async () => {
    vi.mocked(fetchPostsToday).mockRejectedValue(new Error('500'));
    renderWithProviders(<DashboardPage />);

    await waitFor(() => expect(valueOf('Posts Today')).toBe('—'));
    expect(valueOf('Active Users')).toBe('1.500');
  });
});
