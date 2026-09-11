import { isTauri } from '@tauri-apps/api/core';

async function current() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export const appWindow = {
  async minimize() {
    if (isTauri()) await (await current()).minimize();
  },
  async toggleMaximize() {
    if (isTauri()) await (await current()).toggleMaximize();
  },
  async close() {
    if (isTauri()) await (await current()).close();
  },
  async setFullscreen(value: boolean) {
    if (isTauri()) await (await current()).setFullscreen(value);
  },
};
