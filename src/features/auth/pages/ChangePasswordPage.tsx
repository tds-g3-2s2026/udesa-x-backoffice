import React from 'react';
import { Alert, Button, Center, Paper, Stack, Text, Title } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { IconCheck } from '@tabler/icons-react';
import { PasswordField, ProblemAlert, SubmitButton } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { useAuthStore } from '../../../stores/authStore';
import { type PasswordChange, changePassword } from '../api';

/** Same policy `users-api` enforces: 8 characters, one uppercase and one digit. */
const validatePassword = (value: string): string | null => {
  if (value.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }
  if (!/[A-Z]/.test(value)) {
    return 'La contraseña debe tener al menos una mayúscula';
  }
  if (!/[0-9]/.test(value)) {
    return 'La contraseña debe tener al menos un número';
  }
  return null;
};

/**
 * Where an account on a temporary password lands, and the only screen it can
 * reach. Succeeding closes the session, because the backend revokes every
 * token of the account including the one that made the request.
 */
export const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const signOut = useAuthStore((state) => state.signOut);

  const form = useForm({
    initialValues: { current_password: '', password: '', password_confirmation: '' },
    validate: {
      current_password: isNotEmpty('Ingresá la contraseña temporal'),
      password: validatePassword,
      password_confirmation: (value, values) =>
        value === values.password ? null : 'Las contraseñas no coinciden',
    },
  });

  const change = useMutation({
    mutationFn: (values: PasswordChange) => changePassword(values),
    onSuccess: () => signOut(),
  });

  if (change.isSuccess) {
    return (
      <Center mih="100vh" p="md">
        <Paper w="100%" maw={420} p="xl" radius="md" withBorder shadow="sm">
          <Stack gap="lg">
            <Alert color="green" variant="light" icon={<IconCheck size={18} />} title="Listo">
              Tu contraseña quedó cambiada. Por seguridad se cerraron todas las sesiones de la
              cuenta, así que entrá de nuevo con la nueva.
            </Alert>
            <Button onClick={() => void navigate({ to: '/login' })} fullWidth>
              Ir al login
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return (
    <Center mih="100vh" p="md">
      <Paper w="100%" maw={420} p="xl" radius="md" withBorder shadow="sm">
        <Stack gap="lg">
          <div>
            <Title order={2}>Elegí tu contraseña</Title>
            <Text c="dimmed" size="sm">
              Entraste con una contraseña temporal. Antes de usar el backoffice tenés que
              reemplazarla por una tuya.
            </Text>
          </div>

          <form onSubmit={form.onSubmit((values) => change.mutate(values))} noValidate>
            <Stack gap="md">
              <ProblemAlert
                error={change.isError ? toApiError(change.error) : null}
                onClose={() => change.reset()}
              />
              <PasswordField
                label="Contraseña temporal"
                autoComplete="current-password"
                required
                disabled={change.isPending}
                {...form.getInputProps('current_password')}
              />
              <PasswordField
                label="Nueva contraseña"
                autoComplete="new-password"
                required
                disabled={change.isPending}
                {...form.getInputProps('password')}
              />
              <PasswordField
                label="Repetí la nueva contraseña"
                autoComplete="new-password"
                required
                disabled={change.isPending}
                {...form.getInputProps('password_confirmation')}
              />
              <SubmitButton loading={change.isPending} fullWidth>
                Cambiar contraseña
              </SubmitButton>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Center>
  );
};
