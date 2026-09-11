import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useSession } from '@/features/auth/session';

export function HomePage() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const signOut = useSession((s) => s.signOut);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    await navigate({ to: '/onboarding' });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">{t('home.greeting', { name: user?.userName ?? '' })}</h1>
      <div>
        <Button variant="glass" onClick={() => void handleSignOut()}>
          {t('common.signOut')}
        </Button>
      </div>
    </div>
  );
}
