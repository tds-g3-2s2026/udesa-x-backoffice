import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '../../../src/theme';

/** Renders under the same providers `main.tsx` mounts, with retries off. */
export const renderWithProviders = (ui: React.ReactElement, options?: RenderOptions) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>{children}</MantineProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Providers, ...options });
};
