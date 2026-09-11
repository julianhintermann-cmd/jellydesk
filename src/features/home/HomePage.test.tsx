import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HomePage } from '@/features/home/HomePage';
import { useSession } from '@/features/auth/session';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigate,
}));

describe('HomePage', () => {
  it('begrüsst den Benutzer und meldet ab', async () => {
    const signOut = vi.fn(async () => undefined);
    useSession.setState({ user: { userId: 'u', userName: 'Julian', viaQuickConnect: false }, signOut });
    render(<HomePage />);
    expect(screen.getByText('Hallo Julian')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: '/onboarding' });
  });
});
