import { useAppearance, selectReducedTransparency } from '@/features/appearance/appearance';

describe('appearance store', () => {
  beforeEach(() => {
    useAppearance.setState({ systemTransparency: true, userReducedTransparency: false });
  });

  it('ist standardmässig nicht reduziert', () => {
    expect(selectReducedTransparency(useAppearance.getState())).toBe(false);
  });

  it('reduziert, wenn Windows-Transparenz aus ist', () => {
    useAppearance.getState().setSystemTransparency(false);
    expect(selectReducedTransparency(useAppearance.getState())).toBe(true);
  });

  it('reduziert, wenn der Benutzer es wählt', () => {
    useAppearance.getState().setUserReducedTransparency(true);
    expect(selectReducedTransparency(useAppearance.getState())).toBe(true);
  });
});
