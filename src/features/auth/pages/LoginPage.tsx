import React from 'react';
import { Center, Paper, Stack, Text, Title } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { PasswordField, ProblemAlert, SubmitButton, TextField } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { useAuthStore } from '../../../stores/authStore';
import { type AdminCredentials, adminLogin } from '../api';

/** Only paths inside the app: a redirect to another site would be an open redirect. */
export const safeRedirect = (target: string | undefined): string =>
  target && target.startsWith('/') && !target.startsWith('//') ? target : '/';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
  const signIn = useAuthStore((state) => state.signIn);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: isEmail('Ingresá un email válido'),
      password: isNotEmpty('Ingresá tu contraseña'),
    },
  });

  const login = useMutation({
    // Not `adminLogin` directly: TanStack Query passes a second `context`
    // argument that the API function has no business receiving.
    mutationFn: (credentials: AdminCredentials) => adminLogin(credentials),
    onSuccess: (response, credentials) => {
      signIn({ token: response.access_token, email: credentials.email });
      void navigate({ href: safeRedirect(redirect) });
    },
  });

  return (
    <Center mih="100vh" p="md">
      <Paper w="100%" maw={420} p="xl" radius="md" withBorder shadow="sm">
        <Stack gap="lg">
          <div>
            <Title order={2}>UdeSA-X Backoffice</Title>
            <Text c="dimmed" size="sm">
              Ingresá con tu cuenta de administrador
            </Text>
          </div>

          <form onSubmit={form.onSubmit((values) => login.mutate(values))} noValidate>
            <Stack gap="md">
              <ProblemAlert
                error={login.isError ? toApiError(login.error) : null}
                onClose={() => login.reset()}
              />
              <TextField
                label="Email"
                type="email"
                autoComplete="email"
                required
                disabled={login.isPending}
                {...form.getInputProps('email')}
              />
              <PasswordField
                label="Contraseña"
                autoComplete="current-password"
                required
                disabled={login.isPending}
                {...form.getInputProps('password')}
              />
              <SubmitButton loading={login.isPending} fullWidth>
                Ingresar
              </SubmitButton>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  );
};
