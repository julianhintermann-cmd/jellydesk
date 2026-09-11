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
});
