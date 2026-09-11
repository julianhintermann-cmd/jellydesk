import { Jellyfin, type Api } from '@jellyfin/sdk';

export type { Api };

export function createJellyfin(device: { id: string; name: string }, version: string): Jellyfin {
  return new Jellyfin({
    clientInfo: { name: 'JellyDesk', version },
    deviceInfo: { name: device.name, id: device.id },
  });
}

export function createApi(jellyfin: Jellyfin, baseUrl: string, accessToken?: string): Api {
  return jellyfin.createApi(baseUrl, accessToken);
}
