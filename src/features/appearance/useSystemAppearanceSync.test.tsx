import { renderHook, waitFor } from '@testing-library/react';
import { useAppearance } from '@/features/appearance/appearance';
import { useSystemAppearanceSync } from '@/features/appearance/useSystemAppearanceSync';

vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => false),
}));

describe('useSystemAppearanceSync', () => {
  it('übernimmt den Windows-Wert in den Store', async () => {
    useAppearance.setState({ systemTransparency: true });
    renderHook(() => useSystemAppearanceSync());
    await waitFor(() => expect(useAppearance.getState().systemTransparency).toBe(false));
  });
});
