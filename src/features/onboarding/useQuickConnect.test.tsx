import { renderHook, act } from '@testing-library/react';
import { useQuickConnect } from '@/features/onboarding/useQuickConnect';
import * as auth from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

vi.mock('@/lib/jellyfin/auth');

const api = {} as Api;
const result = { accessToken: 't', userId: 'u', userName: 'n' };

describe('useQuickConnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(auth.isQuickConnectEnabled).mockResolvedValue(true);
    vi.mocked(auth.initiateQuickConnect).mockResolvedValue({ secret: 's', code: '424242' });
    vi.mocked(auth.authenticateWithQuickConnect).mockResolvedValue(result);
  });
  afterEach(() => vi.useRealTimers());

  it('zeigt den Code und meldet nach Bestätigung an', async () => {
    vi.mocked(auth.checkQuickConnect).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const onSuccess = vi.fn();
    const { result: hook } = renderHook(() => useQuickConnect(api, onSuccess));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.current.status).toBe('waiting');
    expect(hook.current.code).toBe('424242');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(onSuccess).toHaveBeenCalledWith(result);
    expect(hook.current.status).toBe('done');
  });

  it('meldet, wenn Quick Connect deaktiviert ist', async () => {
    vi.mocked(auth.isQuickConnectEnabled).mockResolvedValue(false);
    const { result: hook } = renderHook(() => useQuickConnect(api, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(hook.current.status).toBe('disabled');
  });

  it('stoppt das Polling beim Unmount', async () => {
    vi.mocked(auth.checkQuickConnect).mockResolvedValue(false);
    const { unmount } = renderHook(() => useQuickConnect(api, vi.fn()));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    const calls = vi.mocked(auth.checkQuickConnect).mock.calls.length;
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(6000);
    });
    expect(vi.mocked(auth.checkQuickConnect).mock.calls.length).toBe(calls);
  });
});
