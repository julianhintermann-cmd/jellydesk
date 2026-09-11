import { invoke, isTauri } from '@tauri-apps/api/core';

// Browser-Fallback (npm run dev ohne Tauri): localStorage, damit die UI entwickelbar bleibt.
const memory = new Map<string, string>();

async function rawGet(key: string): Promise<string | null> {
  if (!isTauri()) return memory.get(key) ?? localStorage.getItem(`jd.${key}`);
  return invoke<string | null>('settings_get', { key });
}

async function rawSet(key: string, value: string): Promise<void> {
  if (!isTauri()) {
    memory.set(key, value);
    localStorage.setItem(`jd.${key}`, value);
    return;
  }
  await invoke('settings_set', { key, value });
}

export async function getSetting<T>(key: string): Promise<T | null> {
  const raw = await rawGet(key);
  if (raw === null || raw === undefined) return null;
  return JSON.parse(raw) as T;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await rawSet(key, JSON.stringify(value));
}

export async function deleteSetting(key: string): Promise<void> {
  if (!isTauri()) {
    memory.delete(key);
    localStorage.removeItem(`jd.${key}`);
    return;
  }
  await invoke('settings_delete', { key });
}
