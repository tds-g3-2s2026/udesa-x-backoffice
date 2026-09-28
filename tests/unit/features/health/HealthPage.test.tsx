import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HealthPage } from '../../../../src/features/health/pages/HealthPage';
import { type ServiceHealth, fetchHealth } from '../../../../src/features/health/api';
import { renderWithProviders } from '../../helpers/render';

vi.mock('../../../../src/features/health/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/features/health/api')>()),
  fetchHealth: vi.fn(),
}));

const mockedFetch = vi.mocked(fetchHealth);

const up = (version: string): Promise<ServiceHealth> => Promise.resolve({ version, latencyMs: 12 });

const rowOf = (service: string) => screen.getByRole('row', { name: new RegExp(service) });

describe('HealthPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    mockedFetch.mockImplementation(() => up('0.1.0'));
  });

  it('E5-H11.CA1 asks for the health of every deployed service', async () => {
    renderWithProviders(<HealthPage />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(3));
    expect(mockedFetch.mock.calls.map(([service]) => service)).toEqual([
      'users-api',
      'posts-api',
      'api-gateway',
    ]);
  });

  it('E5-H11.CA2 shows a service that answers in green, with its version', async () => {
    mockedFetch.mockImplementation((service) =>
      service === 'posts-api' ? up('0.4.0') : up('0.1.0')
    );
    renderWithProviders(<HealthPage />);

    const row = await waitFor(() => {
      const posts = rowOf('posts-api');
      expect(within(posts).getByText('En línea')).toBeInTheDocument();
      return posts;
    });
    expect(within(row).getByText('0.4.0')).toBeInTheDocument();
    expect(within(row).getByText('12 ms')).toBeInTheDocument();
  });

  it('E5-H11.CA2 shows a service that fails in red, without a version', async () => {
    mockedFetch.mockImplementation((service) =>
      service === 'users-api' ? Promise.reject(new Error('503')) : up('0.1.0')
    );
    renderWithProviders(<HealthPage />);

    const row = await waitFor(() => {
      const users = rowOf('users-api');
      expect(within(users).getByText('Caído')).toBeInTheDocument();
      return users;
    });
    expect(within(row).queryByText('0.1.0')).not.toBeInTheDocument();
    expect(within(rowOf('posts-api')).getByText('En línea')).toBeInTheDocument();
  });

  it('E5-H11.CA3 shows the other services while one is still waiting, then marks it down', async () => {
    let giveUp: (reason: Error) => void = () => {};
    mockedFetch.mockImplementation((service) =>
      service === 'posts-api'
        ? new Promise<ServiceHealth>((_resolve, reject) => (giveUp = reject))
        : up('0.1.0')
    );
    renderWithProviders(<HealthPage />);

    await waitFor(() => {
      expect(within(rowOf('users-api')).getByText('En línea')).toBeInTheDocument();
      expect(within(rowOf('api-gateway')).getByText('En línea')).toBeInTheDocument();
    });
    expect(within(rowOf('posts-api')).getByLabelText('Consultando')).toBeInTheDocument();

    giveUp(new Error('timeout of 5000ms exceeded'));

    await waitFor(() => expect(within(rowOf('posts-api')).getByText('Caído')).toBeInTheDocument());
  });

  it('asks every service again on demand', async () => {
    renderWithProviders(<HealthPage />);
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getByRole('button', { name: /Actualizar/ }));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(6));
  });
});
