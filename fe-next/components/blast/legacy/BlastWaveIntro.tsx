'use client';

import { useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getMascotForArchetype, MASCOT_IMAGES } from './utils/blastMascot';
import type { BlastWaveArchetype } from './utils/blastWaveConfig';

interface BlastWaveIntroProps {
  waveNumber: number;
  archetype: BlastWaveArchetype;
  t: (key: string) => string | undefined;
}

const INTRO_DISPLAY_MS = 1500;

const ARCHETYPE_ACCENT: Record<BlastWaveArchetype, string> = {
  normal: 'text-neo-white',
  scoreRush: 'text-neo-lime',
  treasureHunt: 'text-yellow-300',
  survival: 'text-neo-pink',
  silence: 'text-neo-cyan',
};

export function BlastWaveIntro({ waveNumber, archetype, t }: BlastWaveIntroProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const id = setTimeout(() => setVisible(false), INTRO_DISPLAY_MS);
    return () => clearTimeout(id);
  }, [waveNumber]);

  if (!visible) return null;

  const mascotKey = getMascotForArchetype(archetype);
  const mascotSrc = MASCOT_IMAGES[mascotKey];
  const label = t(`blast.archetypes.${archetype}`) || '';
  const mascotAlt = t(`blast.mascot.${mascotKey}`) || '';
  const accent = ARCHETYPE_ACCENT[archetype];

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-center gap-3">
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key={waveNumber}
          initial={{ scale: 0, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-28 h-28 rounded-neo border-3 border-neo-black shadow-hard-lg overflow-hidden bg-neo-navy-light">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mascotSrc}
              alt={mascotAlt}
              data-testid="blast-wave-intro-mascot"
              data-mascot-key={mascotKey}
              className="w-full h-full object-cover"
            />
          </div>
          <span
            className={`${accent} font-neo-display font-black uppercase tracking-wider text-2xl px-4 py-1 rounded-neo bg-black/70 border-2 border-neo-black shadow-hard`}
          >
            {label}
          </span>
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default BlastWaveIntro;
