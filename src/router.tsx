import { AuditPage } from './features/audit/pages/AuditPage';
import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AppLayout } from './components/layout/AppLayout';
import { ChangePasswordPage } from './features/auth/pages/ChangePasswordPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { HealthPage } from './features/health/pages/HealthPage';
import { ModerationPage } from './features/moderation/pages/ModerationPage';
import { AccountDetailPage } from './features/users/pages/AccountDetailPage';
import { AccountSearchPage } from './features/users/pages/AccountSearchPage';
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
 * Outside the shell on purpose: an account on a temporary password has no
 * navigation to offer, and the backend refuses every other endpoint anyway.
 */
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/change-password',
  beforeLoad: () => {
    const { token, mustChangePassword } = useAuthStore.getState();
    if (!token) {
      throw redirect({ to: '/login' });
    }
    if (!mustChangePassword) {
      throw redirect({ to: '/' });
    }
  },
  component: ChangePasswordPage,
});

/**
 * Everything under the shell needs a session. The check runs before any child
 * loads, and the original address travels along so the user lands back on it.
 */
const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'authenticated',
  beforeLoad: ({ location }) => {
    const { token, mustChangePassword } = useAuthStore.getState();
    if (!token) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
    if (mustChangePassword) {
      throw redirect({ to: '/change-password' });
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

/**
 * Searching app accounts and reading their detail (E5-H4) is open to any
 * administrator. Both routes are siblings of `/users`, not its children, so
 * they do not inherit its superadmin check.
 */
const accountSearchRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/users/search',
  // The text lives in the address bar, so coming back from a detail keeps it.
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: function AccountSearchRoute() {
    const { q = '' } = accountSearchRoute.useSearch();
    const navigate = accountSearchRoute.useNavigate();
    // Keyed by the text, so every new search starts again from its first page.
    return (
      <AccountSearchPage
        key={q}
        query={q}
        onSearch={(next) => void navigate({ search: { q: next || undefined } })}
      />
    );
  },
});

const accountDetailRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/users/$userId',
  component: function AccountDetailRoute() {
    const { userId } = accountDetailRoute.useParams();
    return <AccountDetailPage userId={userId} />;
  },
});

const auditRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/audit',
  beforeLoad: () => {
    const role = useAuthStore.getState().user?.role;
    if (role !== 'superadmin' && role !== 'moderator') {
      throw redirect({ to: '/' });
    }
  },
  component: AuditPage,
});

export const routeTree = rootRoute.addChildren([
  loginRoute,
  changePasswordRoute,
  authenticatedRoute.addChildren([
    dashboardRoute,
    healthRoute,
    moderationRoute,
    usersRoute,
    accountSearchRoute,
    accountDetailRoute,
    auditRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
