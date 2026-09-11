import * as React from 'react';
import { LiquiGlass, type LiquiGlassProps } from '@liqui-design/glass';
import { useAppearance, selectReducedTransparency } from '@/features/appearance/appearance';

export type GlassPreset = 'bar' | 'sidebar' | 'sheet' | 'popover' | 'pill';

const PRESETS: Record<GlassPreset, Pick<LiquiGlassProps, 'radius' | 'refraction' | 'bezel'>> = {
  bar: { radius: 20, refraction: 150, bezel: 28 },
  sidebar: { radius: 20, refraction: 150, bezel: 28 },
  sheet: { radius: 24, refraction: 150, bezel: 28 },
  popover: { radius: 16, refraction: 90, bezel: 18 },
  pill: { radius: 999, refraction: 45, bezel: 11 },
};

export const OPAQUE_TINT = 'rgba(22, 24, 34, 0.92)';

export type GlassPanelProps = Omit<LiquiGlassProps, 'radius' | 'refraction' | 'bezel'> & {
  preset?: GlassPreset;
};

export const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(function GlassPanel(
  { preset = 'bar', style, ...rest },
  ref,
) {
  const reduced = useAppearance(selectReducedTransparency);
  const geometry = PRESETS[preset];
  const reducedStyle = reduced
    ? ({ '--lq-tint': OPAQUE_TINT, '--lq-tint-deep': OPAQUE_TINT } as React.CSSProperties)
    : undefined;
  return (
    <LiquiGlass
      ref={ref}
      {...geometry}
      {...rest}
      material={reduced ? 'clear' : rest.material}
      frost={reduced ? 1 : rest.frost}
      style={{ ...reducedStyle, ...style }}
    />
  );
});
