import React from 'react';
import { Button, type ButtonProps } from '@mantine/core';

export interface SubmitButtonProps extends Omit<ButtonProps, 'loading' | 'disabled'> {
  /** While true the button shows a spinner and ignores clicks. */
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

/**
 * The button that submits a form. `type="submit"` is fixed so the Enter key
 * and the click go through the same `onSubmit`, and a request in flight
 * cannot be sent twice.
 */
export const SubmitButton: React.FC<SubmitButtonProps> = ({
  loading = false,
  disabled = false,
  children,
  ...props
}) => (
  <Button type="submit" loading={loading} disabled={disabled || loading} {...props}>
    {children}
  </Button>
);
