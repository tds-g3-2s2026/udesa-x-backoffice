import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { SubmitButton } from '../../../src/components';
import { renderWithProviders } from '../helpers/render';

describe('SubmitButton', () => {
  it('submits the enclosing form', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <SubmitButton>Entrar</SubmitButton>
      </form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('cannot be clicked while loading', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <SubmitButton loading>Entrar</SubmitButton>
      </form>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-loading');
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
