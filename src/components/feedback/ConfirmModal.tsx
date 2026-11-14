import React from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import type { ApiError } from '../../services/apiClient';
import { ProblemAlert } from './ProblemAlert';

export interface ConfirmModalProps {
  opened: boolean;
  title: string;
  /** What happens on confirm, said before it runs. */
  description: React.ReactNode;
  confirmLabel: string;
  /** While true the confirm button shows a spinner and cancelling is locked. */
  loading?: boolean;
  /** The last error of the action; the modal stays open to try again. */
  error?: ApiError | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * An action that cannot be undone and needs no reason, like clearing the
 * content of a post (E5-H10). The screen owns the action and its request; this
 * only asks before it runs and shows how the request went.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  opened,
  title,
  description,
  confirmLabel,
  loading = false,
  error = null,
  onConfirm,
  onClose,
}) => (
  <Modal opened={opened} onClose={onClose} title={title} centered>
    <Stack gap="md">
      <Text size="sm">{description}</Text>
      <ProblemAlert error={error} />
      <Group justify="flex-end">
        <Button variant="default" disabled={loading} onClick={onClose}>
          Cancelar
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  </Modal>
);
