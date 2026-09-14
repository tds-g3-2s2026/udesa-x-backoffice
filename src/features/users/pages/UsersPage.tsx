import React, { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconRefresh, IconUserPlus } from '@tabler/icons-react';
import { DataTable, type DataTableColumn, ProblemAlert } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import {
  type Administrator,
  type AdministratorCredential,
  listAdministrators,
  resetTemporaryPassword,
} from '../api';
import { CreateAdminModal } from '../components/CreateAdminModal';
import { TemporaryPasswordModal } from '../components/TemporaryPasswordModal';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadministrador',
  moderator: 'Moderador',
};

const formatDeadline = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

const Credential: React.FC<{ administrator: Administrator }> = ({ administrator }) => {
  if (administrator.temporary_password_status === null) {
    return (
      <Text size="sm" c="dimmed">
        Contraseña propia
      </Text>
    );
  }
  if (administrator.temporary_password_status === 'expired') {
    return (
      <Badge color="red" variant="light">
        Temporal vencida
      </Badge>
    );
  }
  return (
    <Badge color="yellow" variant="light">
      Temporal, vence {formatDeadline(administrator.temporary_password_expires_at)}
    </Badge>
  );
};

export const UsersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  // Set by whichever of the two mutations produced a password to show.
  const [credential, setCredential] = useState<AdministratorCredential | null>(null);

  const administrators = useQuery({
    queryKey: ['administrators'],
    queryFn: listAdministrators,
  });

  const refreshList = () => queryClient.invalidateQueries({ queryKey: ['administrators'] });

  const regenerate = useMutation({
    mutationFn: (id: string) => resetTemporaryPassword(id),
    onSuccess: (fresh) => {
      setCredential(fresh);
      void refreshList();
    },
  });

  const columns: DataTableColumn<Administrator>[] = [
    {
      key: 'account',
      header: 'Administrador',
      render: (administrator) => (
        <div>
          <Text size="sm" fw={600}>
            {administrator.handle}
          </Text>
          <Text size="xs" c="dimmed">
            {administrator.email}
          </Text>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      render: (administrator) => (
        <Badge color={administrator.role === 'superadmin' ? 'violet' : 'blue'} variant="light">
          {ROLE_LABELS[administrator.role] ?? administrator.role}
        </Badge>
      ),
    },
    {
      key: 'credential',
      header: 'Credencial',
      render: (administrator) => <Credential administrator={administrator} />,
    },
    {
      key: 'actions',
      header: '',
      width: 160,
      render: (administrator) =>
        // An account that already chose its password has nothing to regenerate,
        // and the backend refuses it: taking it over is not unblocking it.
        administrator.temporary_password_status === null ? null : (
          <Button
            size="xs"
            variant="light"
            leftSection={<IconRefresh size={14} />}
            loading={regenerate.isPending && regenerate.variables === administrator.id}
            onClick={() => regenerate.mutate(administrator.id)}
          >
            Regenerar
          </Button>
        ),
    },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Administradores</Title>
          <Text c="dimmed" size="sm">
            Altas de moderadores y superadministradores, y el estado de sus contraseñas temporales
            (E5-H1)
          </Text>
        </div>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setCreating(true)}>
          Crear administrador
        </Button>
      </Group>

      <ProblemAlert
        error={regenerate.isError ? toApiError(regenerate.error) : null}
        onClose={() => regenerate.reset()}
      />

      <Card shadow="sm" padding="md" radius="md" withBorder>
        <DataTable
          columns={columns}
          rows={administrators.data ?? []}
          rowKey={(administrator) => administrator.id}
          loading={administrators.isPending}
          error={administrators.isError ? toApiError(administrators.error) : null}
          emptyMessage="Todavía no hay administradores"
        />
      </Card>

      <CreateAdminModal
        opened={creating}
        onClose={() => setCreating(false)}
        onCreated={(fresh) => {
          setCreating(false);
          setCredential(fresh);
          void refreshList();
        }}
      />
      <TemporaryPasswordModal credential={credential} onClose={() => setCredential(null)} />
    </Stack>
  );
};
