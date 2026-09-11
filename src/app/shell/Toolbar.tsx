import { ArrowLeft } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/components/glass/GlassPanel';

export function Toolbar({ title }: { title?: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <GlassPanel preset="bar" className="mx-3 mt-3 h-11 shrink-0" contentClassName="flex h-full items-center gap-2 px-2">
      <button
        aria-label={t('common.back')}
        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
        onClick={() => router.history.back()}
      >
        <ArrowLeft size={18} />
      </button>
      <span className="text-sm font-medium">{title}</span>
    </GlassPanel>
  );
}
