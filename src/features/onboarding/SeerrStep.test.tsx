import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeerrStep } from '@/features/onboarding/SeerrStep';
import * as seerr from '@/lib/seerr/client';
import { setSetting } from '@/lib/tauri/settings';
import { setCredential } from '@/lib/tauri/credentials';
import { SettingKeys, CredentialKeys } from '@/lib/settings/keys';

vi.mock('@/lib/seerr/client');
vi.mock('@/lib/tauri/settings', () => ({ setSetting: vi.fn(async () => undefined), getSetting: vi.fn(async () => null) }));
vi.mock('@/lib/tauri/credentials', () => ({ setCredential: vi.fn(async () => undefined) }));

const urls = { local: 'http://192.168.1.125:8096', external: 'https://jf.example.com' };

describe('SeerrStep', () => {
  it('belegt die Adressen vor, meldet an und speichert', async () => {
    vi.mocked(seerr.seerrLogin).mockResolvedValue({ id: 1, displayName: 'julian', permissions: 2 });
    const onDone = vi.fn();
    render(<SeerrStep jellyfinUrls={urls} username="julian" password="pw" onDone={onDone} />);
    expect(screen.getByLabelText('Lokale Adresse')).toHaveValue('http://192.168.1.125:5055');
    expect(screen.getByLabelText('Externe Adresse (optional)')).toHaveValue('https://jf.example.com:5055');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(seerr.seerrSetBaseUrl).toHaveBeenCalledWith('http://192.168.1.125:5055');
    expect(seerr.seerrLogin).toHaveBeenCalledWith('julian', 'pw');
    expect(setSetting).toHaveBeenCalledWith(SettingKeys.seerrUrls, {
      local: 'http://192.168.1.125:5055',
      external: 'https://jf.example.com:5055',
    });
    expect(setSetting).toHaveBeenCalledWith(SettingKeys.seerrUser, {
      id: 1,
      displayName: 'julian',
      permissions: 2,
      username: 'julian',
    });
    expect(setCredential).toHaveBeenCalledWith(CredentialKeys.seerrPassword, 'pw');
    expect(onDone).toHaveBeenCalled();
  });

  it('fragt nach dem Passwort, wenn keins vorliegt', () => {
    render(<SeerrStep jellyfinUrls={urls} username="julian" onDone={vi.fn()} />);
    expect(screen.getByLabelText('Passwort')).toBeInTheDocument();
    expect(screen.getByText(/Quick Connect/)).toBeInTheDocument();
  });

  it('lässt sich überspringen', async () => {
    const onDone = vi.fn();
    render(<SeerrStep jellyfinUrls={urls} username="julian" password="pw" onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Überspringen' }));
    expect(onDone).toHaveBeenCalled();
  });
});
