import {
  seerrSetBaseUrl as rawSetBaseUrl,
  seerrLogin as rawLogin,
  seerrRequest as rawRequest,
  seerrReset,
} from '@/lib/tauri/seerr';

export interface SeerrUser {
  id: number;
  displayName: string;
  permissions: number;
}

export type SeerrMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function seerrSetBaseUrl(url: string): Promise<void> {
  await rawSetBaseUrl(url);
}

export async function seerrLogin(username: string, password: string): Promise<SeerrUser> {
  const user = await rawLogin(username, password);
  return { id: user.id, displayName: user.displayName ?? username, permissions: user.permissions ?? 0 };
}

export async function seerrRequest<T>(
  method: SeerrMethod,
  path: string,
  opts: { query?: Record<string, string>; body?: unknown } = {},
): Promise<T> {
  return rawRequest<T>(method, path, opts);
}

export { seerrReset };
