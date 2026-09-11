import { invoke, isTauri } from '@tauri-apps/api/core';

// Browser-Fallback nur für die Entwicklung ohne Tauri; in der App landet nichts hier.
const devStore = new Map<string, string>();

export async function getCredential(key: string): Promise<string | null> {
  if (!isTauri()) return devStore.get(key) ?? null;
  return invoke<string | null>('credentials_get', { key });
}

export async function setCredential(key: string, secret: string): Promise<void> {
  if (!isTauri()) {
    devStore.set(key, secret);
    return;
  }
  await invoke('credentials_set', { key, secret });
}

export async function deleteCredential(key: string): Promise<void> {
  if (!isTauri()) {
    devStore.delete(key);
    return;
  }
  await invoke('credentials_delete', { key });
}
