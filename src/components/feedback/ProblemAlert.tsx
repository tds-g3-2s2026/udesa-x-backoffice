import React from 'react';
import { Alert, List, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { ApiError } from '../../services/apiClient';

export interface ProblemAlertProps {
  /** `null` renders nothing, so callers can pass the mutation error straight in. */
  error: ApiError | null;
  onClose?: () => void;
}

/**
 * How a backend error looks, everywhere. Title and detail come from the
 * Problem Details response; field errors, when present, are listed under it.
 */
export const ProblemAlert: React.FC<ProblemAlertProps> = ({ error, onClose }) => {
  if (!error) {
    return null;
  }

  return (
    <Alert
      role="alert"
      color="red"
      variant="light"
      title={error.title}
      icon={<IconAlertCircle size={18} />}
      withCloseButton={onClose !== undefined}
      onClose={onClose}
    >
      <Text size="sm">{error.detail}</Text>
      {error.errors && error.errors.length > 0 && (
        <List size="sm" mt="xs">
          {error.errors.map((fieldError) => (
            <List.Item key={`${fieldError.field}:${fieldError.message}`}>
              <Text span fw={600}>
                {fieldError.field}
              </Text>
              : {fieldError.message}
            </List.Item>
          ))}
        </List>
      )}
    </Alert>
  );
};
