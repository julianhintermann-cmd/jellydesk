export type ProbeResult =
  | { ok: true; serverName: string; version: string; id: string }
  | { ok: false; error: string };

interface PublicSystemInfo {
  ServerName?: string;
  Version?: string;
  Id?: string;
}

export async function probeJellyfin(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${url}/System/Info/Public`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const info = (await res.json()) as PublicSystemInfo;
    return {
      ok: true,
      serverName: info.ServerName ?? '',
      version: info.Version ?? '',
      id: info.Id ?? '',
    };
  } catch (e) {
    const name = e instanceof Error ? e.name : 'Error';
    return { ok: false, error: name === 'AbortError' ? 'timeout' : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
