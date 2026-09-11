import { http, HttpResponse } from 'msw';
import { server, JF } from '@/test/msw';
import { createJellyfin, createApi } from '@/lib/jellyfin/client';
import {
  loginWithPassword,
  isQuickConnectEnabled,
  initiateQuickConnect,
  checkQuickConnect,
  authenticateWithQuickConnect,
} from '@/lib/jellyfin/auth';

const jellyfin = createJellyfin({ id: 'dev-1', name: 'TestPC' }, '0.1.0');
const api = () => createApi(jellyfin, JF);

describe('jellyfin auth', () => {
  it('meldet mit Passwort an und sendet den MediaBrowser-Header', async () => {
    let authHeader = '';
    server.use(
      http.post(`${JF}/Users/AuthenticateByName`, async ({ request }) => {
        authHeader = request.headers.get('authorization') ?? '';
        const body = (await request.json()) as { Username: string; Pw: string };
        expect(body).toEqual({ Username: 'julian', Pw: 'geheim' });
        return HttpResponse.json({ AccessToken: 'tok', User: { Id: 'u1', Name: 'julian' } });
      }),
    );
    const r = await loginWithPassword(api(), 'julian', 'geheim');
    expect(r).toEqual({ accessToken: 'tok', userId: 'u1', userName: 'julian' });
    expect(authHeader).toContain('Client="JellyDesk"');
    expect(authHeader).toContain('DeviceId="dev-1"');
  });

  it('erkennt deaktiviertes Quick Connect', async () => {
    server.use(http.get(`${JF}/QuickConnect/Enabled`, () => HttpResponse.json(false)));
    expect(await isQuickConnectEnabled(api())).toBe(false);
  });

  it('führt den Quick-Connect-Ablauf durch', async () => {
    server.use(
      http.post(`${JF}/QuickConnect/Initiate`, () =>
        HttpResponse.json({ Secret: 's3', Code: '123456', Authenticated: false }),
      ),
      http.get(`${JF}/QuickConnect/Connect`, ({ request }) => {
        const secret = new URL(request.url).searchParams.get('secret');
        return HttpResponse.json({ Secret: secret, Code: '123456', Authenticated: true });
      }),
      http.post(`${JF}/Users/AuthenticateWithQuickConnect`, async ({ request }) => {
        expect(await request.json()).toEqual({ Secret: 's3' });
        return HttpResponse.json({ AccessToken: 'qc-tok', User: { Id: 'u1', Name: 'julian' } });
      }),
    );
    const a = api();
    const { secret, code } = await initiateQuickConnect(a);
    expect(code).toBe('123456');
    expect(await checkQuickConnect(a, secret)).toBe(true);
    expect(await authenticateWithQuickConnect(a, secret)).toEqual({
      accessToken: 'qc-tok',
      userId: 'u1',
      userName: 'julian',
    });
  });
});
