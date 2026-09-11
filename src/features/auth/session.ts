import { create } from 'zustand';
import type { Jellyfin } from '@jellyfin/sdk';
import { createApi, createJellyfin, type Api } from '@/lib/jellyfin/client';
import type { AuthResult } from '@/lib/jellyfin/auth';
import { ConnectionManager, type ConnectionMode, type ServerUrls } from '@/lib/connection/ConnectionManager';
import { probeJellyfin } from '@/lib/connection/probe';
import { getSetting, setSetting, deleteSetting } from '@/lib/tauri/settings';
import { getCredential, setCredential, deleteCredential } from '@/lib/tauri/credentials';
import { getDeviceName } from '@/lib/tauri/system';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

export const APP_VERSION = '0.1.0';

export type SessionStatus = 'booting' | 'signedOut' | 'signedIn';

export interface StoredUser {
  userId: string;
  userName: string;
  viaQuickConnect: boolean;
}

export interface SignInInput {
  urls: ServerUrls;
  auth: AuthResult;
  viaQuickConnect: boolean;
}

export interface SessionState {
  status: SessionStatus;
  urls: ServerUrls | null;
  user: StoredUser | null;
  deviceId: string | null;
  deviceName: string;
  jellyfin: Jellyfin | null;
  api: Api | null;
  connection: ConnectionManager | null;
  connectionMode: ConnectionMode;
  boot: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
}

async function ensureDevice(): Promise<{ deviceId: string; deviceName: string; jellyfin: Jellyfin }> {
  let deviceId = await getSetting<string>(SettingKeys.deviceId);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await setSetting(SettingKeys.deviceId, deviceId);
  }
  const deviceName = await getDeviceName();
  return { deviceId, deviceName, jellyfin: createJellyfin({ id: deviceId, name: deviceName }, APP_VERSION) };
}

export const useSession = create<SessionState>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  async function activate(urls: ServerUrls, token: string, user: StoredUser): Promise<void> {
    unsubscribe?.();
    unsubscribe = null;
    get().connection?.stop();
    let jellyfin = get().jellyfin;
    if (!jellyfin) {
      const device = await ensureDevice();
      jellyfin = device.jellyfin;
      set({ deviceId: device.deviceId, deviceName: device.deviceName, jellyfin });
    }
    const connection = new ConnectionManager(urls, { probe: probeJellyfin });
    unsubscribe = connection.subscribe((state) => {
      const base = state.baseUrl ?? urls.local;
      if (base !== get().api?.basePath) {
        set({ connectionMode: state.mode, api: createApi(jellyfin, base, token) });
      } else {
        set({ connectionMode: state.mode });
      }
    });
    set({
      status: 'signedIn',
      urls,
      user,
      jellyfin,
      connection,
      connectionMode: 'offline',
      api: createApi(jellyfin, urls.local, token),
    });
    void connection.connect().then(() => connection.startRecheck());
  }

  return {
    status: 'booting',
    urls: null,
    user: null,
    deviceId: null,
    deviceName: 'Windows PC',
    jellyfin: null,
    api: null,
    connection: null,
    connectionMode: 'offline',

    async boot() {
      try {
        const { deviceId, deviceName, jellyfin } = await ensureDevice();
        set({ deviceId, deviceName, jellyfin });
        const urls = await getSetting<ServerUrls>(SettingKeys.serverUrls);
        const user = await getSetting<StoredUser>(SettingKeys.authUser);
        const token = await getCredential(CredentialKeys.jellyfinToken);
        if (urls && user && token) {
          await activate(urls, token, user);
          return;
        }
        set({ status: 'signedOut', urls, user: null, api: null });
      } catch (error) {
        console.error('[session] boot failed', error);
        set({ status: 'signedOut', user: null, api: null, connection: null, connectionMode: 'offline' });
      }
    },

    async signIn({ urls, auth, viaQuickConnect }) {
      const user: StoredUser = { userId: auth.userId, userName: auth.userName, viaQuickConnect };
      await setSetting(SettingKeys.serverUrls, urls);
      await setSetting(SettingKeys.authUser, user);
      await setCredential(CredentialKeys.jellyfinToken, auth.accessToken);
      await activate(urls, auth.accessToken, user);
    },

    async signOut() {
      const results = await Promise.allSettled([
        deleteCredential(CredentialKeys.jellyfinToken),
        deleteCredential(CredentialKeys.seerrPassword),
        deleteSetting(SettingKeys.authUser),
        deleteSetting(SettingKeys.seerrUser),
      ]);
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('[session] sign-out cleanup failed', result.reason);
        }
      }
      unsubscribe?.();
      unsubscribe = null;
      get().connection?.stop();
      set({ status: 'signedOut', user: null, api: null, connection: null, connectionMode: 'offline' });
    },
  };
});
