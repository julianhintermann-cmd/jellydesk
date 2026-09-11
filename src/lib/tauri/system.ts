import { invoke, isTauri } from '@tauri-apps/api/core';

export async function getSystemTransparencyEnabled(): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>('system_transparency_enabled');
}

export async function getDeviceName(): Promise<string> {
  if (!isTauri()) return 'Browser';
  try {
    const { hostname } = await import('@tauri-apps/plugin-os');
    return (await hostname()) ?? 'Windows PC';
  } catch {
    return 'Windows PC';
  }
}
