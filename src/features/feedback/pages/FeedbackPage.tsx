import React, { useState } from 'react';
import { Button, Card, Group, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DataTable, type DataTableColumn, ProblemAlert } from '../../../components';
import { type ApiError, toApiError } from '../../../services/apiClient';
import {
  type FeedbackMessage,
  type FeedbackMessagePage,
  type FeedbackStatus,
  listFeedback,
  markFeedbackRead,
  resolveFeedback,
} from '../api';

const STATUS_FILTER: Record<FeedbackStatus, { label: string; empty: string }> = {
  pending: { label: 'Pendientes', empty: 'No hay mensajes pendientes.' },
  read: { label: 'Leídos', empty: 'No hay mensajes leídos.' },
  resolved: { label: 'Resueltos', empty: 'No hay mensajes resueltos.' },
};

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * The comments and bug reports sent from the app. Pending is the
 * inbox: marking a message read or resolved moves it to the other filters.
 */
export const FeedbackPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<FeedbackStatus>('pending');
  // One cursor per page already visited, the same as the reports inbox.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const messages = useQuery({
    queryKey: ['feedback', status, cursor],
    queryFn: () => listFeedback(status, cursor),
  });

  // The row leaves at once, and every filter is asked again: the message
  // left one list and arrived at another.
  const removeMessage = (id: string) => {
    queryClient.setQueryData<FeedbackMessagePage>(
      ['feedback', status, cursor],
      (page) => page && { ...page, items: page.items.filter((one) => one.id !== id) }
    );
    void queryClient.invalidateQueries({ queryKey: ['feedback'] });
  };

  const onAction = {
    onMutate: () => setActionError(null),
    onError: (error: unknown) => setActionError(toApiError(error)),
    onSuccess: (_: void, id: string) => removeMessage(id),
  };
  const markRead = useMutation({ mutationFn: markFeedbackRead, ...onAction });
  const resolve = useMutation({ mutationFn: resolveFeedback, ...onAction });

  const busy = (id: string) =>
    (markRead.isPending && markRead.variables === id) ||
    (resolve.isPending && resolve.variables === id);

  const changeStatus = (next: string) => {
    setStatus(next as FeedbackStatus);
    setCursors([null]);
    setActionError(null);
  };

  const columns: DataTableColumn<FeedbackMessage>[] = [
    {
      key: 'account',
      header: 'Cuenta',
      render: (one) =>
        one.account_available ? (
          <Link to="/users/$userId" params={{ userId: one.user_id }}>
            <Text size="sm" fw={600} c="blue">
              {one.handle}
            </Text>
          </Link>
        ) : (
          // The handle stays: it is the copy saved with the message.
          <Stack gap={0}>
            <Text size="sm" fw={600}>
              {one.handle}
            </Text>
            <Text size="xs" c="dimmed">
              Cuenta no disponible
            </Text>
          </Stack>
        ),
    },
    {
      key: 'message',
      header: 'Mensaje',
      // Plain text on purpose: the message is whatever the user typed.
      render: (one) => (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
          {one.message}
        </Text>
      ),
    },
    {
      key: 'device',
      header: 'Dispositivo',
      render: (one) => (
        <Stack gap={0}>
          <Text size="sm">{one.device_os}</Text>
          <Text size="xs" c="dimmed">
            App {one.app_version}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'date',
      header: 'Enviado',
      render: (one) => <Text size="sm">{formatDateTime(one.created_at)}</Text>,
    },
  ];

  // A resolved message is final: nothing is offered on that filter.
  if (status !== 'resolved') {
    columns.push({
      key: 'actions',
      header: 'Acciones',
      render: (one) => (
        <Group gap="xs" wrap="nowrap">
          {status === 'pending' && (
            <Button
              size="xs"
              variant="default"
              disabled={busy(one.id)}
              onClick={() => markRead.mutate(one.id)}
            >
              Marcar leído
            </Button>
          )}
          <Button
            size="xs"
            variant="light"
            disabled={busy(one.id)}
            onClick={() => resolve.mutate(one.id)}
          >
            Resolver
          </Button>
        </Group>
      ),
    });
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Comentarios</Title>
        <Text c="dimmed" size="sm">
          Comentarios y reportes de error enviados desde la app, primero el más reciente
        </Text>
      </div>

      <ProblemAlert error={actionError} onClose={() => setActionError(null)} />

      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="sm">
          <SegmentedControl
            value={status}
            onChange={changeStatus}
            data={(Object.keys(STATUS_FILTER) as FeedbackStatus[]).map((value) => ({
              value,
              label: STATUS_FILTER[value].label,
            }))}
            style={{ alignSelf: 'flex-start' }}
          />
          <DataTable
            columns={columns}
            rows={messages.data?.items ?? []}
            rowKey={(one) => one.id}
            loading={messages.isPending}
            error={messages.isError ? toApiError(messages.error) : null}
            emptyMessage={STATUS_FILTER[status].empty}
          />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Página {cursors.length}
            </Text>
            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                leftSection={<IconChevronLeft size={14} />}
                disabled={cursors.length === 1}
                onClick={() => setCursors((visited) => visited.slice(0, -1))}
              >
                Anterior
              </Button>
              <Button
                variant="default"
                size="xs"
                rightSection={<IconChevronRight size={14} />}
                disabled={!messages.data?.next_cursor}
                onClick={() =>
                  setCursors((visited) => [...visited, messages.data?.next_cursor ?? null])
                }
              >
                Siguiente
              </Button>
            </Group>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};
