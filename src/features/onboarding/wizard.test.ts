import { wizardReducer, serverBaseUrl, type WizardState } from '@/features/onboarding/wizard';

const ok = { ok: true as const, serverName: 'NAS', version: '10', id: '1' };
const fail = { ok: false as const, error: 'x' };

describe('wizard', () => {
  it('geht von server zu login zu seerr', () => {
    let s: WizardState = { step: 'server' };
    s = wizardReducer(s, { type: 'serverDone', result: { urls: { local: 'http://l' }, local: ok } });
    expect(s.step).toBe('login');
    s = wizardReducer(s, {
      type: 'loginDone',
      auth: { accessToken: 't', userId: 'u', userName: 'n' },
      viaQuickConnect: true,
    });
    expect(s.step).toBe('seerr');
    expect(s.viaQuickConnect).toBe(true);
  });

  it('geht zurück', () => {
    const s = wizardReducer({ step: 'login' }, { type: 'back' });
    expect(s.step).toBe('server');
  });

  it('wählt die Basis-URL', () => {
    expect(serverBaseUrl({ urls: { local: 'http://l', external: 'http://e' }, local: ok, external: ok })).toBe('http://l');
    expect(serverBaseUrl({ urls: { local: 'http://l', external: 'http://e' }, local: fail, external: ok })).toBe('http://e');
    expect(serverBaseUrl({ urls: { local: 'http://l' }, local: fail })).toBe('http://l');
  });
});
