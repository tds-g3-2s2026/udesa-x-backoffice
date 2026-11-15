import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '../../../../src/features/dashboard/pages/DashboardPage';
import {
  fetchAccountMetrics,
  fetchPostsToday,
  fetchRegistrations,
} from '../../../../src/features/dashboard/api';
import { fetchHealth } from '../../../../src/features/health/api';
import type * as HealthApi from '../../../../src/features/health/api';
import { renderWithProviders } from '../../helpers/render';

vi.mock('../../../../src/features/dashboard/api', () => ({
  fetchAccountMetrics: vi.fn(),
  fetchPostsToday: vi.fn(),
  fetchRegistrations: vi.fn(),
}));
vi.mock('../../../../src/features/health/api', async (importOriginal) => ({
  ...(await importOriginal<typeof HealthApi>()),
  fetchHealth: vi.fn(),
}));

// Seven days, one of them empty: what users-api answers for a week with a quiet day.
const WEEK = [
  { date: '2026-11-09', registrations: 2 },
  { date: '2026-11-10', registrations: 0 },
  { date: '2026-11-11', registrations: 5 },
  { date: '2026-11-12', registrations: 1 },
  { date: '2026-11-13', registrations: 0 },
  { date: '2026-11-14', registrations: 3 },
  { date: '2026-11-15', registrations: 4 },
];

const valueOf = (label: string) =>
  screen.getByText(label, { exact: true }).nextElementSibling?.textContent;

// jsdom lays nothing out, and the chart draws nothing in a box of size zero. This
// observer reports a box the size of a desktop chart as soon as it is asked to watch one.
class SizedResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    const contentRect = { width: 600, height: 240 } as DOMRectReadOnly;
    this.callback([{ target, contentRect } as ResizeObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', SizedResizeObserver);
    vi.mocked(fetchAccountMetrics).mockResolvedValue({
      active_users: 1500,
      accounts_under_review: 0,
    });
    vi.mocked(fetchPostsToday).mockResolvedValue(0);
    vi.mocked(fetchRegistrations).mockResolvedValue(WEEK);
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('E5-H3.CA2 - draws one bar per day of the last week', async () => {
    const { container } = renderWithProviders(<DashboardPage />);

    await waitFor(() =>
      expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(7)
    );
    expect(screen.getByText('09/11')).toBeInTheDocument();
    expect(screen.getByText('15/11')).toBeInTheDocument();
  });

  it('says what counts as a registration in the title of the chart', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Registros de los últimos 7 días')).toBeInTheDocument();
    expect(screen.getByText(/toda cuenta creada/)).toBeInTheDocument();
  });

  it('reloads the registrations with the refresh button, like the cards', async () => {
    renderWithProviders(<DashboardPage />);
    await waitFor(() => expect(fetchRegistrations).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

    await waitFor(() => expect(fetchRegistrations).toHaveBeenCalledTimes(2));
  });

  it('says the registrations could not be read instead of drawing an empty chart', async () => {
    vi.mocked(fetchRegistrations).mockRejectedValue(new Error('500'));
    const { container } = renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('No se pudieron leer los registros.')).toBeInTheDocument();
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(0);
    expect(valueOf('Active Users')).toBe('1.500');
  });

  it('marks a number it could not read instead of inventing one', async () => {
    vi.mocked(fetchPostsToday).mockRejectedValue(new Error('500'));
    renderWithProviders(<DashboardPage />);

    await waitFor(() => expect(valueOf('Posts Today')).toBe('—'));
    expect(valueOf('Active Users')).toBe('1.500');
  });
});
