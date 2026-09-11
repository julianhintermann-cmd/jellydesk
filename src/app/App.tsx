import { useEffect } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { LiquiThemeProvider, defaultGlassTheme, type LiquiGlassTheme } from '@liqui-design/glass';
import { router } from '@/app/router';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';
import { useSession } from '@/features/auth/session';

export const jellyDeskGlassTheme: Partial<LiquiGlassTheme> = {
  profile: 'squircle',
  frost: 0.35,
  specular: 0.7,
  dispersion: 0.1,
  saturation: 1.6,
};

export function App() {
  useSystemAppearanceSync();
  const status = useSession((s) => s.status);
  const boot = useSession((s) => s.boot);
  useEffect(() => {
    if (status === 'booting') void boot();
  }, [status, boot]);

  return (
    <LiquiThemeProvider theme={{ glass: { ...defaultGlassTheme, ...jellyDeskGlassTheme } }}>
      {status === 'booting' ? <div className="h-full bg-[var(--jd-base)]" /> : <RouterProvider router={router} />}
    </LiquiThemeProvider>
  );
}
