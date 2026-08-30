import React, { useState, useEffect } from 'react';
import {
  UnstyledButton,
  Group,
  Text,
  Kbd,
  Modal,
  TextInput,
  Stack,
  Badge,
  Box,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure, useOs, useHotkeys } from '@mantine/hooks';
import { useNavigate } from '@tanstack/react-router';
import {
  IconSearch,
  IconDashboard,
  IconHeartbeat,
  IconShieldExclamation,
  IconUsers,
  IconSun,
  IconMoon,
  IconArrowRight,
} from '@tabler/icons-react';

interface QuickItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Users';
  path?: string;
  action?: () => void;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const GlobalSearchBar: React.FC = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const [query, setQuery] = useState('');
  const os = useOs();
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const isMac = os === 'macos' || os === 'ios';

  // Support both Cmd+K (Mac) and Ctrl+K (Windows/Linux)
  useHotkeys([
    ['mod+K', () => (opened ? close() : open())],
    ['ctrl+K', () => (opened ? close() : open())],
  ]);

  // Handle manual keyboard event listener as fallback for browser edge cases
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const items: QuickItem[] = [
    {
      id: 'nav-dash',
      title: 'Platform Overview / Dashboard',
      category: 'Navigation',
      path: '/',
      icon: <IconDashboard size={18} stroke={1.5} />,
      badge: 'Main',
      badgeColor: 'blue',
    },
    {
      id: 'nav-health',
      title: 'Service Health Monitor',
      category: 'Navigation',
      path: '/health',
      icon: <IconHeartbeat size={18} stroke={1.5} />,
      badge: 'E5-H11',
      badgeColor: 'teal',
    },
    {
      id: 'nav-mod',
      title: 'Moderation Queue & Reports',
      category: 'Navigation',
      path: '/moderation',
      icon: <IconShieldExclamation size={18} stroke={1.5} />,
      badge: 'E5-H7',
      badgeColor: 'orange',
    },
    {
      id: 'nav-users',
      title: 'User Management & Search',
      category: 'Navigation',
      path: '/users',
      icon: <IconUsers size={18} stroke={1.5} />,
      badge: 'E5-H4',
      badgeColor: 'violet',
    },
    {
      id: 'usr-01',
      title: 'Joaquín León Alderete (@jleon)',
      category: 'Users',
      path: '/users',
      icon: <IconUsers size={18} stroke={1.5} />,
      badge: 'Admin',
      badgeColor: 'blue',
    },
    {
      id: 'usr-02',
      title: 'Tomás Casas (@tcasas)',
      category: 'Users',
      path: '/users',
      icon: <IconUsers size={18} stroke={1.5} />,
      badge: 'Admin',
      badgeColor: 'blue',
    },
    {
      id: 'usr-03',
      title: 'Sofía Martínez (@sofia_m)',
      category: 'Users',
      path: '/users',
      icon: <IconUsers size={18} stroke={1.5} />,
      badge: 'Moderator',
      badgeColor: 'violet',
    },
    {
      id: 'act-theme',
      title: colorScheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      category: 'Actions',
      action: () => toggleColorScheme(),
      icon: colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />,
      badge: 'Theme',
      badgeColor: 'gray',
    },
  ];

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: QuickItem) => {
    close();
    setQuery('');
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate({ to: item.path as '/' });
    }
  };

  return (
    <>
      {/* Modern Search Trigger Button */}
      <UnstyledButton
        onClick={open}
        aria-label="Quick search"
        style={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          maxWidth: 380,
          height: 36,
          padding: '0 12px',
          borderRadius: theme.radius.md,
          backgroundColor:
            colorScheme === 'dark' ? 'var(--mantine-color-dark-6)' : 'var(--mantine-color-gray-0)',
          border: `1px solid ${
            colorScheme === 'dark' ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-gray-3)'
          }`,
          color: 'var(--mantine-color-dimmed)',
          fontSize: theme.fontSizes.sm,
          cursor: 'pointer',
          transition: 'border-color 150ms ease, background-color 150ms ease',
          '&:hover': {
            borderColor: 'var(--mantine-color-blue-5)',
            backgroundColor:
              colorScheme === 'dark'
                ? 'var(--mantine-color-dark-5)'
                : 'var(--mantine-color-gray-1)',
          },
        })}
      >
        <Group gap="xs" wrap="nowrap">
          <IconSearch size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
          <Text size="sm" c="dimmed" style={{ userSelect: 'none' }}>
            Search pages, users, actions...
          </Text>
        </Group>

        <Group gap={4} wrap="nowrap">
          {isMac ? (
            <>
              <Kbd size="xs">⌘</Kbd>
              <Kbd size="xs">K</Kbd>
            </>
          ) : (
            <>
              <Kbd size="xs">Ctrl</Kbd>
              <Kbd size="xs">K</Kbd>
            </>
          )}
        </Group>
      </UnstyledButton>

      {/* Command Palette / Search Modal */}
      <Modal
        opened={opened}
        onClose={close}
        size="lg"
        padding="md"
        radius="md"
        withCloseButton={false}
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        <Stack gap="md">
          <TextInput
            placeholder="Type to search pages, users, or commands..."
            leftSection={<IconSearch size={20} stroke={1.5} />}
            rightSection={
              <Kbd size="xs" style={{ cursor: 'pointer' }} onClick={close}>
                ESC
              </Kbd>
            }
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            size="md"
            radius="md"
            autoFocus
          />

          <Stack gap="xs" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {filteredItems.length === 0 ? (
              <Box py="xl" style={{ textAlign: 'center' }}>
                <Text size="sm" c="dimmed">
                  No matching results found for "{query}"
                </Text>
              </Box>
            ) : (
              filteredItems.map((item) => (
                <UnstyledButton
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  p="xs"
                  style={(theme) => ({
                    borderRadius: theme.radius.sm,
                    transition: 'background-color 100ms ease',
                    '&:hover': {
                      backgroundColor:
                        colorScheme === 'dark'
                          ? 'var(--mantine-color-dark-5)'
                          : 'var(--mantine-color-gray-1)',
                    },
                  })}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                      <Box c="blue" style={{ display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </Box>
                      <div>
                        <Text size="sm" fw={500}>
                          {item.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {item.category}
                        </Text>
                      </div>
                    </Group>

                    <Group gap="xs">
                      {item.badge && (
                        <Badge size="xs" color={item.badgeColor || 'gray'} variant="light">
                          {item.badge}
                        </Badge>
                      )}
                      <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />
                    </Group>
                  </Group>
                </UnstyledButton>
              ))
            )}
          </Stack>

          <Group
            justify="space-between"
            pt="xs"
            style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text size="xs" c="dimmed">
              Navigation: <Kbd size="xs">↑</Kbd> <Kbd size="xs">↓</Kbd> to navigate •{' '}
              <Kbd size="xs">↵</Kbd> to select
            </Text>
            <Text size="xs" c="dimmed">
              UdeSA-X Backoffice
            </Text>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
