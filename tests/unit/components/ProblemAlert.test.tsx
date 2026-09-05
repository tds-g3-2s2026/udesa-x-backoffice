import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { ProblemAlert } from '../../../src/components';
import type { ApiError } from '../../../src/services/apiClient';
import { renderWithProviders } from '../helpers/render';

const error: ApiError = {
  status: 401,
  code: 'invalid-credentials',
  title: 'No se pudo iniciar sesión',
  detail: 'Credenciales inválidas',
};

describe('ProblemAlert', () => {
  it('renders nothing without an error', () => {
    renderWithProviders(<ProblemAlert error={null} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the title and detail from the backend', () => {
    renderWithProviders(<ProblemAlert error={error} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('No se pudo iniciar sesión');
    expect(alert).toHaveTextContent('Credenciales inválidas');
  });

  it('lists field errors when the backend sends them', () => {
    renderWithProviders(
      <ProblemAlert
        error={{
          ...error,
          status: 422,
          code: 'validation-failed',
          errors: [
            { field: 'email', message: 'Formato inválido' },
            { field: 'password', message: 'Requerida' },
          ],
        }}
      />
    );

    expect(screen.getByRole('list')).toHaveTextContent('email: Formato inválido');
    expect(screen.getByRole('list')).toHaveTextContent('password: Requerida');
  });

  it('offers a close button only when a handler is given', () => {
    const onClose = vi.fn();
    const { rerender } = renderWithProviders(<ProblemAlert error={error} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<ProblemAlert error={error} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
