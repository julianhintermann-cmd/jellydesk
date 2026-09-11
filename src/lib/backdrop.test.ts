import { useBackdrop } from '@/lib/backdrop';

describe('backdrop store', () => {
  it('setzt und löscht die URL', () => {
    useBackdrop.getState().setBackdrop('http://x/backdrop.jpg');
    expect(useBackdrop.getState().url).toBe('http://x/backdrop.jpg');
    useBackdrop.getState().setBackdrop(null);
    expect(useBackdrop.getState().url).toBeNull();
  });
});
