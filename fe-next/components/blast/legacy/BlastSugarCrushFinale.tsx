'use client';

import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { MASCOT_IMAGES } from './utils/blastMascot';

interface BlastSugarCrushFinaleProps {
  active: boolean;
  t: (key: string) => string | undefined;
}

/**
 * Hype mascot overlay that rides along with the Sugar Crush dead-end cascade.
 * Pure, stateless — parent owns lifecycle via `active`.
 */
export function BlastSugarCrushFinale({ active, t }: BlastSugarCrushFinaleProps) {
  if (!active) return null;

  const mascotSrc = MASCOT_IMAGES.hyped;
  const title = t('blast.sugarCrush.title') || '';
  const alt = t('blast.mascot.hyped') || '';

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-3">
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          initial={{ scale: 0, rotate: -20, opacity: 0 }}
          animate={{ scale: 1.1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className="w-32 h-32 rounded-neo border-3 border-neo-black shadow-hard-lg overflow-hidden bg-neo-navy-light"
            style={{ boxShadow: '4px 4px 0 #000, 0 0 32px rgba(191,255,0,0.6)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mascotSrc}
              alt={alt}
              data-testid="blast-sugar-crush-mascot"
              data-mascot-key="hyped"
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className="text-neo-lime font-neo-display font-black uppercase tracking-wider text-3xl px-5 py-2 rounded-neo bg-black/80 border-3 border-neo-black shadow-hard-lg"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6), 0 0 24px rgba(191,255,0,0.7)' }}
          >
            {title}
          </span>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default BlastSugarCrushFinale;
