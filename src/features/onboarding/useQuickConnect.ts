import { useEffect, useRef, useState } from 'react';
import type { Api } from '@/lib/jellyfin/client';
import {
  authenticateWithQuickConnect,
  checkQuickConnect,
  initiateQuickConnect,
  isQuickConnectEnabled,
  type AuthResult,
} from '@/lib/jellyfin/auth';

export interface QuickConnectState {
  status: 'idle' | 'disabled' | 'waiting' | 'done' | 'error';
  code?: string;
  error?: string;
}

export const QUICK_CONNECT_POLL_MS = 2000;

export function useQuickConnect(api: Api | null, onSuccess: (auth: AuthResult) => void): QuickConnectState {
  const [state, setState] = useState<QuickConnectState>({ status: 'idle' });
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    (async () => {
      try {
        if (!(await isQuickConnectEnabled(api))) {
          if (!cancelled) setState({ status: 'disabled' });
          return;
        }
        const { secret, code } = await initiateQuickConnect(api);
        if (cancelled) return;
        setState({ status: 'waiting', code });
        timer = setInterval(async () => {
          try {
            if (!(await checkQuickConnect(api, secret))) return;
            stop();
            const auth = await authenticateWithQuickConnect(api, secret);
            if (cancelled) return;
            setState({ status: 'done', code });
            onSuccessRef.current(auth);
          } catch (e) {
            stop();
            if (!cancelled) setState({ status: 'error', error: String(e) });
          }
        }, QUICK_CONNECT_POLL_MS);
      } catch (e) {
        if (!cancelled) setState({ status: 'error', error: String(e) });
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, [api]);

  return state;
}
