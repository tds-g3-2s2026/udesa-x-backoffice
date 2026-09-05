import React from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';

export interface TextFieldProps extends Omit<TextInputProps, 'label' | 'error' | 'withAsterisk'> {
  label: string;
  /** Message shown under the field; the field is marked invalid while set. */
  error?: React.ReactNode;
}

/**
 * A labelled text input. Screens use this and never `TextInput` directly, so
 * every form reads the same: label above, error below, asterisk when required.
 */
export const TextField: React.FC<TextFieldProps> = ({ label, error, required, ...props }) => (
  <TextInput label={label} error={error} required={required} withAsterisk={required} {...props} />
);
