import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingPage } from '@/features/onboarding/OnboardingPage';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('@/features/auth/session', () => {
  const state = { urls: null, jellyfin: {}, signIn };
  return {
    useSession: (selector: (s: typeof state) => unknown) => selector(state),
  };
});

vi.mock('@/lib/jellyfin/client', () => ({
  createApi: () => ({}),
}));

vi.mock('@/features/onboarding/ServerStep', () => ({
  ServerStep: ({ onContinue }: { onContinue: (result: unknown) => void }) => (
    <button
      onClick={() =>
        onContinue({
          urls: { local: 'http://l' },
          local: { ok: true, serverName: 'NAS', version: '10', id: '1' },
        })
      }
    >
      server-continue
    </button>
  ),
}));

vi.mock('@/features/onboarding/LoginStep', () => ({
  LoginStep: ({
    onSuccess,
  }: {
    onSuccess: (auth: unknown, viaQuickConnect: boolean, password?: string) => void;
  }) => (
    <button onClick={() => onSuccess({ accessToken: 't', userId: 'u', userName: 'julian' }, false, 'pw')}>
      login-success
    </button>
  ),
}));

vi.mock('@/features/onboarding/SeerrStep', () => ({
  SeerrStep: ({ onDone }: { onDone: () => void }) => <button onClick={onDone}>seerr-done</button>,
}));

async function driveToSeerrStep() {
  render(<OnboardingPage />);
  await userEvent.click(screen.getByText('server-continue'));
  await userEvent.click(screen.getByText('login-success'));
}

describe('OnboardingPage finish()', () => {
  beforeEach(() => {
    signIn.mockReset();
    navigate.mockReset();
  });

  it('zeigt einen Fehler mit Retry, wenn signIn fehlschlägt, und navigiert nach erfolgreichem Retry', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    signIn.mockRejectedValueOnce(new Error('boom'));
    await driveToSeerrStep();

    await userEvent.click(screen.getByText('seerr-done'));

    expect(await screen.findByText(/Bitte erneut versuchen/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();

    signIn.mockResolvedValueOnce(undefined);
    await userEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

    expect(navigate).toHaveBeenCalledWith({ to: '/home' });
    consoleError.mockRestore();
  });

  it('navigiert direkt, wenn signIn erfolgreich ist', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    signIn.mockResolvedValueOnce(undefined);
    await driveToSeerrStep();

    await userEvent.click(screen.getByText('seerr-done'));

    expect(navigate).toHaveBeenCalledWith({ to: '/home' });
    expect(screen.queryByText(/Bitte erneut versuchen/i)).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
