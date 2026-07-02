'use client';

import { useState, useEffect } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getMascotForArchetype, MASCOT_IMAGES } from './utils/blastMascot';
import { TILE_VISUALS } from './blastTileVisuals';
import type { BlastWaveArchetype } from './utils/blastWaveConfig';
import type { BlastTileType } from '@/shared/types/blast';

interface BlastWaveIntroProps {
  waveNumber: number;
  archetype: BlastWaveArchetype;
  t: (key: string) => string | undefined;
  featured?: readonly BlastTileType[];
}

const INTRO_DISPLAY_MS = 1500;

const ARCHETYPE_ACCENT: Record<BlastWaveArchetype, string> = {
  normal: 'text-neo-white',
  scoreRush: 'text-neo-lime',
  treasureHunt: 'text-yellow-300',
  survival: 'text-neo-pink',
  silence: 'text-neo-cyan',
};

export function BlastWaveIntro({ waveNumber, archetype, t, featured }: BlastWaveIntroProps) {
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
          {featured && featured.length > 0 && (
            <div className="flex flex-row gap-2 flex-wrap justify-center">
              {featured.map((tile) => {
                const visual = TILE_VISUALS[tile];
                const tileNameKey = `blast.tileGuide.${tile}.name`;
                const tileDescKey = `blast.tileGuide.${tile}.desc`;
                const tileName = t(tileNameKey) || tile;
                const tileDesc = t(tileDescKey) || '';
                const Icon = visual.indicator;

                return (
                  <div
                    key={tile}
                    data-testid={`featured-chip-${tile}`}
                    className={`${accent} flex flex-col items-center gap-1 px-3 py-2 rounded-neo bg-black/70 border-2 border-neo-black shadow-hard`}
                  >
                    {Icon && (
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                    )}
                    <span className="font-neo-display font-bold text-sm uppercase tracking-wide">
                      {tileName}
                    </span>
                    {tileDesc && (
                      <span className="font-neo-body text-xs opacity-85 text-center max-w-[120px] leading-tight">
                        {tileDesc}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default BlastWaveIntro;
