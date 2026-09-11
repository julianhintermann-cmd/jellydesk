import { invoke } from '@tauri-apps/api/core';

export interface SeerrUser {
  id: number;
  displayName: string;
  permissions: number;
}

export type SeerrMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function seerrSetBaseUrl(url: string): Promise<void> {
  await invoke('seerr_set_base_url', { url });
}

export async function seerrLogin(username: string, password: string): Promise<SeerrUser> {
  const user = await invoke<{ id: number; displayName?: string; permissions?: number }>('seerr_login', {
    username,
    password,
  });
  return { id: user.id, displayName: user.displayName ?? username, permissions: user.permissions ?? 0 };
}

export async function seerrRequest<T>(
  method: SeerrMethod,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  return invoke<T>('seerr_request', {
    method,
    path,
    query: opts.query ? Object.entries(opts.query) : null,
    body: opts.body ?? null,
  });
}

export async function seerrReset(): Promise<void> {
  await invoke('seerr_reset');
}
