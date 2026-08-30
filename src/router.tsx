import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { HealthPage } from './features/health/pages/HealthPage';
import { ModerationPage } from './features/moderation/pages/ModerationPage';
import { UsersPage } from './features/users/pages/UsersPage';
const rootRoute = createRootRoute({
  component: AppLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const healthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/health',
  component: HealthPage,
});

const moderationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/moderation',
  component: ModerationPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
});

export const routeTree = rootRoute.addChildren([
  dashboardRoute,
  healthRoute,
  moderationRoute,
  usersRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
