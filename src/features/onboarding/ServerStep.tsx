import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/form/TextInput';
import { normalizeServerUrl } from '@/lib/connection/url';
import { probeJellyfin, type ProbeResult } from '@/lib/connection/probe';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';
import type { ServerStepResult } from '@/features/onboarding/wizard';

export interface ServerStepProps {
  initial?: ServerUrls;
  onContinue: (result: ServerStepResult) => void;
  probe?: typeof probeJellyfin;
}

function ProbeLine({ label, result }: { label: string; result?: ProbeResult }) {
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <div className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2 text-sm">
      <span className="text-[var(--lq-text-dim)]">{label}</span>
      {result.ok ? (
        <span className="text-emerald-300">
          {t('onboarding.server.reachable')} · {result.serverName} {result.version}
        </span>
      ) : (
        <span className="text-[var(--lq-danger-text)]">{t('onboarding.server.unreachable')}</span>
      )}
    </div>
  );
}

export function ServerStep({ initial, onContinue, probe = probeJellyfin }: ServerStepProps) {
  const { t } = useTranslation();
  const [local, setLocal] = useState(initial?.local ?? '');
  const [external, setExternal] = useState(initial?.external ?? '');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ServerStepResult>();

  async function connect() {
    const localUrl = normalizeServerUrl(local);
    const externalUrl = external.trim() ? normalizeServerUrl(external) : undefined;
    if (!localUrl || (external.trim() && !externalUrl)) {
      setError(t('onboarding.server.invalidUrl'));
      return;
    }
    setError(undefined);
    setBusy(true);
    setResult(undefined);
    const [localProbe, externalProbe] = await Promise.all([
      probe(localUrl, 5000),
      externalUrl ? probe(externalUrl, 5000) : Promise.resolve(undefined),
    ]);
    setResult({
      urls: externalUrl ? { local: localUrl, external: externalUrl } : { local: localUrl },
      local: localProbe,
      external: externalProbe,
    });
    setBusy(false);
  }

  const anyReachable = result?.local.ok || result?.external?.ok;

  return (
    <div className="flex w-[440px] flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('onboarding.server.title')}</h1>
      <TextInput
        label={t('onboarding.server.localUrl')}
        value={local}
        onChange={setLocal}
        placeholder="http://192.168.1.125:8096"
        autoFocus
        error={error}
      />
      <TextInput
        label={t('onboarding.server.externalUrl')}
        value={external}
        onChange={setExternal}
        placeholder="https://jellyfin.example.com"
      />
      <ProbeLine label={t('onboarding.server.localUrl')} result={result?.local} />
      <ProbeLine label={t('onboarding.server.externalUrl')} result={result?.external} />
      <div className="flex justify-end gap-2 pt-2">
        {result && !anyReachable && (
          <Button variant="glass" onClick={() => onContinue(result)}>
            {t('onboarding.server.continueAnyway')}
          </Button>
        )}
        {result && anyReachable ? (
          <Button variant="accent" onClick={() => onContinue(result)}>
            {t('common.continue')}
          </Button>
        ) : (
          <Button variant="accent" disabled={busy} onClick={() => void connect()}>
            {busy ? t('common.loading') : t('onboarding.server.connect')}
          </Button>
        )}
      </div>
    </div>
  );
}
