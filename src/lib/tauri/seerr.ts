import { invoke, isTauri } from '@tauri-apps/api/core';

function requireTauri(): void {
  if (!isTauri()) throw new Error('Jellyseerr requires the desktop app');
}

export async function seerrSetBaseUrl(url: string): Promise<void> {
  requireTauri();
  await invoke('seerr_set_base_url', { url });
}

export async function seerrLogin(
  username: string,
  password: string,
): Promise<{ id: number; displayName?: string; permissions?: number }> {
  requireTauri();
  return invoke<{ id: number; displayName?: string; permissions?: number }>('seerr_login', {
    username,
    password,
  });
}

export async function seerrRequest<T>(
  method: string,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  requireTauri();
  return invoke<T>('seerr_request', {
    method,
    path,
    query: opts.query ? Object.entries(opts.query) : null,
    body: opts.body ?? null,
  });
}

export async function seerrReset(): Promise<void> {
  requireTauri();
  await invoke('seerr_reset');
}
