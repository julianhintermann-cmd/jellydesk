import { useEffect } from 'react';
import { getSystemTransparencyEnabled } from '@/lib/tauri/system';
import { useAppearance } from '@/features/appearance/appearance';

const POLL_MS = 30_000;

export function useSystemAppearanceSync(): void {
  const setSystemTransparency = useAppearance((s) => s.setSystemTransparency);
  useEffect(() => {
    let cancelled = false;
    const read = async () => {
      try {
        const enabled = await getSystemTransparencyEnabled();
        if (!cancelled) setSystemTransparency(enabled);
      } catch {
        /* Windows-Wert nicht lesbar → Standard beibehalten */
      }
    };
    void read();
    const id = window.setInterval(read, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [setSystemTransparency]);
}
