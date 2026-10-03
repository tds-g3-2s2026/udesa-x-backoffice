import React from 'react';
import { Badge, Button, Card, Group, Loader, Stack, Table, Text, Title } from '@mantine/core';
import { useQueries } from '@tanstack/react-query';
import { IconRefresh } from '@tabler/icons-react';
import { HEALTH_REFRESH_INTERVAL_MS, SERVICES, fetchHealth } from '../api';

export const HealthPage: React.FC = () => {
  // One query per service, so each row settles on its own and a slow one holds no other back.
  const checks = useQueries({
    queries: SERVICES.map((service) => ({
      queryKey: ['health', service],
      queryFn: () => fetchHealth(service),
      // A retry would push the red past the timeout, which is what marks a service as down.
      retry: false,
      refetchInterval: HEALTH_REFRESH_INTERVAL_MS,
    })),
  });

  const refreshAll = () => checks.forEach((check) => void check.refetch());

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Microservices Health</Title>
          <Text c="dimmed" size="sm">
            Estado de cada servicio desplegado. Se actualiza solo cada 30 segundos.
          </Text>
        </div>
        <Button leftSection={<IconRefresh size={16} />} variant="light" onClick={refreshAll}>
          Actualizar
        </Button>
      </Group>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Servicio</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Versión</Table.Th>
              <Table.Th>Latencia</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {SERVICES.map((service, index) => {
              const check = checks[index];
              return (
                <Table.Tr key={service}>
                  <Table.Td fw={500}>{service}</Table.Td>
                  <Table.Td>
                    {check.isPending ? (
                      <Loader size="xs" aria-label="Consultando" />
                    ) : (
                      <Badge color={check.isSuccess ? 'green' : 'red'} variant="light">
                        {check.isSuccess ? 'En línea' : 'Caído'}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>{check.isSuccess ? check.data.version : '—'}</Table.Td>
                  <Table.Td>{check.isSuccess ? `${check.data.latencyMs} ms` : '—'}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};
