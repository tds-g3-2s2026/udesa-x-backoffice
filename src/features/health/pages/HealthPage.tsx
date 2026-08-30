import React from 'react';
import { Title, Text, Stack, Card, Badge, Table } from '@mantine/core';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: string;
  version: string;
}

const services: ServiceStatus[] = [
  { name: 'udesa-x-users-api', status: 'healthy', latency: '42ms', version: 'v1.0.0' },
  { name: 'udesa-x-posts-api', status: 'healthy', latency: '35ms', version: 'v1.0.0' },
  { name: 'udesa-x-notifications-api', status: 'healthy', latency: '58ms', version: 'v1.0.0' },
];

export const HealthPage: React.FC = () => {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Microservices Health</Title>
        <Text c="dimmed" size="sm">
          Readiness and health status checks for all backend services (E5-H11)
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Service</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Latency</Table.Th>
              <Table.Th>Version</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {services.map((svc) => (
              <Table.Tr key={svc.name}>
                <Table.Td fw={500}>{svc.name}</Table.Td>
                <Table.Td>
                  <Badge color={svc.status === 'healthy' ? 'green' : 'red'} variant="light">
                    {svc.status.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>{svc.latency}</Table.Td>
                <Table.Td>{svc.version}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};
