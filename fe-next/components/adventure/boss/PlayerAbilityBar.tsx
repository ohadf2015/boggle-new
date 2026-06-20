/**
 * PlayerAbilityBar — the player's RPG moveset during a boss fight.
 *
 * Three combo-charged abilities (Smite / Ward / Focus). Charge meter fills as
 * combos climb; each button shows its cost, lights up when castable, and is
 * tappable (≥44px) or keyboard 1/2/3. Neo-brutalist: hard shadow, solid border.
 */
'use client';

import React, { useEffect } from 'react';
import { Zap, Shield, Target } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { AbilitySlot } from '@/hooks/useBossCombat';
import type { PlayerAbilityId } from '@/lib/adventure/combat/playerAbilities';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  Shield,
  Target,
};

const ACCENT: Record<string, { border: string; fill: string; text: string; glow: string }> = {
  lime: { border: 'border-neo-lime', fill: 'bg-neo-lime', text: 'text-neo-lime', glow: 'shadow-hard-lime' },
  cyan: { border: 'border-neo-cyan', fill: 'bg-neo-cyan', text: 'text-neo-cyan', glow: 'shadow-hard-cyan' },
  pink: { border: 'border-neo-pink', fill: 'bg-neo-pink', text: 'text-neo-pink', glow: 'shadow-hard-pink' },
};

export interface PlayerAbilityBarProps {
  abilities: AbilitySlot[];
  charge: number;
  maxCharge: number;
  onCast: (id: PlayerAbilityId) => void;
  t: (key: string) => string;
}

const PlayerAbilityBar: React.FC<PlayerAbilityBarProps> = ({ abilities, charge, maxCharge, onCast, t }) => {
  // Keyboard 1/2/3 → cast slot.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx >= 0 && abilities[idx]?.canCast) {
        onCast(abilities[idx].def.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abilities, onCast]);

  return (
    <div
      className="flex items-stretch gap-1.5 sm:gap-2"
      role="group"
      aria-label={t('adventure.boss.combat.abilityBar')}
    >
      {abilities.map(({ def, canCast }, i) => {
        const Icon = ICONS[def.icon] ?? Zap;
        const accent = ACCENT[def.accent] ?? ACCENT.lime;
        return (
          <button
            key={def.id}
            type="button"
            onClick={() => canCast && onCast(def.id)}
            disabled={!canCast}
            aria-label={`${t(def.nameKey)} — ${t(def.descKey)}`}
            aria-keyshortcuts={String(i + 1)}
            className={[
              'relative flex flex-col items-center justify-center',
              'min-w-[3rem] min-h-[3rem] px-2 py-1.5 rounded-neo border-3 transition-all',
              'font-neo-display select-none',
              canCast
                ? `${accent.border} bg-neo-navy-light ${accent.glow} hover:-translate-y-0.5 active:translate-y-0 cursor-pointer`
                : 'border-neo-navy-light bg-neo-navy/60 opacity-50 cursor-not-allowed',
            ].join(' ')}
          >
            {canCast && (
              <AdaptiveMotion.span
                className={`absolute -top-1.5 -inset-x-0 mx-auto w-fit px-1 rounded-neo ${accent.fill} text-neo-black text-[9px] font-black leading-tight`}
                animate={{ scale: [1, 1.12, 1] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                aria-hidden="true"
              >
                {i + 1}
              </AdaptiveMotion.span>
            )}
            <Icon className={`w-5 h-5 ${canCast ? accent.text : 'text-neo-white/40'}`} />
            <span className={`mt-0.5 text-[10px] font-bold uppercase tracking-wide ${canCast ? 'text-neo-white' : 'text-neo-white/40'}`}>
              {t(def.nameKey)}
            </span>
            {/* Charge cost pips */}
            <span className="mt-0.5 flex gap-0.5" aria-hidden="true">
              {Array.from({ length: def.chargeCost }).map((_, p) => (
                <span
                  key={p}
                  className={`w-1 h-1 rounded-full ${charge >= def.chargeCost ? accent.fill : 'bg-neo-white/25'}`}
                />
              ))}
            </span>
          </button>
        );
      })}
      {/* Charge meter */}
      <div className="flex flex-col justify-center ms-1" aria-label={t('adventure.boss.combat.charge')}>
        <div className="w-1.5 h-full min-h-[3rem] rounded-full bg-neo-navy/60 border border-neo-white/15 overflow-hidden flex flex-col-reverse">
          <AdaptiveMotion.div
            className="w-full bg-neo-lime"
            initial={false}
            animate={{ height: `${Math.round((charge / maxCharge) * 100)}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerAbilityBar;
