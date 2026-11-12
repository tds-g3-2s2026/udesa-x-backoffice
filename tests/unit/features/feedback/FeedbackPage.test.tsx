import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { FeedbackPage } from '../../../../src/features/feedback/pages/FeedbackPage';
import type { FeedbackMessage, FeedbackMessagePage } from '../../../../src/features/feedback/api';
import { apiClient } from '../../../../src/services/apiClient';
import { renderWithProviders } from '../../helpers/render';

// A plain anchor in place of the router's Link: the screen is tested without a router.
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

const page = (items: FeedbackMessage[], next_cursor: string | null = null) =>
  ok<FeedbackMessagePage>({ items, next_cursor });

const feedback = (overrides: Partial<FeedbackMessage> = {}): FeedbackMessage => ({
  id: 'fb-1',
  user_id: 'acc-1',
  handle: '@mariag',
  account_available: true,
  message: 'La app se cierra al abrir el feed',
  device_os: 'Android 14',
  app_version: '1.4.0',
  status: 'pending',
  created_at: '2026-11-10T13:30:00Z',
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

const get = vi.spyOn(apiClient, 'get');
const post = vi.spyOn(apiClient, 'post');

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement;

const rowAround = (element: HTMLElement) => element.closest('tr') as HTMLElement;

describe('FeedbackPage', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('E5-H12.CA1 - shows each message with its device and date', async () => {
    get.mockResolvedValueOnce(page([feedback()]));

    renderWithProviders(<FeedbackPage />);

    const row = rowAround(await screen.findByText('La app se cierra al abrir el feed'));
    expect(within(row).getByRole('link', { name: '@mariag' })).toHaveAttribute(
      'href',
      '/users/acc-1'
    );
    expect(within(row).getByText('Android 14')).toBeInTheDocument();
    expect(within(row).getByText('App 1.4.0')).toBeInTheDocument();
    expect(within(row).getByText(/10\/11\/2026/)).toBeInTheDocument();
    // The inbox is the pending ones.
    expect(get).toHaveBeenCalledWith('/admin/feedback', { params: { status: 'pending' } });
  });

  it('E5-H12.CA2 - a message marked read or resolved leaves the inbox', async () => {
    get
      .mockResolvedValueOnce(
        page([
          feedback({ id: 'fb-1', message: 'Leído' }),
          feedback({ id: 'fb-2', message: 'Resuelto' }),
          feedback({ id: 'fb-3', message: 'Sigue pendiente' }),
        ])
      )
      .mockResolvedValueOnce(
        page([
          feedback({ id: 'fb-2', message: 'Resuelto' }),
          feedback({ id: 'fb-3', message: 'Sigue pendiente' }),
        ])
      )
      .mockResolvedValue(page([feedback({ id: 'fb-3', message: 'Sigue pendiente' })]));
    post.mockResolvedValue({ data: undefined, status: 204 });

    renderWithProviders(<FeedbackPage />);
    await screen.findByText('Leído');

    fireEvent.click(within(rowOf('Leído')).getByRole('button', { name: 'Marcar leído' }));
    await waitFor(() => expect(screen.queryByText('Leído')).not.toBeInTheDocument());
    fireEvent.click(within(rowOf('Resuelto')).getByRole('button', { name: 'Resolver' }));
    await waitFor(() => expect(screen.queryByText('Resuelto')).not.toBeInTheDocument());

    expect(post.mock.calls.map(([url]) => url)).toEqual([
      '/admin/feedback/fb-1/read',
      '/admin/feedback/fb-2/resolve',
    ]);
    expect(screen.getByText('Sigue pendiente')).toBeInTheDocument();
  });

  it('E5-H12.CA3 - a deleted account keeps its message and handle, without a link', async () => {
    get.mockResolvedValueOnce(page([feedback({ handle: '@borrada', account_available: false })]));

    renderWithProviders(<FeedbackPage />);

    const row = rowAround(await screen.findByText('@borrada'));
    expect(within(row).getByText('Cuenta no disponible')).toBeInTheDocument();
    expect(within(row).queryByRole('link')).not.toBeInTheDocument();
    expect(within(row).getByText('La app se cierra al abrir el feed')).toBeInTheDocument();
  });

  it('filters by read and resolved, offering only what can still be done', async () => {
    get
      .mockResolvedValueOnce(page([feedback()]))
      .mockResolvedValueOnce(page([feedback({ id: 'fb-2', message: 'Ya leído', status: 'read' })]))
      .mockResolvedValueOnce(
        page([feedback({ id: 'fb-3', message: 'Ya resuelto', status: 'resolved' })])
      );

    renderWithProviders(<FeedbackPage />);
    await screen.findByText('La app se cierra al abrir el feed');

    fireEvent.click(screen.getByText('Leídos'));
    const read = rowAround(await screen.findByText('Ya leído'));
    expect(get).toHaveBeenLastCalledWith('/admin/feedback', { params: { status: 'read' } });
    expect(within(read).queryByRole('button', { name: 'Marcar leído' })).not.toBeInTheDocument();
    expect(within(read).getByRole('button', { name: 'Resolver' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Resueltos'));
    const resolved = rowAround(await screen.findByText('Ya resuelto'));
    expect(get).toHaveBeenLastCalledWith('/admin/feedback', { params: { status: 'resolved' } });
    expect(within(resolved).queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps the row and says why when an action fails', async () => {
    get.mockResolvedValue(page([feedback()]));
    post.mockRejectedValueOnce(
      problem(404, 'feedback-not-found', 'No existe un mensaje con ese id')
    );

    renderWithProviders(<FeedbackPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Resolver' }));

    expect(await screen.findByText('No existe un mensaje con ese id')).toBeInTheDocument();
    expect(screen.getByText('La app se cierra al abrir el feed')).toBeInTheDocument();
  });

  it('disables the row while its action is on the way', async () => {
    get.mockResolvedValue(page([feedback()]));
    post.mockReturnValueOnce(new Promise(() => {}));

    renderWithProviders(<FeedbackPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar leído' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Resolver' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Marcar leído' })).toBeDisabled();
  });

  it('says why when the list cannot be loaded', async () => {
    get.mockRejectedValueOnce(problem(400, 'invalid-cursor', 'El cursor no es válido'));

    renderWithProviders(<FeedbackPage />);

    expect(await screen.findByText('El cursor no es válido')).toBeInTheDocument();
  });

  it('says when a filter has nothing', async () => {
    get.mockResolvedValueOnce(page([]));

    renderWithProviders(<FeedbackPage />);

    expect(await screen.findByText('No hay mensajes pendientes.')).toBeInTheDocument();
  });

  it('pages with the cursor users-api hands out, and starts over on another filter', async () => {
    get
      .mockResolvedValueOnce(page([feedback({ message: 'Primera página' })], 'cursor-1'))
      .mockResolvedValueOnce(page([feedback({ id: 'fb-9', message: 'Segunda página' })]))
      .mockResolvedValue(page([]));

    renderWithProviders(<FeedbackPage />);
    await screen.findByText('Primera página');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    expect(await screen.findByText('Segunda página')).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith('/admin/feedback', {
      params: { status: 'pending', cursor: 'cursor-1' },
    });
    expect(screen.getByText('Página 2')).toBeInTheDocument();

    // The cursor belongs to the pending list: another filter starts on its first page.
    fireEvent.click(screen.getByText('Leídos'));
    expect(await screen.findByText('No hay mensajes leídos.')).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith('/admin/feedback', { params: { status: 'read' } });
    expect(screen.getByText('Página 1')).toBeInTheDocument();
  });
});
