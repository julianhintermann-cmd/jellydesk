import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Shell } from '@/app/shell/Shell';
import { HomePage } from '@/features/home/HomePage';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';
import { BackdropLayer } from '@/app/shell/BackdropLayer';
import { Titlebar } from '@/app/shell/Titlebar';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';

function NotFoundBlock() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-[var(--lq-text)]">{t('notFound.title')}</h1>
      <Button variant="glass" onClick={() => router.history.back()}>
        {t('common.back')}
      </Button>
    </div>
  );
}

function RootNotFound() {
  return (
    <div className="relative flex h-full flex-col">
      <Titlebar />
      <div className="relative min-h-0 flex-1">
        <NotFoundBlock />
      </div>
    </div>
  );
}

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
  notFoundComponent: NotFoundBlock,
});

export const indexRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/home' });
  },
});

function SettingsPage() {
  const { t } = useTranslation();
  return <h1 className="text-3xl font-semibold">{t('nav.settings')}</h1>;
}

export const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: '/home', component: HomePage });
export const settingsRoute = createRoute({ getParentRoute: () => shellRoute, path: '/settings', component: SettingsPage });

const routeTree = rootRoute.addChildren([
  onboardingRoute,
  shellRoute.addChildren([indexRoute, homeRoute, settingsRoute]),
]);

export const router = createRouter({ routeTree, history: createHashHistory(), defaultNotFoundComponent: RootNotFound });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
