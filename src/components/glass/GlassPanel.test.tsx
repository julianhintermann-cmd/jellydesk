import { render } from '@testing-library/react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { useAppearance } from '@/features/appearance/appearance';

describe('GlassPanel', () => {
  beforeEach(() => {
    useAppearance.setState({ systemTransparency: true, userReducedTransparency: false });
  });

  it('rendert Kinder in einer Glasfläche', () => {
    const { container, getByText } = render(<GlassPanel preset="bar">Hallo</GlassPanel>);
    expect(getByText('Hallo')).toBeInTheDocument();
    expect(container.querySelector('.liqui-glass')).not.toBeNull();
  });

  it('setzt bei reduzierter Transparenz einen opaken Tint', () => {
    useAppearance.setState({ systemTransparency: false });
    const { container } = render(<GlassPanel preset="sheet">X</GlassPanel>);
    const el = container.querySelector('.liqui-glass') as HTMLElement;
    expect(el.style.getPropertyValue('--lq-tint')).toBe('rgba(22, 24, 34, 0.92)');
  });
});
