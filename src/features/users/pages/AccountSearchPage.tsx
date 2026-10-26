import React, { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { IconChevronLeft, IconChevronRight, IconSearch } from '@tabler/icons-react';
import { DataTable, type DataTableColumn, SubmitButton, TextField } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { ACCOUNT_STATUS, searchAccounts, type UserAccount } from '../api';

// The backend refuses shorter text with a 422: checked here too so the screen
// can say so without a round trip.
const MIN_QUERY_LENGTH = 3;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const columns: DataTableColumn<UserAccount>[] = [
  {
    key: 'account',
    header: 'Cuenta',
    render: (account) => (
      <div>
        {/* The router's own Link, so the path and its params are checked at compile time. */}
        <Link to="/users/$userId" params={{ userId: account.id }}>
          <Text size="sm" fw={600} c="blue">
            {account.handle}
          </Text>
        </Link>
        <Text size="xs" c="dimmed">
          {account.email}
        </Text>
      </div>
    ),
  },
  {
    key: 'name',
    header: 'Nombre',
    render: (account) => <Text size="sm">{account.display_name ?? '—'}</Text>,
  },
  {
    key: 'status',
    header: 'Estado',
    render: (account) => (
      <Badge color={ACCOUNT_STATUS[account.status].color} variant="light">
        {ACCOUNT_STATUS[account.status].label}
      </Badge>
    ),
  },
  {
    key: 'registered',
    header: 'Registro',
    render: (account) => <Text size="sm">{formatDate(account.created_at)}</Text>,
  },
];

export interface AccountSearchPageProps {
  /** The text in the address bar, so coming back from a detail keeps the search. */
  query: string;
  /** Puts a new text in the address bar; the route mounts the screen again with it. */
  onSearch: (query: string) => void;
}

/**
 * Searching app accounts by part of their email or handle (E5-H4). Open to any
 * administrator, unlike the administrators screen.
 */
export const AccountSearchPage: React.FC<AccountSearchPageProps> = ({ query, onSearch }) => {
  const [draft, setDraft] = useState(query);
  // One cursor per page already visited: "Anterior" reuses the one that led to
  // it instead of asking the backend to page backwards.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);

  const text = query.trim();
  const searchable = text.length >= MIN_QUERY_LENGTH;
  const cursor = cursors[cursors.length - 1];

  const results = useQuery({
    queryKey: ['accounts', text, cursor],
    queryFn: () => searchAccounts(text, cursor),
    enabled: searchable,
  });

  const nextCursor = results.data?.next_cursor ?? null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  let content: React.ReactNode;
  if (!text) {
    content = (
      <Text c="dimmed" ta="center" py="xl">
        Escribí parte del email o del handle de la cuenta que buscás.
      </Text>
    );
  } else if (!searchable) {
    content = (
      <Text c="dimmed" ta="center" py="xl">
        La búsqueda necesita al menos {MIN_QUERY_LENGTH} caracteres.
      </Text>
    );
  } else {
    content = (
      <Stack gap="sm">
        <DataTable
          columns={columns}
          rows={results.data?.items ?? []}
          rowKey={(account) => account.id}
          loading={results.isPending}
          error={results.isError ? toApiError(results.error) : null}
          emptyMessage={`Ninguna cuenta coincide con "${text}"`}
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
              disabled={nextCursor === null}
              onClick={() => setCursors((visited) => [...visited, nextCursor])}
            >
              Siguiente
            </Button>
          </Group>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Usuarios</Title>
        <Text c="dimmed" size="sm">
          Búsqueda de cuentas de la app por email o handle, para dar soporte o auditar (E5-H4)
        </Text>
      </div>

      <Card shadow="sm" padding="md" radius="md" withBorder>
        <form onSubmit={submit}>
          <Group align="flex-end">
            <TextField
              label="Email o handle"
              placeholder="Al menos 3 caracteres"
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <SubmitButton>Buscar</SubmitButton>
          </Group>
        </form>
      </Card>

      <Card shadow="sm" padding="md" radius="md" withBorder>
        {content}
      </Card>
    </Stack>
  );
};
