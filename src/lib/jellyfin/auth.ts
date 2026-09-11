import type { Api } from '@jellyfin/sdk';
import { getQuickConnectApi } from '@jellyfin/sdk/lib/utils/api/quick-connect-api';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import type { AuthenticationResult } from '@jellyfin/sdk/lib/generated-client/models';

export interface AuthResult {
  accessToken: string;
  userId: string;
  userName: string;
}

function toAuthResult(r: AuthenticationResult): AuthResult {
  if (!r.AccessToken || !r.User?.Id) throw new Error('Authentication response incomplete');
  return { accessToken: r.AccessToken, userId: r.User.Id, userName: r.User.Name ?? '' };
}

export async function loginWithPassword(api: Api, username: string, password: string): Promise<AuthResult> {
  const { data } = await getUserApi(api).authenticateUserByName({
    authenticateUserByName: { Username: username, Pw: password },
  });
  return toAuthResult(data);
}

export async function isQuickConnectEnabled(api: Api): Promise<boolean> {
  const { data } = await getQuickConnectApi(api).getQuickConnectEnabled();
  return data === true;
}

export async function initiateQuickConnect(api: Api): Promise<{ secret: string; code: string }> {
  const { data } = await getQuickConnectApi(api).initiateQuickConnect();
  if (!data.Secret || !data.Code) throw new Error('Quick Connect initiate failed');
  return { secret: data.Secret, code: data.Code };
}

export async function checkQuickConnect(api: Api, secret: string): Promise<boolean> {
  const { data } = await getQuickConnectApi(api).getQuickConnectState({ secret });
  return data.Authenticated === true;
}

export async function authenticateWithQuickConnect(api: Api, secret: string): Promise<AuthResult> {
  const { data } = await getUserApi(api).authenticateWithQuickConnect({
    quickConnectDto: { Secret: secret },
  });
  return toAuthResult(data);
}
