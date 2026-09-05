import React from 'react';
import { PasswordInput, type PasswordInputProps } from '@mantine/core';

export interface PasswordFieldProps extends Omit<
  PasswordInputProps,
  'label' | 'error' | 'withAsterisk'
> {
  label: string;
  error?: React.ReactNode;
}

/** The password twin of `TextField`, with the reveal toggle Mantine provides. */
export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  error,
  required,
  ...props
}) => (
  <PasswordInput
    label={label}
    error={error}
    required={required}
    withAsterisk={required}
    {...props}
  />
);
