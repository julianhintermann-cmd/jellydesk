import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { Shell } from '@/app/shell/Shell';
import { HomePage } from '@/features/home/HomePage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { BackdropLayer } from '@/app/shell/BackdropLayer';
import { Titlebar } from '@/app/shell/Titlebar';
import { useSession } from '@/features/auth/session';

export const rootRoute = createRootRoute({ component: () => <Outlet /> });

export const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/onboarding',
  beforeLoad: () => {
    if (useSession.getState().status === 'signedIn') throw redirect({ to: '/home' });
  },
  component: () => (
    <div className="relative flex h-full flex-col">
      <BackdropLayer />
      <Titlebar />
      <div className="relative min-h-0 flex-1">
        <OnboardingPage />
      </div>
    </div>
  ),
});

export const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  beforeLoad: () => {
    if (useSession.getState().status !== 'signedIn') throw redirect({ to: '/onboarding' });
  },
  component: Shell,
});

export const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
});

export const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: '/home', component: HomePage });
export const settingsRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/settings',
  component: () => <h1 className="text-3xl font-semibold">Einstellungen</h1>,
});

const routeTree = rootRoute.addChildren([
  onboardingRoute,
  shellRoute.addChildren([indexRoute, homeRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree, history: createHashHistory() });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
