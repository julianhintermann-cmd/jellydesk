import { probeJellyfin } from '@/lib/connection/probe';

describe('probeJellyfin', () => {
  it('liest die öffentliche System-Info', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ ServerName: 'NAS', Version: '10.10.3', Id: 'abc' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r).toEqual({ ok: true, serverName: 'NAS', version: '10.10.3', id: 'abc' });
    expect(fetchImpl).toHaveBeenCalledWith('http://a:8096/System/Info/Public', expect.anything());
  });

  it('meldet Fehler bei Netzwerkproblem', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r.ok).toBe(false);
  });

  it('meldet Fehler bei HTTP 500', async () => {
    const fetchImpl = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    const r = await probeJellyfin('http://a:8096', 1000, fetchImpl);
    expect(r).toEqual({ ok: false, error: 'HTTP 500' });
  });
});
