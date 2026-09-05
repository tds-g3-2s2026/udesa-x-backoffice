import React from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Title,
  Badge,
  Avatar,
  Menu,
  UnstyledButton,
  ActionIcon,
  Tooltip,
  useMantineColorScheme,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Navigate, Outlet, useNavigate, useLocation } from '@tanstack/react-router';
import {
  IconDashboard,
  IconHeartbeat,
  IconShieldExclamation,
  IconUsers,
  IconLogout,
  IconSearch,
  IconBell,
  IconSettings,
  IconUser,
  IconMoon,
  IconSun,
  IconChevronDown,
  IconShield,
  IconAdjustments,
} from '@tabler/icons-react';
import { useAuthStore } from '../../stores/authStore';
import { adminLogout } from '../../features/auth/api';
import { GlobalSearchBar } from './GlobalSearchBar';

export const AppLayout: React.FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  // The route guard checks the session on navigation; this covers the session
  // ending while a screen is open, which is what a 401 from the API does.
  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleLogout = async () => {
    try {
      // Best effort: the token is dropped locally either way, and it expires
      // on its own if the backend could not be told.
      await adminLogout();
    } catch {
      // Nothing to do: the local session is dropped regardless.
    }
    signOut();
    void navigate({ to: '/login' });
  };

  const canManageUsers = user.role === 'superadmin';

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          {/* Left: Branding and Mobile Burger */}
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap="xs" wrap="nowrap">
              <Title order={3} style={{ whiteSpace: 'nowrap' }}>
                UdeSA-X Backoffice
              </Title>
              <Badge color="blue" variant="light" size="sm" visibleFrom="xs">
                Admin Portal
              </Badge>
            </Group>
          </Group>

          {/* Center: Global Search Command Trigger */}
          <Box style={{ flex: 1, display: 'flex', justifyContent: 'center' }} visibleFrom="sm">
            <GlobalSearchBar />
          </Box>
          {/* Right: Notifications, Theme Switcher & User Profile Menu */}
          <Group gap="sm" wrap="nowrap">
            {/* Quick search button for mobile viewports */}
            <Tooltip label="Search" hiddenFrom="sm">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                hiddenFrom="sm"
                onClick={() => navigate({ to: '/users' })}
              >
                <IconSearch size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            {/* Notifications */}
            <Tooltip label="Notifications (3 unread)">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                onClick={() => navigate({ to: '/moderation' })}
              >
                <IconBell size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

            {/* Color Scheme Toggle */}
            <Tooltip label={colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                radius="md"
                onClick={() => toggleColorScheme()}
              >
                {colorScheme === 'dark' ? (
                  <IconSun size={18} stroke={1.5} />
                ) : (
                  <IconMoon size={18} stroke={1.5} />
                )}
              </ActionIcon>
            </Tooltip>

            {/* User Profile Menu */}
            <Menu shadow="md" width={240} position="bottom-end" radius="md">
              <Menu.Target>
                <UnstyledButton
                  p={4}
                  style={{
                    borderRadius: 8,
                    transition: 'background-color 150ms ease',
                  }}
                >
                  <Group gap="xs" wrap="nowrap">
                    <Avatar color="blue" radius="xl" size="sm">
                      {user.email.slice(0, 2).toUpperCase()}
                    </Avatar>
                    <Box visibleFrom="md" style={{ textAlign: 'left', lineHeight: 1.2 }}>
                      <Text size="sm" fw={600}>
                        {user.email.split('@')[0]}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {user.role.toUpperCase()}
                      </Text>
                    </Box>
                    <IconChevronDown size={14} stroke={1.5} color="gray" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Signed in as</Menu.Label>
                <Box px="xs" pb="xs">
                  <Text size="xs" fw={700}>
                    {user.email}
                  </Text>
                  <Badge size="xs" color="blue" variant="dot" mt={4}>
                    {`Role: ${user.role}`}
                  </Badge>
                </Box>

                <Menu.Divider />
                <Menu.Label>Management & Account</Menu.Label>
                <Menu.Item
                  leftSection={<IconUser size={15} />}
                  onClick={() => navigate({ to: '/users' })}
                >
                  My Profile & Activity
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={15} />}
                  onClick={() => navigate({ to: '/users' })}
                >
                  Account Settings
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconShield size={15} />}
                  onClick={() => navigate({ to: '/health' })}
                >
                  System & Permissions
                </Menu.Item>

                <Menu.Divider />
                <Menu.Label>Preferences</Menu.Label>
                <Menu.Item
                  leftSection={
                    colorScheme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />
                  }
                  onClick={() => toggleColorScheme()}
                >
                  {colorScheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </Menu.Item>
                <Menu.Item leftSection={<IconAdjustments size={15} />}>
                  Display Preferences
                </Menu.Item>

                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={15} />}
                  onClick={handleLogout}
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <NavLink
            label="Dashboard"
            leftSection={<IconDashboard size={20} stroke={1.5} />}
            active={location.pathname === '/'}
            onClick={() => navigate({ to: '/' })}
          />
          <NavLink
            label="Service Health"
            leftSection={<IconHeartbeat size={20} stroke={1.5} />}
            active={location.pathname === '/health'}
            onClick={() => navigate({ to: '/health' })}
          />
          <NavLink
            label="Moderation Queue"
            leftSection={<IconShieldExclamation size={20} stroke={1.5} />}
            active={location.pathname === '/moderation'}
            onClick={() => navigate({ to: '/moderation' })}
          />
          {canManageUsers && (
            <NavLink
              label="User Management"
              leftSection={<IconUsers size={20} stroke={1.5} />}
              active={location.pathname === '/users'}
              onClick={() => navigate({ to: '/users' })}
            />
          )}
        </AppShell.Section>

        <AppShell.Section>
          <NavLink
            label="Logout"
            leftSection={<IconLogout size={20} stroke={1.5} />}
            color="red"
            onClick={handleLogout}
          />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
};
