import type { AuthResult } from '@/lib/jellyfin/auth';
import type { ServerUrls } from '@/lib/connection/ConnectionManager';
import type { ProbeResult } from '@/lib/connection/probe';

export interface ServerStepResult {
  urls: ServerUrls;
  local: ProbeResult;
  external?: ProbeResult;
}

export interface WizardState {
  step: 'server' | 'login' | 'seerr';
  server?: ServerStepResult;
  auth?: AuthResult;
  viaQuickConnect?: boolean;
  password?: string;
}

export type WizardAction =
  | { type: 'serverDone'; result: ServerStepResult }
  | { type: 'loginDone'; auth: AuthResult; viaQuickConnect: boolean; password?: string }
  | { type: 'back' };

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'serverDone':
      return { ...state, step: 'login', server: action.result };
    case 'loginDone':
      return {
        ...state,
        step: 'seerr',
        auth: action.auth,
        viaQuickConnect: action.viaQuickConnect,
        password: action.password,
      };
    case 'back':
      return { ...state, step: state.step === 'seerr' ? 'login' : 'server' };
  }
}

export function serverBaseUrl(result: ServerStepResult): string {
  if (result.local.ok) return result.urls.local;
  if (result.external?.ok && result.urls.external) return result.urls.external;
  return result.urls.local;
}
