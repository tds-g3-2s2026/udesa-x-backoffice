import React from 'react';
import { Title, Text, SimpleGrid, Card, Group, ThemeIcon, Stack } from '@mantine/core';
import { IconUsers, IconMessageDots, IconServer, IconAlertTriangle } from '@tabler/icons-react';

export const DashboardPage: React.FC = () => {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Platform Overview</Title>
        <Text c="dimmed" size="sm">
          Real-time metrics and system indicators for UdeSA-X
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Active Users
              </Text>
              <Text fw={700} size="xl">
                1,248
              </Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={38} radius="md">
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Posts Today
              </Text>
              <Text fw={700} size="xl">
                4,892
              </Text>
            </div>
            <ThemeIcon color="teal" variant="light" size={38} radius="md">
              <IconMessageDots size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Microservices
              </Text>
              <Text fw={700} size="xl">
                3 Online
              </Text>
            </div>
            <ThemeIcon color="green" variant="light" size={38} radius="md">
              <IconServer size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Pending Reports
              </Text>
              <Text fw={700} size="xl">
                12
              </Text>
            </div>
            <ThemeIcon color="orange" variant="light" size={38} radius="md">
              <IconAlertTriangle size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>
    </Stack>
  );
};
