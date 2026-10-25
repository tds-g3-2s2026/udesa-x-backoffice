import React, { useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { IconArrowLeft, IconBan } from '@tabler/icons-react';
import { ProblemAlert } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { ACCOUNT_STATUS, getAccount, getAccountCounts } from '../api';
import { BlockAccountModal } from '../components/BlockAccountModal';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const BackToSearch: React.FC = () => (
  <Anchor component={Link} to="/users/search" size="sm">
    <Group gap={4}>
      <IconArrowLeft size={14} />
      Volver a la búsqueda
    </Group>
  </Anchor>
);

const Counter: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Card withBorder radius="md" padding="sm">
    <Text size="xs" c="dimmed">
      {label}
    </Text>
    <Text size="xl" fw={700}>
      {value}
    </Text>
  </Card>
);

export interface AccountDetailPageProps {
  userId: string;
}

/**
 * The detail of an app account (E5-H4): its state and registration date from
 * users-api, its followers and posts from posts-api. Two requests that do not
 * wait for each other: if the counters fail, the account is still shown.
 * From here an administrator blocks the account (E5-H5).
 */
export const AccountDetailPage: React.FC<AccountDetailPageProps> = ({ userId }) => {
  const queryClient = useQueryClient();
  const [blocking, setBlocking] = useState(false);
  const account = useQuery({
    queryKey: ['account', userId],
    queryFn: () => getAccount(userId),
  });
  const counts = useQuery({
    queryKey: ['account-counts', userId],
    queryFn: () => getAccountCounts(userId),
  });

  if (account.isPending) {
    return (
      <Group justify="center" gap="sm" py="xl">
        <Loader size="sm" />
        <Text c="dimmed">Cargando...</Text>
      </Group>
    );
  }

  if (account.isError) {
    return (
      <Stack gap="md">
        <BackToSearch />
        <ProblemAlert error={toApiError(account.error)} />
      </Stack>
    );
  }

  const { data } = account;
  const status = ACCOUNT_STATUS[data.status];
  const blocked = data.status === 'suspended';

  const onBlocked = () => {
    setBlocking(false);
    // The detail shows the new state and its reason, and the search does not
    // keep listing the account as it was.
    void queryClient.invalidateQueries({ queryKey: ['account', userId] });
    void queryClient.invalidateQueries({ queryKey: ['accounts'] });
  };
  const counter = (value: number | undefined) =>
    counts.isPending ? <Loader size="xs" /> : (value ?? '—');

  return (
    <Stack gap="lg">
      <BackToSearch />

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>{data.display_name ?? data.handle}</Title>
              <Text c="dimmed">{data.handle}</Text>
              <Text size="sm">{data.email}</Text>
            </div>
            <Group gap="xs">
              <Badge color={status.color} variant="light" size="lg">
                {status.label}
              </Badge>
              {data.is_email_verified ? null : (
                <Badge color="gray" variant="light" size="lg">
                  Email sin verificar
                </Badge>
              )}
            </Group>
          </Group>

          <Text size="sm">Se registró el {formatDate(data.created_at)}</Text>

          {/* An account blocked before reasons were stored has none to show. */}
          {blocked && data.status_reason ? (
            <Alert
              color="red"
              variant="light"
              title={
                data.status_changed_at
                  ? `Bloqueada el ${formatDate(data.status_changed_at)}`
                  : 'Bloqueada'
              }
            >
              {data.status_reason}
            </Alert>
          ) : null}

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Counter label="Seguidores" value={counter(counts.data?.followers)} />
            <Counter label="Posts" value={counter(counts.data?.posts)} />
          </SimpleGrid>

          <ProblemAlert error={counts.isError ? toApiError(counts.error) : null} />

          {blocked ? null : (
            <Group justify="flex-end">
              <Button
                color="red"
                variant="light"
                leftSection={<IconBan size={16} />}
                onClick={() => setBlocking(true)}
              >
                Bloquear
              </Button>
            </Group>
          )}
        </Stack>
      </Card>

      <BlockAccountModal
        opened={blocking}
        account={data}
        onClose={() => setBlocking(false)}
        onBlocked={onBlocked}
      />
    </Stack>
  );
};
