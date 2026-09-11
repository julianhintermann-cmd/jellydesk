import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { deriveSeerrUrl, normalizeServerUrl } from '@/lib/connection/url';
import { seerrLogin, seerrSetBaseUrl } from '@/lib/seerr/client';
import { setSetting } from '@/lib/tauri/settings';
import { setCredential } from '@/lib/tauri/credentials';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';

export interface SeerrStepProps {
  jellyfinUrls: ServerUrls;
  username: string;
  password?: string;
  onDone: () => void;
}

export function SeerrStep({ jellyfinUrls, username, password, onDone }: SeerrStepProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(deriveSeerrUrl(jellyfinUrls.local));
  const [external, setExternal] = useState(jellyfinUrls.external ? deriveSeerrUrl(jellyfinUrls.external) : '');
  const [pw, setPw] = useState(password ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const needsPassword = password === undefined;

  async function connect() {
    const localUrl = normalizeServerUrl(local);
    const externalUrl = external.trim() ? normalizeServerUrl(external) : undefined;
    if (!localUrl || (external.trim() && !externalUrl)) {
      setError(t('onboarding.server.invalidUrl'));
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await seerrSetBaseUrl(localUrl);
      const user = await seerrLogin(username, pw);
      await setSetting(SettingKeys.seerrUrls, externalUrl ? { local: localUrl, external: externalUrl } : { local: localUrl });
      await setSetting(SettingKeys.seerrUser, { ...user, username });
      await setCredential(CredentialKeys.seerrPassword, pw);
      onDone();
    } catch {
      setError(t('onboarding.seerr.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.seerr.title')}</h1>
      <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.seerr.description')}</p>
      <TextInput label={t('onboarding.seerr.localUrl')} value={local} onChange={setLocal} />
      <TextInput label={t('onboarding.seerr.externalUrl')} value={external} onChange={setExternal} />
      {needsPassword && (
        <>
          <p className="text-xs text-[var(--lq-text-dim)]">{t('onboarding.seerr.passwordHint')}</p>
          <TextInput label={t('onboarding.login.passwordField')} value={pw} onChange={setPw} type="password" />
        </>
      )}
      {error && <span className="text-xs text-[var(--lq-danger-text)]">{error}</span>}
      <div className="flex justify-between pt-2">
        <Button variant="glass" onClick={onDone}>
          {t('common.skip')}
        </Button>
        <Button variant="accent" disabled={busy || !pw} onClick={() => void connect()}>
          {busy ? t('common.loading') : t('onboarding.seerr.connect')}
        </Button>
      </div>
    </div>
  );
}
