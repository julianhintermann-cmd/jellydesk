import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

vi.mock('@/lib/tauri/system', () => ({ getSystemTransparencyEnabled: vi.fn(async () => true) }));

describe('App', () => {
  it('rendert die Shell mit Titelleiste', async () => {
    render(<App />);
    expect(await screen.findByText('JellyDesk')).toBeInTheDocument();
  });
});
