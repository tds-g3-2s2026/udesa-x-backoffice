import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { PostDetailPage } from '../../../../src/features/moderation/pages/PostDetailPage';
import { REMOVED_BY_MODERATION, type AdminPost } from '../../../../src/features/moderation/api';
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

const adminPost = (overrides: Partial<AdminPost> = {}): AdminPost => ({
  id: 'post-1',
  authorId: 'acc-1',
  authorHandle: '@mariag',
  authorDeleted: false,
  content: 'Compren seguidores en mi perfil',
  createdAt: '2026-11-10T15:00:00Z',
  likesCount: 4,
  retweetsCount: 1,
  repliesCount: 2,
  parentId: null,
  images: [{ id: 'img-1', url: 'https://bucket/img-1.png', position: 0 }],
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

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

// The modal opens with a transition: wait for it before pressing its button.
const confirmCleaning = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar Contenido' }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Limpiar contenido' }));
  return dialog;
};

describe('PostDetailPage', () => {
  it('E5-H10.CA1 - offers Limpiar Contenido on the post detail', async () => {
    get.mockResolvedValue(ok(adminPost()));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(await screen.findByText('Compren seguidores en mi perfil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar Contenido' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/admin/posts/post-1');
  });

  it('shows who wrote it, its images and its counters', async () => {
    get.mockResolvedValue(ok(adminPost()));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(await screen.findByRole('link', { name: '@mariag' })).toHaveAttribute(
      'href',
      '/users/acc-1'
    );
    expect(screen.getByRole('img', { name: 'Imagen 1' })).toHaveAttribute(
      'src',
      'https://bucket/img-1.png'
    );
    expect(screen.getByText(/4 me gusta · 1 retweets · 2/)).toBeInTheDocument();
    expect(screen.queryByText('Responde a otra publicación')).not.toBeInTheDocument();
  });

  it('links a reply to the post it answers', async () => {
    get.mockResolvedValue(ok(adminPost({ parentId: 'post-0' })));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(
      await screen.findByRole('link', { name: 'Responde a otra publicación' })
    ).toHaveAttribute('href', '/posts/post-0');
  });

  it('E5-H10.CA2 - asks first, then shows the post with the placeholder', async () => {
    get
      .mockResolvedValueOnce(ok(adminPost()))
      .mockResolvedValue(ok(adminPost({ content: REMOVED_BY_MODERATION, images: [] })));
    post.mockResolvedValue(ok(undefined));
    renderWithProviders(<PostDetailPage postId="post-1" />);
    await screen.findByText('Compren seguidores en mi perfil');

    await confirmCleaning();

    expect(await screen.findByText(REMOVED_BY_MODERATION)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/admin/posts/post-1/clean-content');
    expect(screen.getByText('Limpiada por moderación')).toBeInTheDocument();
    // Already clean: nothing left to clear.
    expect(screen.queryByRole('button', { name: 'Limpiar Contenido' })).not.toBeInTheDocument();
  });

  it('keeps the action when someone wrote the placeholder but the images are still there', async () => {
    get.mockResolvedValue(ok(adminPost({ content: REMOVED_BY_MODERATION })));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(await screen.findByRole('button', { name: 'Limpiar Contenido' })).toBeInTheDocument();
    expect(screen.queryByText('Limpiada por moderación')).not.toBeInTheDocument();
  });

  it('keeps the post as it was and says why when cleaning fails', async () => {
    get.mockResolvedValue(ok(adminPost()));
    post.mockRejectedValue(
      problem(503, 'users-api-unavailable', 'No se pudo obtener la identidad del administrador')
    );
    renderWithProviders(<PostDetailPage postId="post-1" />);
    await screen.findByText('Compren seguidores en mi perfil');

    const dialog = await confirmCleaning();

    expect(
      await within(dialog).findByText('No se pudo obtener la identidad del administrador')
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Compren seguidores en mi perfil')).toBeInTheDocument();
  });

  it('says the post does not exist and goes back to the inbox', async () => {
    get.mockRejectedValue(problem(404, 'post-not-found', 'La publicación no existe'));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(await screen.findByText('La publicación no existe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la bandeja' })).toHaveAttribute(
      'href',
      '/moderation'
    );
  });

  it('does not link the author of a closed account', async () => {
    get.mockResolvedValue(ok(adminPost({ authorHandle: null, authorDeleted: true })));

    renderWithProviders(<PostDetailPage postId="post-1" />);

    expect(await screen.findByText('[Usuario eliminado]')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver a la cuenta' })).not.toBeInTheDocument();
  });
});
