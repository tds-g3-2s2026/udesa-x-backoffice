import React, { useState } from 'react';
import { Modal, Stack, Text, Textarea } from '@mantine/core';
import type { ApiError } from '../../services/apiClient';
import { SubmitButton } from '../form/SubmitButton';
import { ProblemAlert } from './ProblemAlert';

export interface ReasonModalProps {
  opened: boolean;
  title: string;
  /** What happens on confirm, said before the reason is asked for. */
  description: React.ReactNode;
  confirmLabel: string;
  /** The backend's limit, counted without the spaces around. */
  maxLength: number;
  /** While true the confirm button shows a spinner and the field is locked. */
  loading?: boolean;
  /** The last error of the action; the modal stays open and keeps the reason. */
  error?: ApiError | null;
  /** Handed the reason already trimmed, and never an empty one. */
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * An action that needs a reason before it runs, like blocking an account
 * (E5-H5 CA.1). The screen owns the action and its request; this only asks for
 * the reason and shows how the request went.
 */
export const ReasonModal: React.FC<ReasonModalProps> = ({ opened, title, onClose, ...form }) => (
  <Modal opened={opened} onClose={onClose} title={title} centered>
    {/* Inside the modal, so closing it unmounts the form and forgets the reason. */}
    <ReasonForm {...form} />
  </Modal>
);

type ReasonFormProps = Omit<ReasonModalProps, 'opened' | 'title' | 'onClose'>;

const ReasonForm: React.FC<ReasonFormProps> = ({
  description,
  confirmLabel,
  maxLength,
  loading = false,
  error = null,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const missingReason = reason.trim() === '';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // The disabled button already prevents it; Enter in the form must too.
    if (!missingReason) {
      onConfirm(reason.trim());
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Stack gap="md">
        <Text size="sm">{description}</Text>
        <ProblemAlert error={error} />
        <Textarea
          label="Motivo"
          placeholder="Qué regla incumplió y dónde"
          required
          withAsterisk
          rows={4}
          maxLength={maxLength}
          description={`${reason.length}/${maxLength}`}
          disabled={loading}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
        />
        <SubmitButton color="red" loading={loading} disabled={missingReason} fullWidth>
          {confirmLabel}
        </SubmitButton>
      </Stack>
    </form>
  );
};
