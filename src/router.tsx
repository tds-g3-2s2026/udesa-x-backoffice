import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { HealthPage } from './features/health/pages/HealthPage';
import { ModerationPage } from './features/moderation/pages/ModerationPage';
import { UsersPage } from './features/users/pages/UsersPage';
import { useAuthStore } from './stores/authStore';

const rootRoute = createRootRoute();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  beforeLoad: () => {
    // Already signed in: the login has nothing to offer.
    if (useAuthStore.getState().token) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});

/**
 * Everything under the shell needs a session. The check runs before any child
 * loads, and the original address travels along so the user lands back on it.
 */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ location }) => {
    if (!useAuthStore.getState().token) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: AppLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: DashboardPage,
});

const healthRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/health',
  component: HealthPage,
});

const moderationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/moderation',
  component: ModerationPage,
});

const usersRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/users',
  beforeLoad: () => {
    // Only UX: the backend refuses a moderator on these endpoints regardless.
    if (useAuthStore.getState().user?.role !== 'superadmin') {
      throw redirect({ to: '/' });
    }
  },
  component: UsersPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  authenticatedRoute.addChildren([dashboardRoute, healthRoute, moderationRoute, usersRoute]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
