import { render, screen } from '@testing-library/react';
import { Sidebar } from '@/app/shell/Sidebar';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

describe('Sidebar', () => {
  it('zeigt die Hauptnavigation', () => {
    render(<Sidebar />);
    for (const label of ['Start', 'Einstellungen']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('blendet noch nicht gebaute Bereiche aus', () => {
    render(<Sidebar />);
    expect(screen.queryByText('Suche')).not.toBeInTheDocument();
  });
});
