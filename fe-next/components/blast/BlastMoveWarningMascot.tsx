'use client';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { MASCOT_IMAGES } from './utils/blastMascot';

interface BlastMoveWarningMascotProps {
  movesRemaining: number;
  t: (key: string) => string | undefined;
}

export function BlastMoveWarningMascot({ movesRemaining, t }: BlastMoveWarningMascotProps) {
  // Show only during the critical 1-3 window. At 0, the dead-end finale owns the screen.
  if (movesRemaining <= 0 || movesRemaining > 3) return null;

  const mascotSrc = MASCOT_IMAGES.sweating;
  const label = t('blast.moveWarning.label') || '';
  const alt = t('blast.mascot.sweating') || '';

  return (
    <div className="absolute top-4 right-4 pointer-events-none z-40 flex flex-col items-center gap-1">
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          initial={{ scale: 0, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 480, damping: 16 }}
          className="flex flex-col items-center gap-1"
        >
          <div
            className="w-16 h-16 rounded-neo border-3 border-neo-black shadow-hard overflow-hidden bg-neo-navy-light"
            style={{ boxShadow: '3px 3px 0 #000, 0 0 18px rgba(255,51,102,0.55)' }}
          >
            <Image
              src={mascotSrc}
              alt={alt}
              width={64}
              height={64}
              data-testid="blast-move-warning-mascot"
              data-mascot-key="sweating"
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <span
            className="text-neo-red font-neo-display font-black uppercase tracking-wider text-xs px-2 py-1 rounded-neo bg-black/80 border-2 border-neo-black shadow-hard-sm"
            style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
          >
            {label}
          </span>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default BlastMoveWarningMascot;
