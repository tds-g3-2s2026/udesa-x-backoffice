import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ReasonModal, type ReasonModalProps } from '../../../src/components';
import { renderWithProviders } from '../helpers/render';

const renderModal = (props: Partial<ReasonModalProps> = {}) => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const view = renderWithProviders(
    <ReasonModal
      opened
      title="Bloquear @mariag"
      description="La cuenta pierde el acceso al instante."
      confirmLabel="Bloquear cuenta"
      maxLength={500}
      onConfirm={onConfirm}
      onClose={onClose}
      {...props}
    />
  );
  return { onConfirm, onClose, ...view };
};

const typeReason = (value: string) =>
  fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value } });

const confirm = () => screen.getByRole('button', { name: 'Bloquear cuenta' });

describe('ReasonModal', () => {
  it('E5-H5.CA1 - confirm stays disabled without a reason', () => {
    renderModal();

    expect(confirm()).toBeDisabled();
    // Only spaces is no reason either: users-api would refuse it the same.
    typeReason('   \n ');
    expect(confirm()).toBeDisabled();
    typeReason('Spam');
    expect(confirm()).toBeEnabled();
  });

  it('E5-H5.CA1 - hands over the reason trimmed', () => {
    const { onConfirm } = renderModal();

    typeReason('  Spam reiterado en respuestas  ');
    fireEvent.click(confirm());

    expect(onConfirm).toHaveBeenCalledWith('Spam reiterado en respuestas');
  });

  it('does not confirm when the form is submitted without a reason', () => {
    const { onConfirm } = renderModal();

    // Enter submits the form even with the button disabled.
    fireEvent.submit(confirm().closest('form') as HTMLFormElement);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the problem of the backend and keeps the reason', () => {
    renderModal({
      error: {
        status: 422,
        code: 'administrator-cannot-be-blocked',
        title: 'No se pudo bloquear la cuenta',
        detail: 'Las cuentas de administradores no se bloquean',
      },
    });
    typeReason('Spam');

    expect(screen.getByText('Las cuentas de administradores no se bloquean')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/)).toHaveValue('Spam');
  });

  it('locks the field while the action runs', () => {
    renderModal({ loading: true });

    expect(screen.getByLabelText(/Motivo/)).toBeDisabled();
  });

  it('counts the characters against the limit of the backend', () => {
    renderModal();

    typeReason('Spam');

    expect(screen.getByText('4/500')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo/)).toHaveAttribute('maxlength', '500');
  });

  it('forgets the reason once it is closed and opened again', async () => {
    const { onClose, rerender } = renderModal();
    typeReason('Spam');

    fireEvent.keyDown(screen.getByLabelText(/Motivo/), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    const props = {
      title: 'Bloquear @mariag',
      description: 'La cuenta pierde el acceso al instante.',
      confirmLabel: 'Bloquear cuenta',
      maxLength: 500,
      onConfirm: vi.fn(),
      onClose,
    };
    rerender(<ReasonModal opened={false} {...props} />);
    // Unmounted once the closing transition ends, not at once.
    await waitFor(() => expect(screen.queryByLabelText(/Motivo/)).not.toBeInTheDocument());
    rerender(<ReasonModal opened {...props} />);

    expect(await screen.findByLabelText(/Motivo/)).toHaveValue('');
  });
});
