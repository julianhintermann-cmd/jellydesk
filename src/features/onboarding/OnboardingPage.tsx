import { useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { Button } from '@/components/ui/button';
import { ServerStep } from '@/features/onboarding/ServerStep';
import { LoginStep } from '@/features/onboarding/LoginStep';
import { SeerrStep } from '@/features/onboarding/SeerrStep';
import { serverBaseUrl, wizardReducer } from '@/features/onboarding/wizard';
import { useSession } from '@/features/auth/session';
import { createApi } from '@/lib/jellyfin/client';
import { useNavigate } from '@tanstack/react-router';

export function OnboardingPage() {
  const { t } = useTranslation();
  const storedUrls = useSession((s) => s.urls);
  const jellyfin = useSession((s) => s.jellyfin);
  const signIn = useSession((s) => s.signIn);
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(wizardReducer, { step: 'server' });
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string>();

  const api = useMemo(
    () => (state.server && jellyfin ? createApi(jellyfin, serverBaseUrl(state.server)) : null),
    [state.server, jellyfin],
  );
  const serverName =
    (state.server?.local.ok ? state.server.local.serverName : undefined) ??
    (state.server?.external?.ok ? state.server.external.serverName : undefined) ??
    state.server?.urls.local ??
    '';

  async function finish() {
    if (!state.server || !state.auth) return;
    setFinishing(true);
    setFinishError(undefined);
    try {
      await signIn({ urls: state.server.urls, auth: state.auth, viaQuickConnect: state.viaQuickConnect ?? false });
      await navigate({ to: '/home' });
    } catch (error) {
      console.error('[onboarding] finish failed', error);
      setFinishError(t('onboarding.finish.failed'));
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <GlassPanel preset="sheet" className="p-8" contentClassName="p-0">
        {state.step === 'server' && (
          <ServerStep initial={storedUrls ?? undefined} onContinue={(result) => dispatch({ type: 'serverDone', result })} />
        )}
        {state.step === 'login' && api && (
          <LoginStep
            api={api}
            serverName={serverName}
            onBack={() => dispatch({ type: 'back' })}
            onSuccess={(auth, viaQuickConnect, password) =>
              dispatch({ type: 'loginDone', auth, viaQuickConnect, password })
            }
          />
        )}
        {state.step === 'seerr' && state.server && state.auth && (
          <div className="flex w-[440px] flex-col gap-4">
            <SeerrStep
              jellyfinUrls={state.server.urls}
              username={state.auth.userName}
              password={state.password}
              onDone={() => void finish()}
            />
            {finishError && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--lq-danger-text)]">{finishError}</span>
                <Button variant="accent" disabled={finishing} onClick={() => void finish()}>
                  {t('common.retry')}
                </Button>
              </div>
            )}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
