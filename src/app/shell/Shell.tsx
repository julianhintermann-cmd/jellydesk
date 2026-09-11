import { Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { BackdropLayer } from '@/app/shell/BackdropLayer';
import { Titlebar } from '@/app/shell/Titlebar';
import { Sidebar } from '@/app/shell/Sidebar';
import { Toolbar } from '@/app/shell/Toolbar';
import { useSession } from '@/features/auth/session';

function ConnectionBanner() {
  const { t } = useTranslation();
  const mode = useSession((s) => s.connectionMode);
  if (mode === 'local') return null;
  return (
    <div className="mx-3 mt-3 rounded-xl bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100">
      {mode === 'offline' ? t('connection.offline') : t('connection.external')}
    </div>
  );
}

export function Shell() {
  return (
    <div className="relative flex h-full flex-col">
      <BackdropLayer />
      <Titlebar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <ConnectionBanner />
          <Toolbar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
