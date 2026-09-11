import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useBackdrop } from '@/lib/backdrop';

export function BackdropLayer() {
  const url = useBackdrop((s) => s.url);
  const reduceMotion = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[var(--jd-base)]">
      <AnimatePresence>
        {url && (
          <motion.img
            key={url}
            src={url}
            alt=""
            draggable={false}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: reduceMotion ? 1.02 : 1.08 }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: { duration: 0.6 },
              scale: { duration: reduceMotion ? 0 : 30, ease: 'linear' },
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </AnimatePresence>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,10,15,0.45),rgba(10,10,15,0.75)_60%,#0a0a0f)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(90,70,160,0.25),transparent_50%),radial-gradient(circle_at_80%_90%,rgba(20,90,110,0.22),transparent_50%)]" />
    </div>
  );
}
