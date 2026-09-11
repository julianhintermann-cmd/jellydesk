import { useSession } from '@/features/auth/session';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

const settings = new Map<string, string>();
const creds = new Map<string, string>();

vi.mock('@/lib/tauri/settings', () => ({
  getSetting: vi.fn(async (k: string) => (settings.has(k) ? JSON.parse(settings.get(k)!) : null)),
  setSetting: vi.fn(async (k: string, v: unknown) => void settings.set(k, JSON.stringify(v))),
  deleteSetting: vi.fn(async (k: string) => void settings.delete(k)),
}));
vi.mock('@/lib/tauri/credentials', () => ({
  getCredential: vi.fn(async (k: string) => creds.get(k) ?? null),
  setCredential: vi.fn(async (k: string, v: string) => void creds.set(k, v)),
  deleteCredential: vi.fn(async (k: string) => void creds.delete(k)),
}));
vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => true),
  getDeviceName: vi.fn(async () => 'TestPC'),
}));
vi.mock('@/lib/connection/probe', () => ({
  probeJellyfin: vi.fn(async (url: string) =>
    url === 'http://local' ? { ok: true, serverName: 'NAS', version: '10', id: '1' } : { ok: false, error: 'x' },
  ),
}));

const auth = { accessToken: 'tok', userId: 'u1', userName: 'julian' };

describe('session', () => {
  beforeEach(() => {
    settings.clear();
    creds.clear();
    useSession.getState().connection?.stop();
    useSession.setState({
      status: 'booting',
      api: null,
      connection: null,
      user: null,
      urls: null,
      jellyfin: null,
      deviceId: null,
      deviceName: 'Windows PC',
      connectionMode: 'offline',
    });
  });

  it('startet ohne Daten abgemeldet und erzeugt eine DeviceId', async () => {
    await useSession.getState().boot();
    expect(useSession.getState().status).toBe('signedOut');
    expect(useSession.getState().deviceId).toMatch(/[0-9a-f-]{36}/);
    expect(settings.get(SettingKeys.deviceId)).toBeDefined();
  });

  it('meldet an, speichert Token im Credential Manager und Benutzer in Settings', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.api?.basePath).toBe('http://local');
    expect(creds.get(CredentialKeys.jellyfinToken)).toBe('tok');
    expect(JSON.parse(settings.get(SettingKeys.authUser)!)).toEqual({
      userId: 'u1',
      userName: 'julian',
      viaQuickConnect: false,
    });
  });

  it('stellt eine gespeicherte Session beim Start wieder her', async () => {
    settings.set(SettingKeys.serverUrls, JSON.stringify({ local: 'http://local' }));
    settings.set(SettingKeys.authUser, JSON.stringify({ userId: 'u1', userName: 'julian', viaQuickConnect: true }));
    creds.set(CredentialKeys.jellyfinToken, 'tok');
    await useSession.getState().boot();
    await vi.waitFor(() => expect(useSession.getState().connectionMode).toBe('local'));
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.api?.accessToken).toBe('tok');
  });

  it('verlässt den Boot-Zustand, bevor die Verbindungsprüfung fertig ist', async () => {
    const { probeJellyfin } = await import('@/lib/connection/probe');
    let resolveProbe: (() => void) | undefined;
    vi.mocked(probeJellyfin).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProbe = () => resolve({ ok: true, serverName: 'NAS', version: '10', id: '1' });
        }),
    );
    settings.set(SettingKeys.serverUrls, JSON.stringify({ local: 'http://local' }));
    settings.set(SettingKeys.authUser, JSON.stringify({ userId: 'u1', userName: 'julian', viaQuickConnect: true }));
    creds.set(CredentialKeys.jellyfinToken, 'tok');
    await useSession.getState().boot();
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.api?.basePath).toBe('http://local');
    expect(resolveProbe).toBeDefined();
    resolveProbe?.();
    await vi.waitFor(() => expect(useSession.getState().connectionMode).toBe('local'));
  });

  it('erzeugt das Api-Objekt nicht neu, wenn sich die Basis-URL nicht ändert', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    await vi.waitFor(() => expect(useSession.getState().connectionMode).toBe('local'));
    const api = useSession.getState().api;
    useSession.getState().connection!.reportFailure();
    expect(useSession.getState().api).toBe(api);
  });

  it('löscht beim Abmelden Token und Benutzer, behält aber die Server-URLs', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    await useSession.getState().signOut();
    expect(useSession.getState().status).toBe('signedOut');
    expect(creds.has(CredentialKeys.jellyfinToken)).toBe(false);
    expect(settings.has(SettingKeys.authUser)).toBe(false);
    expect(settings.has(SettingKeys.serverUrls)).toBe(true);
  });

  it('fällt bei einem Fehler beim Start auf signedOut zurück', async () => {
    const { getSetting } = await import('@/lib/tauri/settings');
    vi.mocked(getSetting).mockRejectedValueOnce(new Error('ipc down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await useSession.getState().boot();
    expect(useSession.getState().status).toBe('signedOut');
    errorSpy.mockRestore();
  });

  it('ermittelt das Gerät beim Anmelden, wenn vorher kein Boot lief', async () => {
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    const s = useSession.getState();
    expect(s.status).toBe('signedIn');
    expect(s.deviceId).toMatch(/[0-9a-f-]{36}/);
    expect(s.deviceName).toBe('TestPC');
  });

  it('meldet nach dem Abmelden keine Verbindungsänderungen mehr an die Session', async () => {
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    const connection = useSession.getState().connection!;
    await useSession.getState().signOut();
    const apiBefore = useSession.getState().api;
    await connection.connect(); // löst Listener aus, darf die Session nicht mehr verändern
    expect(useSession.getState().api).toBe(apiBefore);
    expect(useSession.getState().status).toBe('signedOut');
  });

  it('meldet auch ab, wenn das Löschen eines Eintrags fehlschlägt', async () => {
    const { deleteCredential } = await import('@/lib/tauri/credentials');
    await useSession.getState().boot();
    await useSession.getState().signIn({ urls: { local: 'http://local' }, auth, viaQuickConnect: false });
    vi.mocked(deleteCredential).mockRejectedValueOnce(new Error('keyring locked'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(useSession.getState().signOut()).resolves.toBeUndefined();
    expect(useSession.getState().status).toBe('signedOut');
    expect(useSession.getState().api).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
