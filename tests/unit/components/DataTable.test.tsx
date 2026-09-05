import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from '../../../src/components';
import { renderWithProviders } from '../helpers/render';

interface Row {
  id: string;
  email: string;
  role: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'email', header: 'Email', render: (row) => row.email },
  { key: 'role', header: 'Rol', render: (row) => row.role.toUpperCase() },
];

const rows: Row[] = [
  { id: '1', email: 'admin@udesa.edu.ar', role: 'superadmin' },
  { id: '2', email: 'mod@udesa.edu.ar', role: 'moderator' },
];

describe('DataTable', () => {
  it('renders headers and one row per item through the column renderers', () => {
    renderWithProviders(<DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />);

    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Rol' })).toBeInTheDocument();
    expect(screen.getByText('admin@udesa.edu.ar')).toBeInTheDocument();
    expect(screen.getByText('MODERATOR')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('shows the loading state instead of rows', () => {
    renderWithProviders(
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} loading />
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('admin@udesa.edu.ar')).not.toBeInTheDocument();
  });

  it('shows the backend error inside the table', () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        error={{ status: 500, code: 'unknown', title: 'Error inesperado', detail: 'Se rompió' }}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Se rompió');
  });

  it('shows the empty message when there are no rows', () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        emptyMessage="Todavía no hay administradores"
      />
    );

    expect(screen.getByText('Todavía no hay administradores')).toBeInTheDocument();
  });
});
