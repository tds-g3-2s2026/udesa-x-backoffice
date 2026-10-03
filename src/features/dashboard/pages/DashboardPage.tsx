import React from 'react';
import {
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  IconAlertTriangle,
  IconMessageDots,
  IconRefresh,
  IconServer,
  IconUsers,
} from '@tabler/icons-react';
import { HEALTH_REFRESH_INTERVAL_MS, SERVICES, fetchHealth } from '../../health/api';
import { fetchAccountMetrics, fetchPostsToday } from '../api';

const REFRESH_INTERVAL_MS = 30_000;

interface StatCardProps {
  label: string;
  color: string;
  icon: React.ReactNode;
  pending: boolean;
  /** `undefined` once settled means the number could not be read. */
  value: string | undefined;
}

const StatCard: React.FC<StatCardProps> = ({ label, color, icon, pending, value }) => (
  <Card shadow="sm" padding="lg" radius="md" withBorder>
    <Group justify="space-between">
      <div>
        <Text size="xs" c="dimmed" fw={700} tt="uppercase">
          {label}
        </Text>
        {pending ? (
          <Loader size="sm" aria-label={`Cargando ${label}`} />
        ) : (
          <Text fw={700} size="xl">
            {value ?? '—'}
          </Text>
        )}
      </div>
      <ThemeIcon color={color} variant="light" size={38} radius="md">
        {icon}
      </ThemeIcon>
    </Group>
  </Card>
);

const formatCount = (count: number | undefined) => count?.toLocaleString('es-AR');

export const DashboardPage: React.FC = () => {
  const accounts = useQuery({
    queryKey: ['dashboard', 'accounts'],
    queryFn: fetchAccountMetrics,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  const postsToday = useQuery({
    queryKey: ['dashboard', 'posts-today'],
    queryFn: fetchPostsToday,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
  // Same keys and options as the health screen, so both share one cache entry per service.
  const checks = useQueries({
    queries: SERVICES.map((service) => ({
      queryKey: ['health', service],
      queryFn: () => fetchHealth(service),
      retry: false,
      refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
    })),
  });

  const online = checks.filter((check) => check.isSuccess).length;

  const refreshAll = () => {
    void accounts.refetch();
    void postsToday.refetch();
    checks.forEach((check) => void check.refetch());
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Platform Overview</Title>
          <Text c="dimmed" size="sm">
            Real-time metrics and system indicators for UdeSA-X
          </Text>
        </div>
        <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={refreshAll}>
          Actualizar
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <StatCard
          label="Active Users"
          color="blue"
          icon={<IconUsers size={24} />}
          pending={accounts.isPending}
          value={formatCount(accounts.data?.active_users)}
        />
        <StatCard
          label="Posts Today"
          color="teal"
          icon={<IconMessageDots size={24} />}
          pending={postsToday.isPending}
          value={formatCount(postsToday.data)}
        />
        <StatCard
          label="Microservices"
          color="green"
          icon={<IconServer size={24} />}
          pending={checks.some((check) => check.isPending)}
          value={`${online}/${SERVICES.length} Online`}
        />
        <StatCard
          label="Accounts Under Review"
          color="orange"
          icon={<IconAlertTriangle size={24} />}
          pending={accounts.isPending}
          value={formatCount(accounts.data?.accounts_under_review)}
        />
      </SimpleGrid>
    </Stack>
  );
};
