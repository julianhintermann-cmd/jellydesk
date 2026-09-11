import { LiquiThemeProvider, defaultGlassTheme, type LiquiGlassTheme } from '@liqui-design/glass';
import { GlassPanel } from '@/components/glass/GlassPanel';
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
      <main className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#3b2a6b,transparent_55%),radial-gradient(circle_at_70%_80%,#0f4c5c,transparent_50%)]">
        <GlassPanel preset="sheet" className="px-10 py-8 text-2xl">
          JellyDesk
        </GlassPanel>
      </main>
    </LiquiThemeProvider>
  );
}
