'use client';

import { useState, useEffect, useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { getMascotForArchetype, MASCOT_IMAGES } from './utils/blastMascot';
import { TILE_VISUALS } from './blastTileVisuals';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';
import type { BlastWaveArchetype } from './utils/blastWaveConfig';
import type { BlastTileType } from '@/shared/types/blast';
import type { BlastObjectiveProgress } from './types';

interface BlastWaveIntroProps {
  waveNumber: number;
  archetype: BlastWaveArchetype;
  t: (key: string) => string | undefined;
  featured?: readonly BlastTileType[];
  /** Wave objectives — previewed so the player knows the goals before play. */
  objectives?: BlastObjectiveProgress[];
}

/** Minimum 2.6s for rules readability without goals. */
const INTRO_DISPLAY_MS = 2600;
/** With a goal preview on screen, need ~4.2s to read everything. */
const INTRO_WITH_GOALS_MS = 4200;
/** Guard: don't dismiss in first 500ms to avoid accidental carryover tap. */
const TAP_GUARD_MS = 500;
/** Show "tap to start" hint after this delay. */
const TAP_HINT_DELAY_MS = 1000;

const ARCHETYPE_ACCENT: Record<BlastWaveArchetype, string> = {
  normal: 'text-neo-white',
  scoreRush: 'text-neo-lime',
  treasureHunt: 'text-yellow-300',
  survival: 'text-neo-pink',
  silence: 'text-neo-cyan',
};

export function BlastWaveIntro({ waveNumber, archetype, t, featured, objectives }: BlastWaveIntroProps) {
  const [visible, setVisible] = useState(true);
  const [showTapHint, setShowTapHint] = useState(false);
  const mountTimeRef = useRef<number>(0);

  const hasGoals = (objectives ?? []).some(p => p.objective.type !== 'clear_percent');

  useEffect(() => {
    setVisible(true);
    setShowTapHint(false);
    mountTimeRef.current = Date.now();

    const autoDismissId = setTimeout(
      () => setVisible(false),
      hasGoals ? INTRO_WITH_GOALS_MS : INTRO_DISPLAY_MS
    );

    const hintId = setTimeout(() => setShowTapHint(true), TAP_HINT_DELAY_MS);

    return () => {
      clearTimeout(autoDismissId);
      clearTimeout(hintId);
    };
  }, [waveNumber, hasGoals]);

  const handleDismiss = () => {
    const elapsed = Date.now() - mountTimeRef.current;
    // Guard: only allow tap-dismiss after 500ms from mount
    if (elapsed < TAP_GUARD_MS) {
      return;
    }
    setVisible(false);
  };

  if (!visible) return null;

  const mascotKey = getMascotForArchetype(archetype);
  const mascotSrc = MASCOT_IMAGES[mascotKey];
  const label = t(`blast.archetypes.${archetype}`) || '';
  const mascotAlt = t(`blast.mascot.${mascotKey}`) || '';
  const accent = ARCHETYPE_ACCENT[archetype];

  // Goal preview — everything except clear_percent (the HUD already shows the
  // board-clear progress bar). Gives the player their targets up front.
  const goalPreview = (objectives ?? []).filter(p => p.objective.type !== 'clear_percent');

  return (
    <div
      className="absolute inset-0 pointer-events-auto z-50 flex flex-col items-center justify-center gap-3 cursor-pointer"
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      data-testid="blast-wave-intro-overlay"
    >
      <AdaptiveAnimatePresence mode="wait">
        <AdaptiveMotion.div
          key={waveNumber}
          initial={{ scale: 0, rotate: -15, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-32 h-32 rounded-neo border-3 border-neo-black shadow-hard-lg overflow-hidden bg-neo-navy-light">
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
            className={`${accent} font-neo-display font-black uppercase tracking-wider text-4xl px-6 py-2 rounded-neo bg-black/80 border-3 border-neo-black shadow-hard-lg`}
          >
            {label}
          </span>

          {waveNumber === 1 && (
            <AdaptiveMotion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="font-neo-body text-sm text-neo-white/90 text-center px-4 max-w-[280px]"
            >
              {t('blast.waveIntro.dragHint') || 'Drag to connect letters into words'}
            </AdaptiveMotion.span>
          )}

          {featured && featured.length > 0 && (
            <div className="flex flex-row gap-3 flex-wrap justify-center max-w-[380px]">
              {featured.map((tile, idx) => {
                const visual = TILE_VISUALS[tile];
                const tileNameKey = `blast.tileGuide.${tile}.name`;
                const tileDescKey = `blast.tileGuide.${tile}.desc`;
                const tileName = t(tileNameKey) || tile;
                const tileDesc = t(tileDescKey) || '';
                const Icon = visual.indicator;

                return (
                  <AdaptiveMotion.div
                    key={tile}
                    data-testid={`featured-chip-${tile}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.12, type: 'spring', stiffness: 300 }}
                    className="flex flex-col items-center gap-2 px-4 py-3 rounded-neo bg-black/80 border-2 border-neo-black shadow-hard min-w-[100px]"
                  >
                    {Icon && visual.style && (
                      <div
                        className="w-10 h-10 rounded-neo flex items-center justify-center border-2"
                        style={{
                          ...visual.style,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        data-testid={`featured-chip-icon-${tile}`}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    )}
                    <span className="font-neo-display font-bold text-sm uppercase tracking-wide text-neo-white text-center leading-tight">
                      {tileName}
                    </span>
                    {tileDesc && (
                      <span className="font-neo-body text-xs opacity-80 text-center max-w-[140px] leading-tight text-neo-white/90">
                        {tileDesc}
                      </span>
                    )}
                  </AdaptiveMotion.div>
                );
              })}
            </div>
          )}

          {goalPreview.length > 0 && (
            <div
              data-testid="blast-wave-intro-goals"
              className="flex flex-col items-stretch gap-2 px-4 py-3 rounded-neo bg-black/80 border-2 border-neo-black shadow-hard max-w-[320px]"
            >
              <span className="font-neo-display font-black uppercase tracking-wider text-xs text-neo-white/80 text-center">
                {t('blast.objective.bannerTitle') || 'Goals'}
              </span>
              {goalPreview.map((p, i) => (
                <span
                  key={`goal-${p.objective.type}-${i}`}
                  dir="auto"
                  className="font-neo-body font-bold text-sm text-neo-white text-center leading-tight animate-neo-pop"
                  style={{ animationDelay: `${200 + i * 140}ms`, animationFillMode: 'backwards' }}
                >
                  {formatObjectiveLabel(p.objective, t)}
                </span>
              ))}
            </div>
          )}

          {showTapHint && (
            <AdaptiveMotion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="font-neo-body text-xs text-neo-white/60 text-center mt-1"
            >
              {t('blast.waveIntro.tapToStart') || 'Tap to start'}
            </AdaptiveMotion.span>
          )}
        </AdaptiveMotion.div>
      </AdaptiveAnimatePresence>
    </div>
  );
}

export default BlastWaveIntro;
