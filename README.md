# UdeSA-X Backoffice

Aplicación web destinada exclusivamente a administradores para monitorear el funcionamiento de la aplicación principal, detectar fallas y auditar la plataforma.

**Stack:** React 19 con React Compiler activado, Vite 8, TypeScript en modo estricto, Mantine 9 para la interfaz, TanStack Router v1 para el ruteo tipado, Zustand para el estado de sesión, TanStack Query para el acceso a datos y Axios como cliente HTTP. Runtime y gestor de paquetes estándar con Bun (`bun.lock`), tests con Vitest y React Testing Library, linting con ESLint y formato con Prettier.

## Entorno de ejecución y gestor de paquetes (Bun)

El proyecto utiliza **Bun** como runtime de JavaScript y gestor de paquetes estándar tanto para desarrollo local como para las imágenes Docker y los pipelines de CI (`ci-node.yml` con `oven-sh/setup-bun` e instalación determinística vía `bun install --frozen-lockfile`).

### Requisitos previos

Alcanza con una de las dos opciones:

- **Bun 1.4 o superior** para trabajar directamente en la máquina. Instalación: `curl -fsSL https://bun.sh/install | bash`.
- **Docker** con el subcomando `docker compose` disponible, para levantar todo en un contenedor sin instalar Bun ni Node.

Para correr los scripts de `scripts/` hace falta además Bash, que ya viene en Linux y macOS.

## Levantarlo en desarrollo con Docker

Es el camino que verifica el criterio de aceptación de la issue #3 y el que no necesita nada instalado más que Docker:

```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

Levanta el dev server de Vite con hot reload en `http://localhost:5173`. El compose monta `src/`, `public/`, `index.html` y `vite.config.ts` desde el host, así que los cambios en el editor se reflejan en el navegador sin reconstruir la imagen.

Acepta dos variables: `PORT`, el puerto publicado en el host (por defecto `5173`), y `VITE_API_URL`, la URL del backend que consume el cliente Axios (por defecto `http://localhost:8000`, el `users-api` local). Se pasan por entorno o por un archivo `.env` dentro de `docker/`:

```bash
PORT=3000 VITE_API_URL=http://localhost:8000 docker compose -f docker/docker-compose.dev.yml up --build
```

Para bajarlo:

```bash
docker compose -f docker/docker-compose.dev.yml down
```

## Levantarlo en desarrollo con Bun

```bash
bun install
bun run dev
```

Queda servido en `http://localhost:5173`. Es más rápido que el contenedor para iterar, y es el modo en el que conviene correr los tests y el linter.

## Correr los tests

```bash
./scripts/test.sh
```

El script es un envoltorio de `bun run test`, que ejecuta Vitest una sola vez y termina. Durante el desarrollo, para dejarlo en modo watch:

```bash
bunx vitest --watch
```

Con reporte de cobertura:

```bash
bun run test:coverage
```

## Linter y formato

```bash
./scripts/lint.sh
```

Corre `bun run lint`, que es `eslint .` seguido de `prettier --check .`. El chequeo de formato falla si algún archivo no está formateado; para arreglarlo:

```bash
bun run format
```

## Build de producción

```bash
bun run build
```

Corre `tsc -b` sobre `src/` y `tests/` y, si el tipado pasa, deja el bundle estático en `dist/`. Para servirlo localmente igual que en producción:

```bash
bun run preview
```

La imagen de producción se construye con el stage `runner` del mismo Dockerfile, que sirve `dist/` desde Nginx con fallback de SPA (`try_files $uri $uri/ /index.html`) para que las rutas de TanStack Router funcionen al recargar la página:

```bash
docker build -f docker/Dockerfile --target runner -t udesa-x-backoffice .
docker run --rm -p 8080:80 udesa-x-backoffice
```

## Estructura

```text
src/
├── components/layout/   # AppShell, navegación y header
├── features/            # un módulo por área del backoffice
│   ├── dashboard/       # métricas globales de la plataforma
│   ├── health/          # estado de los microservicios (E5-H11)
│   ├── moderation/      # cola de denuncias (E5-H7)
│   └── users/           # gestión y búsqueda de usuarios (E5-H4, E5-H5)
├── stores/              # estado global con Zustand
├── test/setup.ts        # polyfills de jsdom para Mantine
├── theme.ts             # tema de Mantine
├── router.tsx           # árbol de rutas tipado de TanStack Router
└── main.tsx             # punto de entrada y providers
tests/unit/              # tests de componentes con Vitest
docker/
├── Dockerfile              # multi-stage: base, dev, builder y runner Nginx
├── docker-compose.dev.yml  # dev server con hot reload
└── nginx.conf              # fallback de SPA y cache de assets
scripts/
├── lint.sh   # eslint + prettier --check
└── test.sh   # vitest run
```

Cada área nueva del backoffice entra como una carpeta más en `src/features/`, con sus `pages/`, sus componentes y sus hooks adentro. La regla es que un feature no importe archivos de otro: lo compartido vive en `src/components/`, `src/services/` o `src/stores/`.

## Code Guidelines (Reglas del Equipo)

Para mantener la calidad y consistencia del código, todos los miembros deben seguir estas reglas:

- **Ramas:** Obligatorio usar la convención `feature-[nombre-de-la-funcionalidad]` o `fix-[fix-a-realizar]`. Toda rama se integra a `main`.
- **Issues:** Todas las ramas deben tener un issue asociado con la información necesaria para implementar la tarea.
- **Etiquetas (Labels):** Los issues deben clasificarse usando `feature`, `tech debt`, `spike`, o `bug`.
- **Pull Requests (PR):** Las descripciones de los PR deben redactarse en **español**.
- **Idioma del código:** En inglés todo lo que vive dentro de un archivo de código (variables, funciones, clases, tablas, comentarios y docstrings) y los nombres de los archivos y carpetas de código. En español la documentación, los mensajes de commit y las descripciones de PR.
- **Commits (Opcional):** Recomendamos usar la convención de [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

La versión completa y vigente de estas reglas vive en [`CONVENCIONES.md`](https://github.com/tds-g3-2s2026/udesa-x-platform/blob/main/docs/CONVENCIONES.md) de `udesa-x-platform`; ante cualquier diferencia, manda ese archivo. El punto de entrada para trabajar en este repo, con o sin agente, es su `AGENTS.md`.
