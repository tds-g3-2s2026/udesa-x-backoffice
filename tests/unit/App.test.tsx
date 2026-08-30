import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { RouterProvider, createRouter, createMemoryHistory } from '@tanstack/react-router';
import { routeTree } from '../../src/router';
import { theme } from '../../src/theme';

const renderAt = (pathname: string) => {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [pathname] }),
  });

  return render(
    <MantineProvider theme={theme}>
      <RouterProvider router={router} />
    </MantineProvider>
  );
};

describe('Backoffice App Shell', () => {
  it('renders navigation links and header brand', async () => {
    renderAt('/');

    expect(await screen.findByText('UdeSA-X Backoffice')).toBeInTheDocument();
    expect(await screen.findByText('Platform Overview')).toBeInTheDocument();
    expect(screen.getByText('Service Health')).toBeInTheDocument();
    expect(screen.getByText('Moderation Queue')).toBeInTheDocument();
  });

  it('renders the health route inside the shell', async () => {
    renderAt('/health');

    expect(await screen.findByText('UdeSA-X Backoffice')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Microservices Health' })
    ).toBeInTheDocument();
  });

  it('renders the users management route inside the shell', async () => {
    renderAt('/users');

    expect(await screen.findByText('UdeSA-X Backoffice')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'User Management' })).toBeInTheDocument();
  });
});
