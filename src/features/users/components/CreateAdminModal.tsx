import React from 'react';
import { Modal, Select, Stack } from '@mantine/core';
import { isEmail, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { ProblemAlert, SubmitButton, TextField } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import {
  type AdministratorCredential,
  type AdministratorRole,
  type NewAdministrator,
  createAdministrator,
} from '../api';

/** Same rule `users-api` applies: `@` and 4 to 15 letters, digits or underscores. */
const HANDLE_PATTERN = /^@[a-zA-Z0-9_]{4,15}$/;

export interface CreateAdminModalProps {
  opened: boolean;
  onClose: () => void;
  /** Handed the credential so the caller can show the password it came with. */
  onCreated: (credential: AdministratorCredential) => void;
}

export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  opened,
  onClose,
  onCreated,
}) => {
  const form = useForm<NewAdministrator>({
    initialValues: { email: '', handle: '', role: 'moderator' },
    validate: {
      email: isEmail('Ingresá un email válido'),
      handle: (value) =>
        HANDLE_PATTERN.test(value)
          ? null
          : 'El handle debe empezar con @ y tener entre 4 y 15 caracteres, usando solo letras, números y guiones bajos',
    },
  });

  const create = useMutation({
    mutationFn: (administrator: NewAdministrator) => createAdministrator(administrator),
    onSuccess: (credential) => {
      form.reset();
      create.reset();
      onCreated(credential);
    },
  });

  // The form and the last error belong to the attempt that is closing.
  const close = () => {
    form.reset();
    create.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={close} title="Crear administrador" centered>
      <form onSubmit={form.onSubmit((values) => create.mutate(values))} noValidate>
        <Stack gap="md">
          <ProblemAlert
            error={create.isError ? toApiError(create.error) : null}
            onClose={() => create.reset()}
          />
          <TextField
            label="Email"
            type="email"
            placeholder="nombre@udesa.edu.ar"
            required
            disabled={create.isPending}
            {...form.getInputProps('email')}
          />
          <TextField
            label="Handle"
            placeholder="@nombre"
            required
            disabled={create.isPending}
            {...form.getInputProps('handle')}
          />
          <Select
            label="Rol"
            data={[
              { value: 'moderator', label: 'Moderador' },
              { value: 'superadmin', label: 'Superadministrador' },
            ]}
            allowDeselect={false}
            withAsterisk
            disabled={create.isPending}
            {...form.getInputProps('role')}
            onChange={(value) => form.setFieldValue('role', value as AdministratorRole)}
          />
          <SubmitButton loading={create.isPending} fullWidth>
            Crear
          </SubmitButton>
        </Stack>
      </form>
    </Modal>
  );
};
