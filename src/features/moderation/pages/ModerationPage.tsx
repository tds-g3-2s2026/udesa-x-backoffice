import React, { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { DataTable, type DataTableColumn, ProblemAlert, ReasonModal } from '../../../components';
import { type ApiError, toApiError } from '../../../services/apiClient';
import {
  REPORT_REASON,
  type ReportCase,
  type ReportCasePage,
  dismissCase,
  listCases,
  resolveCase,
  suspendAccount,
} from '../api';

/** Same limit users-api applies to the reason of a block. */
const SUSPEND_REASON_MAX_LENGTH = 500;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * The inbox of reported accounts (E5-H7). The order is posts-api's, most
 * different reporters first, and it is not changed here. Each case is closed
 * by dismissing it, suspending the account or resolving it.
 */
export const ModerationPage: React.FC = () => {
  const queryClient = useQueryClient();
  // One cursor per page already visited, the same as the account search.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const [suspending, setSuspending] = useState<ReportCase | null>(null);
  const [actionError, setActionError] = useState<ApiError | null>(null);

  const cases = useQuery({
    queryKey: ['report-cases', cursor],
    queryFn: () => listCases(cursor),
  });

  // The row leaves at once (CA.3), and the page is asked again so the next
  // case moves up into the place it left.
  const removeCase = (userId: string) => {
    queryClient.setQueryData<ReportCasePage>(
      ['report-cases', cursor],
      (page) => page && { ...page, items: page.items.filter((one) => one.userId !== userId) }
    );
    void queryClient.invalidateQueries({ queryKey: ['report-cases'] });
  };

  const onAction = {
    onMutate: () => setActionError(null),
    onError: (error: unknown) => setActionError(toApiError(error)),
    onSuccess: (_: void, userId: string) => removeCase(userId),
  };
  const dismiss = useMutation({ mutationFn: dismissCase, ...onAction });
  const resolve = useMutation({ mutationFn: resolveCase, ...onAction });

  const suspend = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      // Blocked first: if users-api refuses, nothing is resolved and the case
      // stays in the inbox. Blocking again is harmless, so a retry after a
      // failed resolve just blocks the same and resolves.
      await suspendAccount(userId, reason);
      await resolveCase(userId);
    },
    onSuccess: (_, { userId }) => {
      suspend.reset();
      setSuspending(null);
      removeCase(userId);
    },
  });

  const closeSuspending = () => {
    suspend.reset();
    setSuspending(null);
  };

  const busy = (userId: string) =>
    (dismiss.isPending && dismiss.variables === userId) ||
    (resolve.isPending && resolve.variables === userId) ||
    (suspend.isPending && suspend.variables?.userId === userId);

  const columns: DataTableColumn<ReportCase>[] = [
    {
      key: 'account',
      header: 'Cuenta',
      render: (one) => (
        <Link to="/users/$userId" params={{ userId: one.userId }}>
          <Text size="sm" fw={600} c="blue">
            {one.handle ?? 'Cuenta sin handle'}
          </Text>
        </Link>
      ),
    },
    {
      key: 'reporters',
      header: 'Denunciantes',
      render: (one) => (
        <Text size="sm" fw={700}>
          {one.distinctReporters}
        </Text>
      ),
    },
    {
      key: 'reports',
      header: 'Denuncias',
      render: (one) => <Text size="sm">{one.reports}</Text>,
    },
    {
      key: 'last',
      header: 'Último reporte',
      render: (one) => <Text size="sm">{formatDateTime(one.lastReportedAt)}</Text>,
    },
    {
      key: 'reasons',
      header: 'Motivos',
      render: (one) => (
        <Group gap={4}>
          {one.reasons.map((reason) => (
            <Badge key={reason} color="gray" variant="light">
              {REPORT_REASON[reason]}
            </Badge>
          ))}
        </Group>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (one) => (
        <Group gap="xs" wrap="nowrap">
          <Button
            size="xs"
            variant="default"
            disabled={busy(one.userId)}
            onClick={() => dismiss.mutate(one.userId)}
          >
            Descartar denuncia
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            disabled={busy(one.userId)}
            onClick={() => setSuspending(one)}
          >
            Suspender cuenta
          </Button>
          <Button
            size="xs"
            variant="light"
            disabled={busy(one.userId)}
            onClick={() => resolve.mutate(one.userId)}
          >
            Resolver
          </Button>
        </Group>
      ),
    },
  ];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Denuncias</Title>
        <Text c="dimmed" size="sm">
          Cuentas con denuncias pendientes, primero la denunciada por más personas distintas (E5-H7)
        </Text>
      </div>

      <ProblemAlert error={actionError} onClose={() => setActionError(null)} />

      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="sm">
          <DataTable
            columns={columns}
            rows={cases.data?.items ?? []}
            rowKey={(one) => one.userId}
            loading={cases.isPending}
            error={cases.isError ? toApiError(cases.error) : null}
            emptyMessage="No hay denuncias pendientes."
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
                disabled={!cases.data?.nextCursor}
                onClick={() =>
                  setCursors((visited) => [...visited, cases.data?.nextCursor ?? null])
                }
              >
                Siguiente
              </Button>
            </Group>
          </Group>
        </Stack>
      </Card>

      <ReasonModal
        opened={suspending !== null}
        title={`Suspender ${suspending?.handle ?? 'cuenta'}`}
        description="La cuenta se bloquea con este motivo, pierde el acceso al instante y el caso se resuelve. El dueño no ve el motivo."
        confirmLabel="Suspender cuenta"
        maxLength={SUSPEND_REASON_MAX_LENGTH}
        loading={suspend.isPending}
        error={suspend.isError ? toApiError(suspend.error) : null}
        onConfirm={(reason) => suspending && suspend.mutate({ userId: suspending.userId, reason })}
        onClose={closeSuspending}
      />
    </Stack>
  );
};
