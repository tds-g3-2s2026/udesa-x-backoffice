import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AuditPage } from '../../../../src/features/audit/pages/AuditPage';
import { listAuditEntries, type AuditEntry } from '../../../../src/features/audit/api';
import { renderWithProviders } from '../../helpers/render';

vi.mock('../../../../src/features/audit/api', () => ({ listAuditEntries: vi.fn() }));
const list = vi.mocked(listAuditEntries);
const entry: AuditEntry = {
  id: 'audit-1',
  occurred_at: '2026-10-25T10:00:00Z',
  actor_id: 'admin-1',
  actor_email: 'admin@udesa.edu.ar',
  action: 'user.blocked',
  target_type: 'user',
  target_id: 'account-1',
  details: {},
};
beforeEach(() => {
  list.mockReset();
});

it('test_e5_h6_ca1_shows_email_action_entity_and_timestamp', async () => {
  list.mockResolvedValue({ items: [entry], total: 1 });
  const { container } = renderWithProviders(<AuditPage />);
  expect(await screen.findByText(entry.actor_email)).toBeInTheDocument();
  expect(screen.getByText('Bloqueó una cuenta')).toBeInTheDocument();
  expect(screen.getByText('Cuenta: account-1')).toBeInTheDocument();
  expect(container.querySelector('time')).toHaveAttribute('datetime', entry.occurred_at);
});

it('test_e5_h6_ca2_the_page_has_no_edit_or_delete_actions', async () => {
  list.mockResolvedValue({ items: [entry], total: 1 });
  renderWithProviders(<AuditPage />);
  await screen.findByText(entry.actor_email);
  expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).not.toBeInTheDocument();
});

it('test_e5_h6_ca3_pages_keep_the_newest_first_order', async () => {
  list.mockImplementation(async (_limit, offset) => ({
    items: [{ ...entry, actor_email: offset === 0 ? 'newest@udesa.edu.ar' : 'older@udesa.edu.ar' }],
    total: 21,
  }));
  renderWithProviders(<AuditPage />);
  await screen.findByText('newest@udesa.edu.ar');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await screen.findByText('older@udesa.edu.ar');
  expect(list).toHaveBeenLastCalledWith(20, 20);
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  await screen.findByText('newest@udesa.edu.ar');
  expect(screen.getByText('Página 1')).toBeInTheDocument();
});

it('shows loading and empty states', async () => {
  let resolve!: (value: { items: AuditEntry[]; total: number }) => void;
  list.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  renderWithProviders(<AuditPage />);
  expect(screen.getByText('Cargando...')).toBeInTheDocument();
  resolve({ items: [], total: 0 });
  expect(await screen.findByText('No hay registros de auditoría')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
});

it('shows an error and allows retrying', async () => {
  list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: [entry], total: 1 });
  renderWithProviders(<AuditPage />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByText(entry.actor_email)).toBeInTheDocument());
});
