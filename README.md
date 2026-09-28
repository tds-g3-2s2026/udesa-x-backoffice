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

## El backend en desarrollo

El backoffice le habla al backend a través del gateway, igual que en producción. El dev server de
Vite reenvía todo `/api` al gateway, así que el navegador ve un solo origen y ningún servicio
necesita habilitar CORS para el backoffice. Antes de levantarlo, hay que tener corriendo, cada uno
con su `docker-compose.dev.yml`:

| Servicio      | Puerto en el host |
| ------------- | ----------------- |
| `users-api`   | `8000`            |
| `posts-api`   | `8001`            |
| `api-gateway` | `8002`            |

Sin el gateway, cualquier pedido a `/api` falla, también el login.

## Levantarlo en desarrollo con Docker

Es el camino que verifica el criterio de aceptación de la issue #3 y el que no necesita nada instalado más que Docker:

```bash
docker compose -f docker/docker-compose.dev.yml up --build
```

Levanta el dev server de Vite con hot reload en `http://localhost:5173`. El compose monta `src/`, `public/`, `index.html` y `vite.config.ts` desde el host, así que los cambios en el editor se reflejan en el navegador sin reconstruir la imagen.

Acepta tres variables, por entorno o por un archivo `.env` dentro de `docker/`:

- `PORT`: el puerto publicado en el host (por defecto `5173`).
- `API_PROXY_TARGET`: a dónde reenvía Vite los pedidos a `/api` (por defecto `http://host.docker.internal:8002`, el gateway del host).
- `VITE_API_URL`: la URL del backend que consume el cliente Axios. Vacía por defecto, y entonces el cliente usa `/api` en su propio origen. Si se cambia, el sufijo `/api` no es opcional: todos los servicios publican sus endpoints bajo ese prefijo.

```bash
PORT=3000 API_PROXY_TARGET=http://host.docker.internal:9000 docker compose -f docker/docker-compose.dev.yml up --build
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

Queda servido en `http://localhost:5173`, y reenvía `/api` al gateway en `http://localhost:8002`; con `API_PROXY_TARGET` se apunta a otro. Es más rápido que el contenedor para iterar, y es el modo en el que conviene correr los tests y el linter.

## Entrar al backoffice

Todas las pantallas piden sesión. Sin sesión, cualquier URL redirige a `/login` y vuelve a la
URL original después de entrar. Se entra con email y contraseña contra `POST /admin/auth/login`
de `users-api`, que solo acepta cuentas con rol `moderator` o `superadmin`; un usuario común de
la app recibe `403` y tres contraseñas equivocadas bloquean la cuenta por 30 minutos (`E5-H2`).

Con el `users-api` levantado por su `docker-compose.dev.yml` ya existe un superadmin sembrado:
`admin@udesa.edu.ar` / `Admin1234`. El login llega a `users-api` a través del gateway.

La sesión es el access token del backend, guardado en `localStorage` y decodificado en el cliente
para leer el rol y el vencimiento (`src/stores/authStore.ts`). No se verifica la firma: eso lo hace
el backend en cada pedido. Un `401` de cualquier endpoint cierra la sesión y manda al login
(`src/features/auth/sessionGuard.ts`). El rol solo decide qué se muestra: "User Management"
(`/users`) aparece y responde únicamente para `superadmin`, pero el backend rechaza igual a un
moderador que llegue por la API.

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

### Como los corre el CI: dentro de la imagen

Lo de arriba corre sobre tu máquina y sirve para iterar. **El CI los corre adentro de la imagen
Docker**, que es lo que hace que el resultado no dependa de cómo esté armada la máquina. El
`Dockerfile` tiene un stage `test` que suma la suite sobre el mismo build de dependencias que
usa producción.

Para reproducirlo:

```bash
docker compose -f docker/docker-compose.dev.yml run --rm --build tests
```

El `--build` no es opcional: sin él, el compose corre la imagen cacheada y podrías estar
verificando código viejo.

Ese servicio **no monta el código como volumen** a propósito: montarlo reemplazaría lo que hay
en la imagen por lo que hay en el disco, y se dejaría de probar el artefacto real.

La versión de Bun está fijada en `.bun-version` y en el `Dockerfile`. Sin eso, cada máquina
prueba con la versión que tenga instalada.

**La cobertura se mide con Istanbul y no con V8.** El proveedor por defecto de Vitest fusiona
rangos de cobertura del motor con un algoritmo recursivo que desborda el stack en Linux con
esta suite: pasaba en Windows y fallaba adentro del contenedor. Istanbul instrumenta el código
fuente y no tiene ese problema.

Se mide `src/` entero, no solo lo que los tests importan: sin `all: true`, un archivo que nadie
testea simplemente no aparece y el porcentaje describe únicamente lo que alguien se acordó de
cubrir.

## Linter y formato

```bash
./scripts/lint.sh
```

Corre `bun run lint`, que es `eslint .` seguido de `prettier --check .`. El chequeo de formato falla si algún archivo no está formateado; para arreglarlo:

```bash
bun run format
```

## Build de producción

