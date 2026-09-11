import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { Segmented } from '@/components/form/Segmented';
import { useQuickConnect } from '@/features/onboarding/useQuickConnect';
import { loginWithPassword, type AuthResult } from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

export interface LoginStepProps {
  api: Api;
  serverName: string;
  onSuccess: (auth: AuthResult, viaQuickConnect: boolean, password?: string) => void;
  onBack: () => void;
}

export function LoginStep({ api, serverName, onSuccess, onBack }: LoginStepProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'quick' | 'password'>('quick');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const quick = useQuickConnect(mode === 'quick' ? api : null, (auth) => onSuccess(auth, true));

  async function submit() {
    setBusy(true);
    setError(undefined);
    try {
      const auth = await loginWithPassword(api, username, password);
      onSuccess(auth, false, password);
    } catch {
      setError(t('onboarding.login.failed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.login.title', { server: serverName })}</h1>
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as 'quick' | 'password')}
        options={[
          { value: 'quick', label: t('onboarding.login.quickConnect') },
          { value: 'password', label: t('onboarding.login.password') },
        ]}
      />
      {mode === 'quick' ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          {quick.status === 'disabled' && <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.login.quickConnectDisabled')}</p>}
          {quick.status === 'error' && <p className="text-sm text-[var(--lq-danger-text)]">{quick.error}</p>}
          {(quick.status === 'waiting' || quick.status === 'done') && (
            <>
              <span className="font-mono text-4xl tracking-[0.3em]">{quick.code}</span>
              <p className="text-sm text-[var(--lq-text-dim)]">{t('onboarding.login.quickConnectHint')}</p>
              <p className="text-xs text-[var(--lq-text-dim)]">{t('onboarding.login.waiting')}</p>
            </>
          )}
          {quick.status === 'idle' && <p className="text-sm text-[var(--lq-text-dim)]">{t('common.loading')}</p>}
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <TextInput label={t('onboarding.login.username')} value={username} onChange={setUsername} autoFocus />
          <TextInput label={t('onboarding.login.passwordField')} value={password} onChange={setPassword} type="password" error={error} />
          <div className="flex justify-end pt-1">
            <Button variant="accent" onClick={() => void submit()} disabled={busy || !username}>
              {t('onboarding.login.signIn')}
            </Button>
          </div>
        </form>
      )}
      <div className="flex justify-start">
        <Button variant="glass" onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
}
