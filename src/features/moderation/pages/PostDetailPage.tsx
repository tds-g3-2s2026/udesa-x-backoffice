import React, { useState } from 'react';
import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { IconArrowLeft, IconEraser } from '@tabler/icons-react';
import { ConfirmModal, ProblemAlert } from '../../../components';
import { toApiError } from '../../../services/apiClient';
import { cleanPostContent, getPost, REMOVED_BY_MODERATION, type AdminPost } from '../api';

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/** Back to the account that wrote it, or to the inbox if the account was closed. */
const BackLink: React.FC<{ post?: AdminPost }> = ({ post }) => (
  <Group gap={4}>
    <IconArrowLeft size={14} />
    {post && !post.authorDeleted ? (
      <Link to="/users/$userId" params={{ userId: post.authorId }}>
        <Text component="span" size="sm" c="blue">
          Volver a la cuenta
        </Text>
      </Link>
    ) : (
      <Anchor component={Link} to="/moderation" size="sm">
        Volver a la bandeja
      </Anchor>
    )}
  </Group>
);

export interface PostDetailPageProps {
  postId: string;
}

/**
 * One post as an administrator sees it (E5-H10): who wrote it, the text, the
 * images and its counters, whatever the visibility of the account. From here
 * its content is cleared: the text becomes the placeholder and the images go.
 */
export const PostDetailPage: React.FC<PostDetailPageProps> = ({ postId }) => {
  const queryClient = useQueryClient();
  const [cleaning, setCleaning] = useState(false);
  const post = useQuery({ queryKey: ['post', postId], queryFn: () => getPost(postId) });
  const clean = useMutation({
    mutationFn: () => cleanPostContent(postId),
    onSuccess: () => {
      clean.reset();
      setCleaning(false);
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      // The list of the account's posts shows the text too.
      void queryClient.invalidateQueries({ queryKey: ['account-posts'] });
    },
  });

  // The last error belongs to the attempt that is closing.
  const closeCleaning = () => {
    clean.reset();
    setCleaning(false);
  };

  if (post.isPending) {
    return (
      <Group justify="center" gap="sm" py="xl">
        <Loader size="sm" />
        <Text c="dimmed">Cargando...</Text>
      </Group>
    );
  }

  if (post.isError) {
    return (
      <Stack gap="md">
        <BackLink />
        <ProblemAlert error={toApiError(post.error)} />
      </Stack>
    );
  }

  const { data } = post;
  // An author could write the placeholder themselves to keep an image up: with
  // images left, the action stays available.
  const cleaned = data.content === REMOVED_BY_MODERATION && data.images.length === 0;

  return (
    <Stack gap="lg">
      <BackLink post={data} />

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Publicación</Title>
              {data.authorDeleted ? (
                <Text c="dimmed">[Usuario eliminado]</Text>
              ) : (
                <Link to="/users/$userId" params={{ userId: data.authorId }}>
                  <Text component="span" c="blue">
                    {data.authorHandle}
                  </Text>
                </Link>
              )}
              <Text size="xs" c="dimmed">
                {formatDateTime(data.createdAt)}
              </Text>
            </div>
            {cleaned ? (
              <Badge color="gray" variant="light" size="lg">
                Limpiada por moderación
              </Badge>
            ) : null}
          </Group>

          {data.parentId ? (
            <Link to="/posts/$postId" params={{ postId: data.parentId }}>
              <Text component="span" size="sm" c="blue">
                Responde a otra publicación
              </Text>
            </Link>
          ) : null}

          <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{data.content}</Text>

          {data.images.length > 0 ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {data.images.map((image) => (
                <Image
                  key={image.id}
                  src={image.url}
                  alt={`Imagen ${image.position + 1}`}
                  radius="md"
                />
              ))}
            </SimpleGrid>
          ) : null}

          <Text size="sm" c="dimmed">
            {data.likesCount} me gusta · {data.retweetsCount} retweets · {data.repliesCount}{' '}
            respuestas
          </Text>

          {cleaned ? null : (
            <Group justify="flex-end">
              <Button
                color="red"
                variant="light"
                leftSection={<IconEraser size={16} />}
                onClick={() => setCleaning(true)}
              >
                Limpiar Contenido
              </Button>
            </Group>
          )}
        </Stack>
      </Card>

      <ConfirmModal
        opened={cleaning}
        title="Limpiar contenido"
        description={`El texto pasa a "${REMOVED_BY_MODERATION}" y se borran las imágenes. La publicación sigue con sus me gusta, retweets y respuestas. No se puede deshacer.`}
        confirmLabel="Limpiar contenido"
        loading={clean.isPending}
        error={clean.isError ? toApiError(clean.error) : null}
        onConfirm={() => clean.mutate()}
        onClose={closeCleaning}
      />
    </Stack>
  );
};
