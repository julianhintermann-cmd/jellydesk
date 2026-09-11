import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { appWindow } from '@/lib/tauri/window';
import { GlassPanel } from '@/components/glass/GlassPanel';

const btn =
  'flex h-8 w-10 items-center justify-center rounded-lg text-[var(--lq-text-dim)] hover:bg-white/10 hover:text-[var(--lq-text)]';

export function Titlebar() {
  const { t } = useTranslation();
  return (
    <GlassPanel
      preset="bar"
      className="mx-3 mt-3 h-11 shrink-0"
      contentClassName="flex h-full items-center pl-4 pr-1"
    >
      <div data-tauri-drag-region className="flex h-full flex-1 items-center gap-2 text-sm font-semibold">
        <span data-tauri-drag-region>JellyDesk</span>
      </div>
      <button aria-label={t('common.minimize')} className={btn} onClick={() => void appWindow.minimize()}>
        <Minus size={16} />
      </button>
      <button aria-label={t('common.maximize')} className={btn} onClick={() => void appWindow.toggleMaximize()}>
        <Square size={13} />
      </button>
      <button
        aria-label={t('common.close')}
        className={`${btn} hover:bg-[var(--lq-danger)]/80 hover:text-white`}
        onClick={() => void appWindow.close()}
      >
        <X size={16} />
      </button>
    </GlassPanel>
  );
}
