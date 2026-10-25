import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { BlockAccountModal } from '../../../../src/features/users/components/BlockAccountModal';
import { apiClient } from '../../../../src/services/apiClient';
import { renderWithProviders } from '../../helpers/render';

const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;

const administratorRefused = () =>
  new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    config,
    {},
    {
      status: 422,
      statusText: '',
      headers: {},
      config,
      data: {
        type: 'https://udesa-x.dev/errors/administrator-cannot-be-blocked',
        title: 'No se pudo bloquear la cuenta',
        status: 422,
        detail: 'Las cuentas de administradores no se bloquean',
      },
    }
  );

const post = vi.spyOn(apiClient, 'post');

const renderModal = () => {
  const onBlocked = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <BlockAccountModal
      opened
      account={{ id: 'acc-1', handle: '@mariag' }}
      onClose={onClose}
      onBlocked={onBlocked}
    />
  );
  return { onBlocked, onClose };
};

const typeReason = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value } });

const confirm = () => screen.getByRole('button', { name: 'Bloquear cuenta' });

describe('BlockAccountModal', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('E5-H5.CA1 - confirm stays disabled without a reason', () => {
    renderModal();

    expect(confirm()).toBeDisabled();
    // Only spaces is no reason either: users-api would refuse it the same.
    typeReason('   \n ');
    expect(confirm()).toBeDisabled();
    typeReason('Spam');
    expect(confirm()).toBeEnabled();
  });

  it('E5-H5.CA1 - the reason is sent with the request', async () => {
    post.mockResolvedValueOnce({ data: undefined, status: 204 });
    const { onBlocked } = renderModal();

    typeReason('  Spam reiterado en respuestas  ');
    fireEvent.click(confirm());

    await vi.waitFor(() => expect(onBlocked).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith('/admin/users/acc-1/block', {
      reason: 'Spam reiterado en respuestas',
    });
  });

  it('does not send anything when the form is submitted without a reason', () => {
    renderModal();

    // Enter submits the form even with the button disabled.
    fireEvent.submit(confirm().closest('form') as HTMLFormElement);

    expect(post).not.toHaveBeenCalled();
  });

  it('shows the problem of the backend and stays open', async () => {
    post.mockRejectedValueOnce(administratorRefused());
    const { onBlocked } = renderModal();

    typeReason('Spam');
    fireEvent.click(confirm());

    expect(
      await screen.findByText('Las cuentas de administradores no se bloquean')
    ).toBeInTheDocument();
    expect(onBlocked).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('Spam');
  });

  it('counts the characters against the limit of users-api', () => {
    renderModal();

    typeReason('Spam');

    expect(screen.getByText('4/500')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/)).toHaveAttribute('maxlength', '500');
  });

  it('forgets the reason when it is closed', () => {
    const { onClose } = renderModal();
    typeReason('Spam');

    fireEvent.keyDown(screen.getByLabelText(/Motivo/), { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('');
  });
});
