'use client';

import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import type { BossConstraintDef } from '@/types/wordForge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface BossRevealProps {
  constraint: BossConstraintDef | null;
  round: number;
  roundTarget: number;
  onReady: () => void;
}

/**
 * BossReveal — Shows boss constraint before a boss round, or a "Round X" gate for non-boss rounds.
 * All rounds route through this screen so the timer never starts before the player sees the grid (CRIT-5).
 */
export function BossReveal({ constraint, round, roundTarget, onReady }: BossRevealProps): React.JSX.Element {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const isBoss = constraint !== null;

  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-8 p-4 relative overflow-hidden">
      {/* Red vignette overlay for boss */}
      {isBoss && (
        <m.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,51,102,0.1) 100%)',
          }}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
      )}

      {/* Header */}
      {isBoss ? (
        <div className="flex items-center gap-2 text-neo-red motion-safe:animate-pulse-subtle z-10">
          <m.span
            className="text-3xl"
            animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          >
            ⚠️
          </m.span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase font-neo-display tracking-tight">
            {t('wordForge.bossRound')}
          </h2>
          <m.span
            className="text-3xl"
            animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
            transition={{ type: 'tween', duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            ⚠️
          </m.span>
        </div>
      ) : (
        <h2 className="text-2xl sm:text-3xl font-black uppercase font-neo-display tracking-tight text-neo-cream motion-safe:animate-neo-pop">
          {t('wordForge.roundOf', { round, max: 9 })}
        </h2>
      )}

      {/* Constraint card (boss only) — rises from below */}
      {isBoss && (
        <m.div
          className="bg-neo-cream border-4 border-neo-black shadow-hard-xl rounded-neo-lg p-6 max-w-sm w-full z-10"
          initial={prefersReducedMotion ? false : { y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <m.span
              className="text-4xl"
              animate={prefersReducedMotion ? {} : { rotate: [-3, 3, -2, 2, 0] }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {constraint.icon}
            </m.span>
            <h3 className="text-xl font-black uppercase text-neo-black font-neo-display">
              {constraint.name}
            </h3>
          </div>
          <p className="text-base text-neo-black/80 font-neo-body leading-relaxed">
            {t(constraint.descriptionKey)}
          </p>
        </m.div>
      )}

      {/* Target score */}
      <p className="text-sm font-bold text-neo-cream/60 font-neo-body uppercase tracking-wide z-10">
        {t('wordForge.totalScore')}: <span className="text-tier-gold text-base">{roundTarget}</span>
      </p>

      {/* Round indicator (boss only — non-boss shows it in header) */}
      {isBoss && (
        <span className="text-sm text-neo-cream/40 font-neo-body z-10">
          {t('wordForge.roundOf', { round, max: 9 })}
        </span>
      )}

      {/* Ready button */}
      <Button onClick={onReady} size="lg" className="px-8 z-10">
        {isBoss ? t('wordForge.ready') : t('wordForge.go', 'GO!')}
      </Button>
    </div>
  );
}
