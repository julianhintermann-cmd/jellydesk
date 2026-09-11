import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { useSession } from '@/features/auth/session';

vi.mock('@/lib/tauri/system', () => ({
  getSystemTransparencyEnabled: vi.fn(async () => true),
  getDeviceName: vi.fn(async () => 'TestPC'),
}));

describe('App', () => {
  it('zeigt nach dem Boot ohne Session das Onboarding', async () => {
    useSession.setState({ status: 'signedOut' });
    render(<App />);
    expect(await screen.findByText('Mit deinem Jellyfin-Server verbinden')).toBeInTheDocument();
  });
});
