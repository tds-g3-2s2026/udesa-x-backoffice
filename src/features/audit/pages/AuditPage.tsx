import { useState } from 'react';
import { Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { DataTable, type DataTableColumn } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { useAuthStore } from '../../../stores/authStore';
import { type AuditEntry, listAuditEntries } from '../api';

const PAGE_SIZE = 20;
const ACTION_LABELS: Record<string, string> = {
  'admin.created': 'Creó un administrador',
  'admin.temporary_password_reset': 'Regeneró una contraseña temporal',
  'user.blocked': 'Bloqueó una cuenta',
  'report.dismissed': 'Descartó denuncias',
  'report.resolved': 'Resolvió denuncias',
};

function AuditTarget({ entry }: { entry: AuditEntry }) {
  const role = useAuthStore((state) => state.user?.role);
  if (entry.target_type !== 'user') {
    return <Text size="sm">{entry.target_type}</Text>;
  }
  if (!entry.target_handle) {
    return (
      <Text size="sm" c="dimmed">
        Cuenta no disponible
      </Text>
    );
  }
  if (entry.action === 'admin.created' || entry.action === 'admin.temporary_password_reset') {
    return role === 'superadmin' ? (
      <Link to="/users">
        <Text component="span" size="sm" c="blue">
          {entry.target_handle}
        </Text>
      </Link>
    ) : (
      <Text size="sm">{entry.target_handle}</Text>
    );
  }
  return (
    <Link to="/users/$userId" params={{ userId: entry.target_id }}>
      <Text component="span" size="sm" c="blue">
        {entry.target_handle}
      </Text>
    </Link>
  );
}

const columns: DataTableColumn<AuditEntry>[] = [
  {
    key: 'date',
    header: 'Fecha',
    render: (entry) => (
      <time dateTime={entry.occurred_at}>
        {new Date(entry.occurred_at).toLocaleString('es-AR', { hour12: false })}
      </time>
    ),
  },
  { key: 'actor', header: 'Administrador', render: (entry) => entry.actor_email },
  {
    key: 'action',
    header: 'Acción',
    render: (entry) => ACTION_LABELS[entry.action] ?? entry.action,
  },
  {
    key: 'target',
    header: 'Entidad afectada',
    render: (entry) => <AuditTarget entry={entry} />,
  },
];

export function AuditPage() {
  const [offset, setOffset] = useState(0);
  const audit = useQuery({
    queryKey: ['audit', offset],
    queryFn: () => listAuditEntries(PAGE_SIZE, offset),
  });
  return (
    <Stack gap="lg">
      <Title order={2}>Auditoría</Title>
      <Text c="dimmed">Acciones administrativas, de la más reciente a la más antigua.</Text>
      <Card withBorder padding="md" radius="md">
        <DataTable
          columns={columns}
          rows={audit.data?.items ?? []}
          rowKey={(entry) => entry.id}
          loading={audit.isPending}
          error={audit.isError ? toApiError(audit.error) : null}
          emptyMessage="No hay registros de auditoría"
        />
      </Card>
      <Group justify="space-between">
        <Button
          variant="default"
          disabled={offset === 0 || audit.isFetching}
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
        >
          Anterior
        </Button>
        <Text size="sm">Página {Math.floor(offset / PAGE_SIZE) + 1}</Text>
        <Button
          variant="default"
          disabled={
            !audit.data ||
            audit.isError ||
            audit.isFetching ||
            offset + PAGE_SIZE >= audit.data.total
          }
          onClick={() => setOffset(offset + PAGE_SIZE)}
        >
          Siguiente
        </Button>
      </Group>
      {audit.isError && <Button onClick={() => void audit.refetch()}>Reintentar</Button>}
    </Stack>
  );
}
