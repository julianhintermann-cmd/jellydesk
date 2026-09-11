import { useMemo, useReducer } from 'react';
import { GlassPanel } from '@/components/glass/GlassPanel';
import { ServerStep } from '@/features/onboarding/ServerStep';
import { LoginStep } from '@/features/onboarding/LoginStep';
import { SeerrStep } from '@/features/onboarding/SeerrStep';
import { serverBaseUrl, wizardReducer } from '@/features/onboarding/wizard';
import { useSession } from '@/features/auth/session';
import { createApi } from '@/lib/jellyfin/client';
import { useNavigate } from '@tanstack/react-router';

export function OnboardingPage() {
  const storedUrls = useSession((s) => s.urls);
  const jellyfin = useSession((s) => s.jellyfin);
  const signIn = useSession((s) => s.signIn);
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(wizardReducer, { step: 'server' });

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
    await signIn({ urls: state.server.urls, auth: state.auth, viaQuickConnect: state.viaQuickConnect ?? false });
    await navigate({ to: '/home' });
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
          <SeerrStep
            jellyfinUrls={state.server.urls}
            username={state.auth.userName}
            password={state.password}
            onDone={() => void finish()}
          />
        )}
      </GlassPanel>
    </div>
  );
}