El destino productivo es **S3 con CloudFront**, no el cluster de Kubernetes. El backoffice
es una SPA: S3 guarda los archivos de `dist/`, CloudFront los sirve por HTTPS y el navegador
consulta la API a través del ingress. No necesita pods ni Services, por eso no hay carpeta
`k8s/`. El marco de despliegue y el prefijo `/api` están definidos en
[ADR-008](https://github.com/tds-g3-2s2026/udesa-x-platform/blob/main/docs/adr/ADR-008-plataforma-de-despliegue.md).

`VITE_API_URL` es obligatoria para compilar y debe incluir `/api`. Vite la incorpora al
JavaScript durante el build: no es un secreto y cambiarla requiere recompilar. El valor
local por defecto queda reservado para desarrollo. Ejemplo sin acceso a AWS, con una URL
de prueba que se debe reemplazar por la URL pública del ingress al desplegar:

```bash
VITE_API_URL=https://api.example.invalid/api bun run build
```

Corre `tsc -b` sobre `src/` y `tests/` y, si el tipado pasa, deja el bundle estático en `dist/`.
Sin `VITE_API_URL`, la compilación falla para evitar publicar un cliente apuntando a localhost.
El CI verifica este build con una URL de prueba y no necesita credenciales de AWS.
Para servir el resultado localmente:

```bash
bun run preview
```

El stage `runner` del Dockerfile queda como alternativa de verificación local, no como
destino de despliegue. Sirve `dist/` desde Nginx con fallback de SPA
(`try_files $uri $uri/ /index.html`) para que las rutas funcionen al recargar la página:

```bash
docker build -f docker/Dockerfile --target runner --build-arg VITE_API_URL=https://api.example.invalid/api -t udesa-x-backoffice .
docker run --rm -p 127.0.0.1:8080:80 udesa-x-backoffice
```

### Despliegue

Cada push a `main` que pasa el CI publica el backoffice: el job `deploy` de
`.github/workflows/ci.yml` compila con la URL de producción, sube `dist/` al bucket con
`aws s3 sync --delete` e invalida la caché de CloudFront. Entra a AWS por OIDC con el rol del
grupo, sin claves permanentes.

Usa cuatro secrets de organización: `AWS_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET` y
`CLOUDFRONT_DISTRIBUTION_ID`. Si falta alguno, el job lo nombra y corta antes de tocar AWS.

`VITE_API_URL` va escrita en el workflow y no como secret: es
`https://tds-group-3.tds-linar.udesa.edu.ar/api`, el mismo dominio que sirve el backoffice.
CloudFront manda `/api/*` al ALB y el resto al bucket, así que el navegador ve un solo origen y
no hace falta configurar CORS.

El bucket es privado: solo lo lee la distribución, a través de su OAC. Las rutas de la SPA las
resuelve una CloudFront Function asociada al behavior por defecto, que reescribe a `/index.html`
todo lo que no tiene extensión. No se usan las _custom error responses_ de la distribución,
porque también reescribirían los errores reales de `/api/*`.

## Estructura

```text
src/
├── components/
│   ├── layout/          # AppShell, navegación y header
│   ├── form/            # TextField, PasswordField, SubmitButton
│   ├── feedback/        # ProblemAlert: errores del backend en formato Problem Details
│   └── data/            # DataTable con estados cargando, vacío y error
├── features/            # un módulo por área del backoffice
│   ├── auth/            # login, sesión y guardia de 401 (E5-H2)
│   ├── dashboard/       # métricas globales de la plataforma
│   ├── health/          # estado de los microservicios (E5-H11)
│   ├── moderation/      # cola de denuncias (E5-H7)
│   └── users/           # alta de administradores y sus credenciales (E5-H1)
├── services/apiClient.ts # cliente Axios y normalización de errores (toApiError)
├── stores/              # estado global con Zustand (sesión en authStore)
├── test/setup.ts        # polyfills de jsdom para Mantine
├── theme.ts             # tema de Mantine y defaults de los componentes
├── router.tsx           # árbol de rutas tipado de TanStack Router, con guardias de sesión y rol
└── main.tsx             # punto de entrada y providers
tests/unit/              # tests de componentes, store, router y login con Vitest
docker/
├── Dockerfile              # multi-stage: base, dev, builder y runner Nginx
├── docker-compose.dev.yml  # dev server con hot reload
└── nginx.conf              # fallback de SPA y cache de assets
scripts/
├── lint.sh   # eslint + prettier --check
└── test.sh   # vitest run
```

Cada área nueva del backoffice entra como una carpeta más en `src/features/`, con sus `pages/`, sus componentes y sus hooks adentro. La regla es que un feature no importe archivos de otro: lo compartido vive en `src/components/`, `src/services/` o `src/stores/`.

Los formularios y tablas se construyen con las piezas de `src/components/` (`T-19`), no con
`TextInput`, `Button` o `Table` de Mantine directamente: así todas las pantallas muestran los
errores del backend igual y comparten los defaults del tema.

## Code Guidelines (Reglas del Equipo)

Para mantener la calidad y consistencia del código, todos los miembros deben seguir estas reglas:

- **Ramas:** Obligatorio usar la convención `feature-[nombre-de-la-funcionalidad]` o `fix-[fix-a-realizar]`. Toda rama se integra a `main`.
- **Issues:** Todas las ramas deben tener un issue asociado con la información necesaria para implementar la tarea.
- **Etiquetas (Labels):** Los issues deben clasificarse usando `feature`, `tech debt`, `spike`, o `bug`.
- **Pull Requests (PR):** Las descripciones de los PR deben redactarse en **español**.
- **Idioma del código:** En inglés todo lo que vive dentro de un archivo de código (variables, funciones, clases, tablas, comentarios y docstrings) y los nombres de los archivos y carpetas de código. En español la documentación, los mensajes de commit y las descripciones de PR.
- **Commits (Opcional):** Recomendamos usar la convención de [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

La versión completa y vigente de estas reglas vive en [`CONVENCIONES.md`](https://github.com/tds-g3-2s2026/udesa-x-platform/blob/main/docs/CONVENCIONES.md) de `udesa-x-platform`; ante cualquier diferencia, manda ese archivo. El punto de entrada para trabajar en este repo, con o sin agente, es su `AGENTS.md`.
