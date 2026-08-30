import React, { useState } from 'react';
import {
  Title,
  Text,
  Stack,
  Card,
  Badge,
  Avatar,
  Group,
  Table,
  TextInput,
  Select,
  Button,
  ActionIcon,
  Menu,
  SimpleGrid,
  ThemeIcon,
  Pagination,
  Box,
} from '@mantine/core';
import {
  IconSearch,
  IconUsers,
  IconUserCheck,
  IconUserOff,
  IconShield,
  IconDotsVertical,
  IconBan,
  IconEye,
  IconUserPlus,
  IconRefresh,
} from '@tabler/icons-react';

interface ManagedUser {
  id: string;
  handle: string;
  fullName: string;
  email: string;
  role: 'student' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'pending_verification';
  joinedDate: string;
  lastLogin: string;
  reportsCount: number;
}

const mockUsers: ManagedUser[] = [
  {
    id: 'usr-001',
    handle: '@jleon',
    fullName: 'Joaquín León Alderete',
    email: 'jleon@udesa.edu.ar',
    role: 'admin',
    status: 'active',
    joinedDate: '2026-08-15',
    lastLogin: '10 mins ago',
    reportsCount: 0,
  },
  {
    id: 'usr-002',
    handle: '@tcasas',
    fullName: 'Tomás Casas',
    email: 'tcasas@udesa.edu.ar',
    role: 'admin',
    status: 'active',
    joinedDate: '2026-08-15',
    lastLogin: '1 hour ago',
    reportsCount: 0,
  },
  {
    id: 'usr-003',
    handle: '@sofia_m',
    fullName: 'Sofía Martínez',
    email: 'smartinez@udesa.edu.ar',
    role: 'moderator',
    status: 'active',
    joinedDate: '2026-08-18',
    lastLogin: '3 hours ago',
    reportsCount: 0,
  },
  {
    id: 'usr-004',
    handle: '@facundo_p',
    fullName: 'Facundo Pérez',
    email: 'fperez@udesa.edu.ar',
    role: 'student',
    status: 'active',
    joinedDate: '2026-08-20',
    lastLogin: '2 days ago',
    reportsCount: 1,
  },
  {
    id: 'usr-005',
    handle: '@crypto_bot',
    fullName: 'Crypto Signals UdeSA',
    email: 'bot99@external.net',
    role: 'student',
    status: 'suspended',
    joinedDate: '2026-08-28',
    lastLogin: '1 day ago',
    reportsCount: 8,
  },
  {
    id: 'usr-006',
    handle: '@maria_g',
    fullName: 'María González',
    email: 'mgonzalez@udesa.edu.ar',
    role: 'student',
    status: 'pending_verification',
    joinedDate: '2026-08-29',
    lastLogin: 'Never',
    reportsCount: 0,
  },
];

const roleBadgeColor: Record<ManagedUser['role'], string> = {
  admin: 'blue',
  moderator: 'violet',
  student: 'gray',
};

const statusBadgeColor: Record<ManagedUser['status'], string> = {
  active: 'green',
  suspended: 'red',
  pending_verification: 'yellow',
};

export const UsersPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [activePage, setActivePage] = useState(1);

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || !roleFilter || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || !statusFilter || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <Stack gap="lg">
      {/* Header section */}
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>User Management</Title>
          <Text c="dimmed" size="sm">
            Search, inspect, and manage user accounts and platform permissions (E5-H4, E5-H5)
          </Text>
        </div>
        <Group>
          <Button leftSection={<IconUserPlus size={16} />} variant="filled" color="blue" size="sm">
            Create Admin / Mod
          </Button>
        </Group>
      </Group>

      {/* Metrics overview */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <Card shadow="xs" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Total Users
              </Text>
              <Text fw={700} size="xl">
                1,248
              </Text>
            </div>
            <ThemeIcon color="blue" variant="light" size={36} radius="md">
              <IconUsers size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="xs" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Active & Verified
              </Text>
              <Text fw={700} size="xl">
                1,192
              </Text>
            </div>
            <ThemeIcon color="green" variant="light" size={36} radius="md">
              <IconUserCheck size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="xs" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Suspended Accounts
              </Text>
              <Text fw={700} size="xl">
                14
              </Text>
            </div>
            <ThemeIcon color="red" variant="light" size={36} radius="md">
              <IconUserOff size={20} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card shadow="xs" padding="md" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                Staff & Admins
              </Text>
              <Text fw={700} size="xl">
                6
              </Text>
            </div>
            <ThemeIcon color="violet" variant="light" size={36} radius="md">
              <IconShield size={20} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Filter and Search Bar */}
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Group justify="space-between" mb="md" wrap="wrap">
          <Group style={{ flex: 1, minWidth: 260 }}>
            <TextInput
              placeholder="Search by @handle, name or email..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 220 }}
            />
            <Select
              data={[
                { value: 'all', label: 'All Roles' },
                { value: 'student', label: 'Students' },
                { value: 'moderator', label: 'Moderators' },
                { value: 'admin', label: 'Admins' },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              style={{ width: 150 }}
            />
            <Select
              data={[
                { value: 'all', label: 'All Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'pending_verification', label: 'Pending Verification' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
            />
          </Group>
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              setSearchQuery('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </Group>

        {/* Users Table */}
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Joined Date</Table.Th>
              <Table.Th>Last Login</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Box py="xl" style={{ textAlign: 'center' }}>
                    <Text c="dimmed">No users found matching the selected filters.</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar color={roleBadgeColor[user.role]} radius="xl">
                        {user.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </Avatar>
                      <div>
                        <Text size="sm" fw={600}>
                          {user.fullName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {user.handle}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm">{user.email}</Text>
                  </Table.Td>

                  <Table.Td>
                    <Badge color={roleBadgeColor[user.role]} variant="light" size="sm">
                      {user.role.toUpperCase()}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Badge color={statusBadgeColor[user.status]} variant="dot" size="sm">
                      {user.status === 'pending_verification'
                        ? 'PENDING'
                        : user.status.toUpperCase()}
                    </Badge>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {user.joinedDate}
                    </Text>
                  </Table.Td>

                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {user.lastLogin}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'right' }}>
                    <Group gap="xs" justify="flex-end">
                      <Menu shadow="md" width={180} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" size="sm">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                          <Menu.Label>Actions</Menu.Label>
                          <Menu.Item leftSection={<IconEye size={14} />}>View Details</Menu.Item>
                          <Menu.Item leftSection={<IconShield size={14} />}>Change Role</Menu.Item>
                          <Menu.Divider />
                          {user.status === 'suspended' ? (
                            <Menu.Item color="green" leftSection={<IconUserCheck size={14} />}>
                              Unsuspend User
                            </Menu.Item>
                          ) : (
                            <Menu.Item color="red" leftSection={<IconBan size={14} />}>
                              Suspend User
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        {/* Pagination Footer */}
        <Group justify="space-between" mt="lg" pt="md" style={{ borderTop: '1px solid #f1f3f5' }}>
          <Text size="xs" c="dimmed">
            Showing {filteredUsers.length} of {mockUsers.length} loaded users
          </Text>
          <Pagination total={5} value={activePage} onChange={setActivePage} size="sm" />
        </Group>
      </Card>
    </Stack>
  );
};
