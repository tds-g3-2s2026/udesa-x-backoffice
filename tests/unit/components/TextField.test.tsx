import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TextField } from '../../../src/components';
import { renderWithProviders } from '../helpers/render';

describe('TextField', () => {
  it('associates the label with the input', () => {
    renderWithProviders(<TextField label="Email" name="email" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email');
  });

  it('links the error to the input as its accessible description', () => {
    renderWithProviders(<TextField label="Email" error="Ingresá un email válido" />);

    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('Ingresá un email válido');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the input when asked', () => {
    renderWithProviders(<TextField label="Email" disabled />);

    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('marks required fields with an asterisk', () => {
    renderWithProviders(<TextField label="Email" required />);

    expect(screen.getByLabelText(/Email/)).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
