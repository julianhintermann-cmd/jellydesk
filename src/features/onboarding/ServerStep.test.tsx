import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServerStep } from '@/features/onboarding/ServerStep';

describe('ServerStep', () => {
  it('prüft beide Adressen und geht weiter', async () => {
    const probe = vi.fn(async (url: string) =>
      url === 'http://192.168.1.125:8096'
        ? { ok: true as const, serverName: 'NAS', version: '10.10', id: '1' }
        : { ok: false as const, error: 'timeout' },
    );
    const onContinue = vi.fn();
    render(<ServerStep onContinue={onContinue} probe={probe} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), '192.168.1.125:8096');
    await userEvent.type(screen.getByLabelText('Externe Adresse (optional)'), 'https://jf.example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(await screen.findByText(/NAS/)).toBeInTheDocument();
    expect(screen.getByText('Nicht erreichbar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(onContinue).toHaveBeenCalledWith({
      urls: { local: 'http://192.168.1.125:8096', external: 'https://jf.example.com' },
      local: { ok: true, serverName: 'NAS', version: '10.10', id: '1' },
      external: { ok: false, error: 'timeout' },
    });
  });

  it('zeigt einen Fehler bei ungültiger Adresse', async () => {
    render(<ServerStep onContinue={vi.fn()} probe={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), 'not a url');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    expect(screen.getByText(/gültige Adresse/)).toBeInTheDocument();
  });

  it('bietet "Trotzdem weiter", wenn lokal nicht erreichbar ist', async () => {
    const probe = vi.fn(async () => ({ ok: false as const, error: 'timeout' }));
    const onContinue = vi.fn();
    render(<ServerStep onContinue={onContinue} probe={probe} />);
    await userEvent.type(screen.getByLabelText('Lokale Adresse'), 'http://a:8096');
    await userEvent.click(screen.getByRole('button', { name: 'Verbinden' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Trotzdem weiter' }));
    expect(onContinue).toHaveBeenCalled();
  });
});
