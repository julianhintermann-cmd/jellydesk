import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginStep } from '@/features/onboarding/LoginStep';
import * as auth from '@/lib/jellyfin/auth';
import type { Api } from '@/lib/jellyfin/client';

vi.mock('@/lib/jellyfin/auth');
vi.mock('@/features/onboarding/useQuickConnect', () => ({
  useQuickConnect: () => ({ status: 'waiting', code: '111111' }),
}));

const api = {} as Api;

describe('LoginStep', () => {
  it('meldet mit Passwort an und reicht das Passwort weiter', async () => {
    vi.mocked(auth.loginWithPassword).mockResolvedValue({ accessToken: 't', userId: 'u', userName: 'julian' });
    const onSuccess = vi.fn();
    render(<LoginStep api={api} serverName="NAS" onSuccess={onSuccess} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Passwort' }));
    await userEvent.type(screen.getByLabelText('Benutzername'), 'julian');
    await userEvent.type(screen.getByLabelText('Passwort'), 'geheim');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(auth.loginWithPassword).toHaveBeenCalledWith(api, 'julian', 'geheim');
    expect(onSuccess).toHaveBeenCalledWith({ accessToken: 't', userId: 'u', userName: 'julian' }, false, 'geheim');
  });

  it('zeigt einen Fehler bei falschen Zugangsdaten', async () => {
    vi.mocked(auth.loginWithPassword).mockRejectedValue(new Error('401'));
    render(<LoginStep api={api} serverName="NAS" onSuccess={vi.fn()} onBack={vi.fn()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Passwort' }));
    await userEvent.type(screen.getByLabelText('Benutzername'), 'julian');
    await userEvent.type(screen.getByLabelText('Passwort'), 'falsch');
    await userEvent.click(screen.getByRole('button', { name: 'Anmelden' }));
    expect(await screen.findByText(/fehlgeschlagen/)).toBeInTheDocument();
  });

  it('zeigt den Quick-Connect-Code', () => {
    render(<LoginStep api={api} serverName="NAS" onSuccess={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByText('111111')).toBeInTheDocument();
  });
});
