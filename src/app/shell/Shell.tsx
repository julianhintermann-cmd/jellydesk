import { Outlet } from '@tanstack/react-router';
import { BackdropLayer } from '@/app/shell/BackdropLayer';
import { Titlebar } from '@/app/shell/Titlebar';
import { Sidebar } from '@/app/shell/Sidebar';
import { Toolbar } from '@/app/shell/Toolbar';

export function Shell() {
  return (
    <div className="relative flex h-full flex-col">
      <BackdropLayer />
      <Titlebar />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Toolbar />
          <main className="min-h-0 flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
