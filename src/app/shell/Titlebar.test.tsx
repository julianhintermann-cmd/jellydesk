import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Titlebar } from '@/app/shell/Titlebar';
import { appWindow } from '@/lib/tauri/window';

vi.mock('@/lib/tauri/window', () => ({
  appWindow: { minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), setFullscreen: vi.fn() },
}));

describe('Titlebar', () => {
  it('ruft die Fensterfunktionen auf', async () => {
    render(<Titlebar />);
    await userEvent.click(screen.getByLabelText('Minimieren'));
    await userEvent.click(screen.getByLabelText('Maximieren'));
    await userEvent.click(screen.getByLabelText('Schliessen'));
    expect(appWindow.minimize).toHaveBeenCalled();
    expect(appWindow.toggleMaximize).toHaveBeenCalled();
    expect(appWindow.close).toHaveBeenCalled();
  });
});
