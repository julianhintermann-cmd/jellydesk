import { ConnectionManager, type ProbeResult } from '@/lib/connection/ConnectionManager';

const ok: ProbeResult = { ok: true, serverName: 'NAS', version: '10.10', id: '1' };
const fail: ProbeResult = { ok: false, error: 'timeout' };

function probeFor(map: Record<string, () => ProbeResult>) {
  return vi.fn(async (url: string) => map[url]?.() ?? fail);
}

describe('ConnectionManager', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('wählt lokal, wenn erreichbar', async () => {
    const probe = probeFor({ 'http://local': () => ok, 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    const s = await cm.connect();
    expect(s.mode).toBe('local');
    expect(cm.baseUrl()).toBe('http://local');
    expect(probe).toHaveBeenCalledWith('http://local', 2500);
  });

  it('fällt auf extern zurück', async () => {
    const probe = probeFor({ 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    const s = await cm.connect();
    expect(s.mode).toBe('external');
    expect(probe).toHaveBeenCalledWith('http://ext', 6000);
  });

  it('ist offline, wenn nichts antwortet', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({}) });
    expect((await cm.connect()).mode).toBe('offline');
    expect(cm.baseUrl()).toBeNull();
  });

  it('wechselt im externen Modus still zurück auf lokal', async () => {
    let localUp = false;
    const probe = probeFor({ 'http://local': () => (localUp ? ok : fail), 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    await cm.connect();
    cm.startRecheck();
    localUp = true;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(cm.getState().mode).toBe('local');
    cm.stop();
  });

  it('wechselt nach drei Fehlern in Folge den Modus', async () => {
    let localUp = true;
    const probe = probeFor({ 'http://local': () => (localUp ? ok : fail), 'http://ext': () => ok });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    await cm.connect();
    localUp = false;
    cm.reportFailure();
    cm.reportFailure();
    expect(cm.getState().mode).toBe('local');
    cm.reportFailure();
    await vi.runOnlyPendingTimersAsync();
    expect(cm.getState().mode).toBe('external');
  });

  it('setzt den Fehlerzähler bei Erfolg zurück', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({ 'http://local': () => ok }) });
    await cm.connect();
    cm.reportFailure();
    cm.reportSuccess();
    expect(cm.getState().consecutiveFailures).toBe(0);
  });

  it('benachrichtigt Abonnenten', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({ 'http://local': () => ok }) });
    const listener = vi.fn();
    cm.subscribe(listener);
    await cm.connect();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ mode: 'local' }));
  });

  it('isoliert Fehler in Abonnenten', async () => {
    const cm = new ConnectionManager({ local: 'http://local' }, { probe: probeFor({ 'http://local': () => ok }) });
    const good = vi.fn();
    cm.subscribe(() => {
      throw new Error('boom');
    });
    cm.subscribe(good);
    await expect(cm.connect()).resolves.toMatchObject({ mode: 'local' });
    expect(good).toHaveBeenCalled();
  });

  it('behandelt eine abgelehnte Probe wie nicht erreichbar', async () => {
    const probe = vi.fn(async (url: string) => {
      if (url === 'http://local') throw new Error('network down');
      return ok;
    });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    expect((await cm.connect()).mode).toBe('external');
  });

  it('lässt ein veraltetes connect() den neueren Zustand nicht überschreiben', async () => {
    let resolveSlow!: (r: ProbeResult) => void;
    const slow = new Promise<ProbeResult>((r) => (resolveSlow = r));
    let calls = 0;
    const probe = vi.fn((url: string) => {
      calls += 1;
      if (url === 'http://local' && calls === 1) return slow; // erster connect hängt
      return Promise.resolve(url === 'http://local' ? ok : fail);
    });
    const cm = new ConnectionManager({ local: 'http://local', external: 'http://ext' }, { probe });
    const first = cm.connect();
    const second = await cm.connect(); // neuerer Lauf, lokal erreichbar
    expect(second.mode).toBe('local');
    resolveSlow(fail); // alter Lauf käme jetzt zu "extern/offline"
    await first;
    expect(cm.getState().mode).toBe('local');
  });

  it('plant bei wiederholtem Schwellwert nur einen Reconnect', async () => {
    const probe = probeFor({ 'http://local': () => ok });
    const cm = new ConnectionManager({ local: 'http://local' }, { probe });
    await cm.connect();
    const before = probe.mock.calls.length;
    for (let i = 0; i < 6; i += 1) cm.reportFailure(); // zweimal Schwellwert 3
    await vi.runOnlyPendingTimersAsync();
    expect(probe.mock.calls.length).toBe(before + 1);
  });

  it('probt im Offline-Modus beim Recheck nicht doppelt', async () => {
    let up = false;
    const probe = probeFor({ 'http://local': () => (up ? ok : fail) });
    const cm = new ConnectionManager({ local: 'http://local' }, { probe });
    await cm.connect();
    cm.startRecheck();
    const before = probe.mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(probe.mock.calls.length).toBe(before + 1);
    up = true;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(cm.getState().mode).toBe('local');
    cm.stop();
  });

  it('startet nach stop() keinen Recheck mehr', async () => {
    const probe = probeFor({ 'http://local': () => ok });
    const cm = new ConnectionManager({ local: 'http://local' }, { probe });
    await cm.connect();
    cm.stop();
    const before = probe.mock.calls.length;
    cm.startRecheck();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(probe.mock.calls.length).toBe(before);
    expect(cm.isStopped()).toBe(true);
  });
});
