import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { PasswordField } from '../../../src/components';
import { renderWithProviders } from '../helpers/render';

describe('PasswordField', () => {
  it('associates the label with a password input', () => {
    renderWithProviders(<PasswordField label="Contraseña" />);

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
  });

  it('links the error to the input as its accessible description', () => {
    renderWithProviders(<PasswordField label="Contraseña" error="Requerida" />);

    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Requerida');
  });

  it('disables the input when asked', () => {
    renderWithProviders(<PasswordField label="Contraseña" disabled />);

    expect(screen.getByLabelText('Contraseña')).toBeDisabled();
  });
});
