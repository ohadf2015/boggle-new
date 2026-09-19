'use client';

/**
 * The enemy's INTENT: an icon inside a countdown ring for the telegraphed move
 * (Bookworm's move list + wind-up), plus the phase's move list as chips.
 * The ring animates on the GPU from `startedAt`, not from the 200ms tick.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Swords, Snowflake, Skull, Flame, Shuffle, Droplet, Hourglass, type LucideIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { AttackEffect, CombatState } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import { moveKey } from './combatView';

export const EFFECT_ICON: Record<AttackEffect, LucideIcon> = {
  hit: Swords, freeze: Snowflake, curse: Skull, projectile: Flame, shuffle: Shuffle, drain: Droplet,
};
export const EFFECT_COLOR: Record<AttackEffect, string> = {
  hit: '#ff3366', freeze: '#22d3ee', curse: '#a855f7', projectile: '#ff8a00', shuffle: '#facc15', drain: '#ff3366',
};

const R = 22;
const C = 2 * Math.PI * R;

interface Props { combat: CombatState }

export default function IntentDial({ combat }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const tele = combat.telegraph;
  const stunned = combat.stunnedUntil > combat.now;
  const moves = combat.script.phases[combat.phase];
  const uniq = moves.filter((m, i) => moves.findIndex((x) => x.id === m.id) === i);

  // Ring: telegraph drains pink; idle fills grey toward the next wind-up.
  let frac = 0;
  let totalMs = 1;
  let leftMs = 0;
  if (tele) {
    totalMs = tele.endsAt - tele.startedAt;
    leftMs = Math.max(0, tele.endsAt - combat.now);
    frac = leftMs / Math.max(1, totalMs);
  } else {
    leftMs = Math.max(0, Math.max(combat.nextAttackAt, combat.stunnedUntil) - combat.now);
    frac = 1 - Math.min(1, leftMs / Math.max(1, combat.script.cadenceMs));
  }
  const effect = tele?.attack.effect;
  const Icon = effect ? EFFECT_ICON[effect] : Hourglass;
  const color = effect ? EFFECT_COLOR[effect] : '#9ca3af';
  const heavy = tele?.attack.id.endsWith('-heavy');
  const secs = Math.ceil(leftMs / 1000);
  // Worth telling the player only while there is time to spell something.
  const interruptible = !!tele && leftMs > 700;

  return (
    <div className="flex items-center gap-1.5 min-w-0" data-testid="intent-dial">
      <div className={cn('relative shrink-0 w-12 h-12', tele && !reduce && 'animate-pulse')}>
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={R + 3} fill="#000" />
          <circle cx="28" cy="28" r={R} fill="none" stroke="#1f2a52" strokeWidth="6" />
          {tele && !reduce ? (
            <motion.circle
              key={tele.startedAt}
              cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="butt"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C * (1 - frac) }}
              animate={{ strokeDashoffset: C }}
              transition={{ duration: leftMs / 1000, ease: 'linear' }}
            />
          ) : (
            <circle cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="6" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          )}
        </svg>
        <div className="absolute inset-[8px] grid place-items-center rounded-full border-2 border-black" style={{ background: tele ? color : '#16213e' }}>
          <Icon className={cn('w-4 h-4', tele ? 'text-black' : 'text-neo-cream/70')} strokeWidth={2.75} />
        </div>
        {heavy && (
          <span className="absolute -top-1 -end-1 rounded-md border-2 border-black bg-neo-yellow px-1 text-[10px] font-black text-black leading-none py-0.5">×2</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neo-cream/70">
          {stunned ? t('adventurePlay.combat.stunned') : tele ? t('adventurePlay.combat.incomingIn', { seconds: secs }) : t('adventurePlay.combat.nextMove')}
        </div>
        <div className={cn('font-neo-display font-bold leading-tight line-clamp-2 break-words', tele ? 'text-base' : 'text-sm text-neo-cream/80')} style={tele ? { color } : undefined}>
          {tele ? t(moveKey(tele.attack.id)) : stunned ? '…' : t('adventurePlay.combat.windingUp', { seconds: secs })}
        </div>
        {tele && interruptible ? (
          <div className="mt-0.5 text-[11px] font-black text-neo-yellow leading-tight line-clamp-2">
            {t('adventurePlay.combat.interruptHint', { count: combat.script.rules?.interruptLen ?? 5 })}
          </div>
        ) : (
        /* Move list (Bookworm): what this phase can throw at you. */
        <div className="mt-0.5 flex gap-1" aria-label={t('adventurePlay.combat.moveList')}>
          {uniq.map((m) => {
            const MI = EFFECT_ICON[m.effect];
            const active = tele?.attack.id === m.id;
            return (
              <span key={m.id} title={t(moveKey(m.id))}
                className={cn('grid place-items-center w-6 h-6 rounded-md border-2 border-black', active ? 'scale-110' : 'opacity-70')}
                style={{ background: active ? EFFECT_COLOR[m.effect] : '#0b1330' }}>
                <MI className={cn('w-3.5 h-3.5', active ? 'text-black' : 'text-neo-cream')} strokeWidth={2.75} />
              </span>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
