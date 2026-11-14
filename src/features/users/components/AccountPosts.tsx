import React, { useState } from 'react';
import { Badge, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ProblemAlert } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { listAccountPosts, REMOVED_BY_MODERATION } from '../api';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export interface AccountPostsProps {
  userId: string;
}

/**
 * What the account wrote, newest first, each with a link to its detail, where
 * its content can be cleared (E5-H10). Retweets are left out: they are posts of
 * other accounts.
 */
export const AccountPosts: React.FC<AccountPostsProps> = ({ userId }) => {
  // One cursor per page already visited, as in the account search.
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors[cursors.length - 1];
  const page = useQuery({
    queryKey: ['account-posts', userId, cursor],
    queryFn: () => listAccountPosts(userId, cursor),
  });
  const posts = page.data?.items ?? [];
  const nextCursor = page.data?.nextCursor ?? null;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Title order={3}>Publicaciones</Title>

        {page.isPending ? (
          <Group gap="sm">
            <Loader size="xs" />
            <Text size="sm" c="dimmed">
              Cargando...
            </Text>
          </Group>
        ) : null}
        <ProblemAlert error={page.isError ? toApiError(page.error) : null} />
        {page.isSuccess && posts.length === 0 ? (
          <Text size="sm" c="dimmed">
            Esta cuenta no tiene publicaciones.
          </Text>
        ) : null}

        {posts.map((one) => (
          <Group key={one.id} justify="space-between" align="flex-start" wrap="nowrap">
            <div style={{ minWidth: 0 }}>
              <Text
                size="sm"
                lineClamp={2}
                c={one.content === REMOVED_BY_MODERATION ? 'dimmed' : undefined}
              >
                {one.content}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {formatDateTime(one.createdAt)}
                </Text>
                {one.parentId ? (
                  <Badge size="xs" variant="light" color="gray">
                    Respuesta
                  </Badge>
                ) : null}
                {one.images.length > 0 ? (
                  <Badge size="xs" variant="light" color="gray">
                    {one.images.length === 1 ? '1 imagen' : `${one.images.length} imágenes`}
                  </Badge>
                ) : null}
              </Group>
            </div>
            <Link to="/posts/$postId" params={{ postId: one.id }}>
              <Text component="span" size="sm" c="blue" style={{ whiteSpace: 'nowrap' }}>
                Ver publicación
              </Text>
            </Link>
          </Group>
        ))}

        {cursors.length > 1 || nextCursor ? (
          <Group justify="space-between">
            <Button
              variant="default"
              size="xs"
              disabled={cursors.length === 1}
              onClick={() => setCursors(cursors.slice(0, -1))}
            >
              Anterior
            </Button>
            <Button
              variant="default"
              size="xs"
              disabled={!nextCursor}
              onClick={() => nextCursor && setCursors([...cursors, nextCursor])}
            >
              Siguiente
            </Button>
          </Group>
        ) : null}
      </Stack>
    </Card>
  );
};
