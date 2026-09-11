import { invoke, isTauri } from '@tauri-apps/api/core';

export async function getSystemTransparencyEnabled(): Promise<boolean> {
  if (!isTauri()) return true;
  return invoke<boolean>('system_transparency_enabled');
}
