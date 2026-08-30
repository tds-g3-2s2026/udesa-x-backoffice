import React from 'react';
import { Title, Text, Stack, Card, Badge, Group, Button, Table } from '@mantine/core';

interface ReportItem {
  id: string;
  type: 'post' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved';
}

const mockReports: ReportItem[] = [
  {
    id: 'rep-01',
    type: 'post',
    targetId: 'post-1049',
    reason: 'Spam / Misinformation',
    status: 'pending',
  },
  { id: 'rep-02', type: 'user', targetId: 'user-8842', reason: 'Harassment', status: 'pending' },
];

export const ModerationPage: React.FC = () => {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Moderation Queue</Title>
        <Text c="dimmed" size="sm">
          Review reported posts and users (E5-H7)
        </Text>
      </div>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Report ID</Table.Th>
              <Table.Th>Target Type</Table.Th>
              <Table.Th>Target ID</Table.Th>
              <Table.Th>Reason</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {mockReports.map((rep) => (
              <Table.Tr key={rep.id}>
                <Table.Td fw={500}>{rep.id}</Table.Td>
                <Table.Td>
                  <Badge color={rep.type === 'post' ? 'blue' : 'violet'} variant="light">
                    {rep.type}
                  </Badge>
                </Table.Td>
                <Table.Td>{rep.targetId}</Table.Td>
                <Table.Td>{rep.reason}</Table.Td>
                <Table.Td>
                  <Badge color="yellow" variant="outline">
                    {rep.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" color="green" variant="light">
                      Approve
                    </Button>
                    <Button size="xs" color="red" variant="light">
                      Remove
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
};
