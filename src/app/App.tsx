import { RouterProvider } from '@tanstack/react-router';
import { LiquiThemeProvider, defaultGlassTheme, type LiquiGlassTheme } from '@liqui-design/glass';
import { router } from '@/app/router';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';

export const jellyDeskGlassTheme: Partial<LiquiGlassTheme> = {
  profile: 'squircle',
  frost: 0.35,
  specular: 0.7,
  dispersion: 0.1,
  saturation: 1.6,
};

export function App() {
  useSystemAppearanceSync();
  return (
    <LiquiThemeProvider theme={{ glass: { ...defaultGlassTheme, ...jellyDeskGlassTheme } }}>
      <RouterProvider router={router} />
    </LiquiThemeProvider>
  );
}
