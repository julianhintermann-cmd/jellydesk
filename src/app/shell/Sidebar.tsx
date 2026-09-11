import { Link } from '@tanstack/react-router';
import { Compass, Download, Home, Search, Settings, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlassPanel } from '@/components/glass/GlassPanel';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

const ITEMS: NavItem[] = [
  { to: '/home', labelKey: 'nav.home', icon: Home },
  { to: '/search', labelKey: 'nav.search', icon: Search },
  { to: '/discover', labelKey: 'nav.discover', icon: Compass },
  { to: '/downloads', labelKey: 'nav.downloads', icon: Download },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  return (
    <GlassPanel preset="sidebar" className="m-3 mr-0 w-56 shrink-0" contentClassName="flex h-full flex-col p-3">
      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ to, labelKey, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--lq-text-dim)] hover:bg-white/10 hover:text-[var(--lq-text)] [&.active]:bg-white/15 [&.active]:text-[var(--lq-text)]"
          >
            <Icon size={18} />
            <span>{t(labelKey)}</span>
          </Link>
        ))}
      </nav>
    </GlassPanel>
  );
}
