import React from 'react';
import { Group, Loader, Table, Text } from '@mantine/core';
import type { ApiError } from '../../services/apiClient';
import { ProblemAlert } from '../feedback/ProblemAlert';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: number | string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: ApiError | null;
  emptyMessage?: string;
}

/**
 * A table that owns its three non-happy states. Screens hand it the rows and
 * the query state, and never write "Cargando..." or an empty message again.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyMessage = 'No hay datos para mostrar',
}: DataTableProps<T>) {
  const stateRow = (content: React.ReactNode) => (
    <Table.Tr>
      <Table.Td colSpan={columns.length}>{content}</Table.Td>
    </Table.Tr>
  );

  let body: React.ReactNode;
  if (loading) {
    body = stateRow(
      <Group justify="center" gap="sm" py="xl">
        <Loader size="sm" />
        <Text c="dimmed">Cargando...</Text>
      </Group>
    );
  } else if (error) {
    body = stateRow(<ProblemAlert error={error} />);
  } else if (rows.length === 0) {
    body = stateRow(
      <Text c="dimmed" ta="center" py="xl">
        {emptyMessage}
      </Text>
    );
  } else {
    body = rows.map((row) => (
      <Table.Tr key={rowKey(row)}>
        {columns.map((column) => (
          <Table.Td key={column.key}>{column.render(row)}</Table.Td>
        ))}
      </Table.Tr>
    ));
  }

  return (
    <Table highlightOnHover verticalSpacing="sm" aria-busy={loading}>
      <Table.Thead>
        <Table.Tr>
          {columns.map((column) => (
            <Table.Th key={column.key} style={column.width ? { width: column.width } : undefined}>
              {column.header}
            </Table.Th>
          ))}
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>{body}</Table.Tbody>
    </Table>
  );
}
