import { invoke } from '@tauri-apps/api/core';
import { getSetting, setSetting } from '@/lib/tauri/settings';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  isTauri: () => true,
}));

const invokeMock = vi.mocked(invoke);

describe('settings wrapper', () => {
  beforeEach(() => invokeMock.mockReset());

  it('serialisiert Werte als JSON', async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await setSetting('server.urls', { local: 'http://a', external: 'http://b' });
    expect(invokeMock).toHaveBeenCalledWith('settings_set', {
      key: 'server.urls',
      value: JSON.stringify({ local: 'http://a', external: 'http://b' }),
    });
  });

  it('parst gespeicherte Werte und liefert null bei fehlendem Key', async () => {
    invokeMock.mockResolvedValueOnce('{"local":"http://a"}');
    expect(await getSetting<{ local: string }>('server.urls')).toEqual({ local: 'http://a' });
    invokeMock.mockResolvedValueOnce(null);
    expect(await getSetting('missing')).toBeNull();
  });
});
