import { useTranslation } from 'react-i18next';

export function OnboardingPage() {
  const { t } = useTranslation();
  return <div className="flex h-full items-center justify-center">{t('onboarding.server.title')}</div>;
}
