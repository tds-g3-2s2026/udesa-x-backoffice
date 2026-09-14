import React from 'react';
import { Alert, Button, Code, CopyButton, Group, Modal, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconCopy } from '@tabler/icons-react';
import type { AdministratorCredential } from '../api';

export interface TemporaryPasswordModalProps {
  /** `null` keeps the modal closed; a credential opens it. */
  credential: AdministratorCredential | null;
  onClose: () => void;
}

/**
 * The one screen where a password is readable.
 *
 * The backend stores only its hash, so closing this modal without passing the
 * password on means the account has to be regenerated. The warning says so,
 * and the close button is the only way out: no click outside, no Escape.
 */
export const TemporaryPasswordModal: React.FC<TemporaryPasswordModalProps> = ({
  credential,
  onClose,
}) => (
  <Modal
    opened={credential !== null}
    onClose={onClose}
    title="Contraseña temporal"
    closeOnClickOutside={false}
    closeOnEscape={false}
    withCloseButton={false}
    centered
  >
    {credential && (
      <Stack gap="md">
        <Text size="sm">
          Pasale esta contraseña a <strong>{credential.email}</strong>. Le van a pedir que elija una
          propia la primera vez que entre.
        </Text>

        <Group gap="sm" wrap="nowrap">
          <Code data-testid="temporary-password" style={{ flex: 1, fontSize: 16, padding: 12 }}>
            {credential.temporary_password}
          </Code>
          <CopyButton value={credential.temporary_password}>
            {({ copied, copy }) => (
              <Button
                variant="light"
                color={copied ? 'green' : 'blue'}
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                onClick={copy}
              >
                {copied ? 'Copiada' : 'Copiar'}
              </Button>
            )}
          </CopyButton>
        </Group>

        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={18} />}>
          Es la única vez que se muestra, y vence en 24 horas. Si se pierde hay que generar otra
          desde el listado.
        </Alert>

        <Group justify="flex-end">
          <Button onClick={onClose}>Ya la copié</Button>
        </Group>
      </Stack>
    )}
  </Modal>
);
