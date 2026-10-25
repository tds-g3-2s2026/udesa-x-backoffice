import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { ModerationPage } from '../../../../src/features/moderation/pages/ModerationPage';
import type { ReportCase, ReportCasePage } from '../../../../src/features/moderation/api';
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

const page = (items: ReportCase[], nextCursor: string | null = null) =>
  ok<ReportCasePage>({ items, nextCursor });

const reportCase = (overrides: Partial<ReportCase> = {}): ReportCase => ({
  userId: 'acc-1',
  handle: '@denunciada',
  distinctReporters: 5,
  reports: 7,
  lastReportedAt: '2026-10-25T13:30:00Z',
  reasons: ['harassment', 'spam'],
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

const rowOf = (handle: string) => screen.getByText(handle).closest('tr') as HTMLElement;

const postedUrls = () => post.mock.calls.map(([url]) => url);

describe('ModerationPage', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it('E5-H7.CA1 - the list comes in the order the api sends', async () => {
    // Not sorted by count on purpose: the order is posts-api's, not the screen's.
    get.mockResolvedValueOnce(
      page([
        reportCase({ userId: 'acc-2', handle: '@segunda', distinctReporters: 2 }),
        reportCase({ userId: 'acc-1', handle: '@primera', distinctReporters: 6 }),
      ])
    );

    renderWithProviders(<ModerationPage />);

    expect(await screen.findByText('@segunda')).toBeInTheDocument();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getAllByRole('link')[0].textContent)).toEqual([
      '@segunda',
      '@primera',
    ]);
    expect(get).toHaveBeenCalledWith('/admin/posts/reports/cases', { params: {} });
  });

  it('shows who, how many, when and why for each case', async () => {
    get.mockResolvedValueOnce(page([reportCase()]));

    renderWithProviders(<ModerationPage />);

    const row = (await screen.findByText('@denunciada')).closest('tr') as HTMLElement;
    expect(within(row).getByText('5')).toBeInTheDocument();
    expect(within(row).getByText('7')).toBeInTheDocument();
    expect(within(row).getByText('Acoso')).toBeInTheDocument();
    expect(within(row).getByText('Spam')).toBeInTheDocument();
    expect(within(row).getByText(/25\/10\/2026/)).toBeInTheDocument();
    expect(within(row).getByRole('link')).toHaveAttribute('href', '/users/acc-1');
  });

  it('E5-H7.CA2 - Descartar and Suspender call the right endpoints', async () => {
    get.mockResolvedValue(
      page([
        reportCase({ userId: 'acc-1', handle: '@descartada' }),
        reportCase({ userId: 'acc-2', handle: '@suspendida' }),
      ])
    );
    post.mockResolvedValue({ data: undefined, status: 204 });

    renderWithProviders(<ModerationPage />);
    await screen.findByText('@descartada');

    fireEvent.click(
      within(rowOf('@descartada')).getByRole('button', { name: 'Descartar denuncia' })
    );
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/admin/posts/reports/cases/acc-1/dismiss')
    );

    fireEvent.click(within(rowOf('@suspendida')).getByRole('button', { name: 'Suspender cuenta' }));
    fireEvent.change(await screen.findByLabelText(/Motivo/), {
      target: { value: 'Acoso reiterado' },
    });
    // The one inside the modal: the row has a button with the same name.
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Suspender cuenta' })
    );

    // Blocked in users-api first, and only then resolved in posts-api.
    await waitFor(() =>
      expect(postedUrls()).toEqual([
        '/admin/posts/reports/cases/acc-1/dismiss',
        '/admin/users/acc-2/block',
        '/admin/posts/reports/cases/acc-2/resolve',
      ])
    );
    expect(post).toHaveBeenCalledWith('/admin/users/acc-2/block', { reason: 'Acoso reiterado' });
  });

  it('E5-H7.CA2 - a failed block does not resolve the case', async () => {
    get.mockResolvedValue(page([reportCase({ handle: '@admin_disfrazado' })]));
    post.mockRejectedValueOnce(
      problem(
        422,
        'administrator-cannot-be-blocked',
        'Las cuentas de administradores no se bloquean'
      )
    );

    renderWithProviders(<ModerationPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Suspender cuenta' }));
    fireEvent.change(await screen.findByLabelText(/Motivo/), { target: { value: 'Spam' } });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Suspender cuenta' }));

    expect(
      await within(dialog).findByText('Las cuentas de administradores no se bloquean')
    ).toBeInTheDocument();
    expect(postedUrls()).toEqual(['/admin/users/acc-1/block']);
    expect(rowOf('@admin_disfrazado')).toBeInTheDocument();
  });

  it('E5-H7.CA3 - resolve removes the row', async () => {
    get
      .mockResolvedValueOnce(
        page([
          reportCase({ userId: 'acc-1', handle: '@resuelta' }),
          reportCase({ userId: 'acc-2', handle: '@pendiente' }),
        ])
      )
      .mockResolvedValue(page([reportCase({ userId: 'acc-2', handle: '@pendiente' })]));
    post.mockResolvedValueOnce({ data: undefined, status: 204 });

    renderWithProviders(<ModerationPage />);
    await screen.findByText('@resuelta');
    fireEvent.click(within(rowOf('@resuelta')).getByRole('button', { name: 'Resolver' }));

    await waitFor(() => expect(screen.queryByText('@resuelta')).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledWith('/admin/posts/reports/cases/acc-1/resolve');
    expect(screen.getByText('@pendiente')).toBeInTheDocument();
  });

  it('keeps the row and says why when an action fails', async () => {
    get.mockResolvedValue(page([reportCase()]));
    post.mockRejectedValueOnce(
      problem(
        503,
        'users-api-unavailable',
        'No se pudo levantar la revisión de la cuenta. Probá de nuevo en un momento'
      )
    );

    renderWithProviders(<ModerationPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Descartar denuncia' }));

    expect(await screen.findByText(/No se pudo levantar la revisión/)).toBeInTheDocument();
    expect(screen.getByText('@denunciada')).toBeInTheDocument();
  });

  it('says when there is nothing pending', async () => {
    get.mockResolvedValueOnce(page([]));

    renderWithProviders(<ModerationPage />);

    expect(await screen.findByText('No hay denuncias pendientes.')).toBeInTheDocument();
  });

  it('pages with the cursor posts-api hands out', async () => {
    get
      .mockResolvedValueOnce(page([reportCase({ handle: '@primera' })], 'cursor-1'))
      .mockResolvedValueOnce(page([reportCase({ userId: 'acc-9', handle: '@novena' })]));

    renderWithProviders(<ModerationPage />);
    await screen.findByText('@primera');
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    expect(await screen.findByText('@novena')).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith('/admin/posts/reports/cases', {
      params: { cursor: 'cursor-1' },
    });
    expect(screen.getByText('Página 2')).toBeInTheDocument();
  });
});
