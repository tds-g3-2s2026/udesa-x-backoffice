# AGENTS.md - udesa-x-backoffice

<!-- INICIO BLOQUE PROPIO - completado en cada servicio -->

Backoffice web administrativo para monitoreo de plataforma, auditoría y moderación de contenido (Épica E5).

## Stack y herramientas

- Framework y runtime: React 19 (con React Compiler activado), Vite 8, TypeScript, Bun (`bun.lock`)
- UI Library: Mantine 9 (@mantine/core, @mantine/hooks, @mantine/form)
- Estado y queries: Zustand, TanStack React Query
- Ruteo: TanStack Router (code-based, tipado en `src/router.tsx`)
- Tests: Vitest 4, React Testing Library

## Checks y comandos

```bash
bun run dev             # Servidor de desarrollo local (puerto 5173)
./scripts/lint.sh       # Linting con ESLint y Prettier
./scripts/test.sh       # Tests unitarios con Vitest
bun run build           # Compilación TypeScript y build de producción
```

## Docker

```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

## Arquitectura y particularidades locales

- Módulos por dominio en `src/features/` (`dashboard`, `health`, `moderation`, `users`).
- Shell y layout compartido en `src/components/layout/AppLayout.tsx`.
- Árbol de rutas y router tipado en `src/router.tsx`, montado con `RouterProvider` en `src/main.tsx`.
- Documentación general del sistema: consultar `../udesa-x-platform/docs/` (`ARQUITECTURA.md`, `CONVENCIONES.md`, `PLANIFICACION.md`).

<!-- FIN BLOQUE PROPIO -->

<!-- INICIO BLOQUE COMUN - sincronizado desde udesa-x-platform, no editar la copia local -->

## Reglas del equipo

- **Ramas e issues**: Rama base `main`. Ramas de trabajo `feature-<nombre>` o `fix-<nombre>`, siempre asociadas a un issue en el mismo repositorio.
- **Idiomas**:
  - Código (`src/`, `tests/`), nombres de archivos, identificadores y comentarios en código: **inglés**.
  - Documentación (`docs/`, `README.md`), mensajes de commit y Pull Requests: **español**.
- **Commits**: Formato Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) con descripción en español.
- **Simplicidad**: Soluciones mínimas y directas para el criterio de aceptación. No introducir librerías, patrones ni abstracciones nuevas sin un ADR aprobado en `docs/adr/`.

## Límites y flujo de trabajo del agente

- El agente inspecciona el repositorio (`git status`, `git diff`), edita archivos en el working tree, ejecuta checks locales y redacta propuestas de commit y PR.
- **El agente nunca commitea, pushea ni abre/aprueba/mergea Pull Requests.** La revisión y confirmación en Git la realiza siempre un integrante del equipo.
- **Sin firmas**: Nunca agregar `Co-Authored-By`, firmas o menciones del agente en commits, PRs ni código.

## Modo de planificación

- Planes extremadamente concisos: priorizar brevedad y concreción por sobre prosa formal.
- Al final de cada plan, incluir la lista de preguntas o dudas pendientes a resolver (si las hay).

## Skills (.agents/skills/)

- `explicar-implementacion`: Genera la explicación detallada del cambio para incluir en la descripción del PR.
- `revisar-pr`: Guía paso a paso para la revisión técnica de Pull Requests.

<!-- FIN BLOQUE COMUN -->
