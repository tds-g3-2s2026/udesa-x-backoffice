import React, { useState } from 'react';
import { Modal, Stack, Text, Textarea } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { ProblemAlert, SubmitButton } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { blockAccount } from '../api';

/** Same limit users-api applies, counted without the spaces around. */
const REASON_MAX_LENGTH = 500;

export interface BlockAccountModalProps {
  opened: boolean;
  account: { id: string; handle: string };
  onClose: () => void;
  onBlocked: () => void;
}

/**
 * Asks for the reason before blocking an account (E5-H5 CA.1). The reason is
 * what explains the sanction later; the owner never sees it.
 */
export const BlockAccountModal: React.FC<BlockAccountModalProps> = ({
  opened,
  account,
  onClose,
  onBlocked,
}) => {
  const [reason, setReason] = useState('');
  const missingReason = reason.trim() === '';

  const block = useMutation({
    mutationFn: () => blockAccount(account.id, reason.trim()),
    onSuccess: () => {
      setReason('');
      block.reset();
      onBlocked();
    },
  });

  // The reason and the last error belong to the attempt that is closing.
  const close = () => {
    setReason('');
    block.reset();
    onClose();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    // The disabled button already prevents it; Enter in another field must too.
    if (!missingReason) {
      block.mutate();
    }
  };

  return (
    <Modal opened={opened} onClose={close} title={`Bloquear ${account.handle}`} centered>
      <form onSubmit={submit} noValidate>
        <Stack gap="md">
          <Text size="sm">
            La cuenta pierde el acceso al instante y se cierran todas sus sesiones. El motivo queda
            guardado para el equipo; el dueño no lo ve.
          </Text>
          <ProblemAlert
            error={block.isError ? toApiError(block.error) : null}
            onClose={() => block.reset()}
          />
          <Textarea
            label="Motivo"
            placeholder="Qué regla incumplió y dónde"
            required
            withAsterisk
            rows={4}
            maxLength={REASON_MAX_LENGTH}
            description={`${reason.length}/${REASON_MAX_LENGTH}`}
            disabled={block.isPending}
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
          <SubmitButton color="red" loading={block.isPending} disabled={missingReason} fullWidth>
            Bloquear cuenta
          </SubmitButton>
        </Stack>
      </form>
    </Modal>
  );
};
