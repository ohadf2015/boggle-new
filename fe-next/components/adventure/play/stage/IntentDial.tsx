'use client';

/**
 * The enemy's INTENT — the one thing that turns spelling into combat.
 *
 * Slay the Spire puts an icon AND the exact incoming number over every enemy
 * the instant your turn starts, and keeps it there while you plan. Bookworm
 * keeps a move list with a charge-up rating. This dial does both:
 *
 *   • a countdown ring + effect icon for the telegraphed move (the wind-up),
 *   • the EXACT price of that move on the dial — hearts, or tiles for a board
 *     attack — struck through in cyan when a raised shield will eat it,
 *   • and, always, the phase's whole move list with each move's price, so the
 *     threat is on screen while the player is still tracing a word.
 *
 * That last line is why the list now renders in `compact` too. It used to be
 * suppressed on the arena stage, which left the floating chip showing a move
 * name and a countdown and no number anywhere — landing a word was never a
 * response to a known threat, just scoring against a health bar.
 *
 * The ring animates on the GPU from `startedAt`, not from the 200ms tick.
 * Prices come from `intentView`, which re-derives them the way `combat.ts`
 * actually resolves an attack (volleys multiply, curses bite for the rule).
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Swords, Snowflake, Skull, Flame, Shuffle, Droplet, Hourglass, Heart, Grid2x2, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { AttackEffect, CombatState } from '@/lib/adventure/play/combat';
import { cn } from '@/lib/utils';
import { moveKey } from './combatView';
import { incomingThreat, phaseThreats, standingThreat, willBlock, type Threat } from './intentView';

export const EFFECT_ICON: Record<AttackEffect, LucideIcon> = {
  hit: Swords, freeze: Snowflake, curse: Skull, projectile: Flame, shuffle: Shuffle, drain: Droplet,
};
export const EFFECT_COLOR: Record<AttackEffect, string> = {
  hit: '#ff3366', freeze: '#22d3ee', curse: '#a855f7', projectile: '#ff8a00', shuffle: '#facc15', drain: '#ff3366',
};

const R = 22;
const C = 2 * Math.PI * R;

/**
 * What one move costs, as a chip. Hearts win over tiles: a curse takes tiles
 * AND bites, and the bite is the part that ends the run.
 */
function ThreatTag({ threat, blocked, big = false, hedge = false, pending = false }: {
  threat: Threat; blocked?: boolean; big?: boolean;
  /** The phase mixes damage, so this is the worst case, not a promise. */
  hedge?: boolean;
  /** Nothing is winding up yet — the standing threat, shown one step quieter. */
  pending?: boolean;
}) {
  const { t } = useLanguageSafe();
  if (threat.damage <= 0 && threat.tiles <= 0) return null;
  const hearts = threat.damage > 0;
  const n = hearts ? threat.damage : threat.tiles;
  const Icon = blocked ? ShieldCheck : hearts ? Heart : Grid2x2;
  return (
    <span
      aria-label={blocked
        ? t('adventurePlay.combat.threatBlocked')
        : hearts ? t('adventurePlay.combat.threatDamage', { count: n }) : t('adventurePlay.combat.threatTiles', { count: n })}
      className={cn('inline-flex items-center gap-[1px] rounded-md border-2 border-black font-black leading-none',
        big ? 'px-1 py-0.5 text-[13px]' : 'px-1 py-px text-[11px]',
        blocked ? 'bg-neo-cyan text-black'
          : pending ? 'bg-[#0b1330] text-neo-pink'
            : hearts ? 'bg-neo-pink text-black' : 'bg-neo-cyan text-black')}>
      {hedge && <span aria-hidden className="opacity-70">≤</span>}
      <span className={cn('tabular-nums', blocked && 'line-through decoration-[1.5px]')}>{n}</span>
      <Icon className={cn(big ? 'w-3 h-3' : 'w-2.5 h-2.5', hearts && !blocked && (pending ? 'fill-neo-pink' : 'fill-black'))} strokeWidth={3} />
    </span>
  );
}

/**
 * THE NUMBER, on its own, big enough to read across a room — Slay the Spire's
 * diamond over the enemy's head. The arena pins this directly over the foe so
 * the threat is never something you have to go and find in a corner chip.
 *
 * It is on screen for every frame of a live fight: the telegraphed price while
 * something winds up, the phase's standing price the rest of the time (`≤` when
 * the phase mixes damage), struck through in cyan when a raised shield eats it.
 */
export function ThreatPlate({ combat }: { combat: CombatState }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const standing = standingThreat(combat);
  // A scramble costs neither hearts nor tiles, so pricing it would print a "0"
  // where the threat should be. The phase's standing price holds the slot.
  const raw = incomingThreat(combat);
  const incoming = raw && (raw.damage > 0 || raw.tiles > 0) ? raw : null;
  const threat = incoming ?? standing?.threat ?? null;
  if (!threat || combat.defeated) return null;
  const blocked = willBlock(combat, incoming);
  const hedge = !incoming && !standing?.exact;
  const hearts = threat.damage > 0;
  const n = hearts ? threat.damage : threat.tiles;
  const Icon = incoming ? EFFECT_ICON[threat.effect] : Hourglass;
  const Unit = blocked ? ShieldCheck : hearts ? Heart : Grid2x2;
  return (
    <div
      role="status"
      aria-label={blocked
        ? t('adventurePlay.combat.threatBlocked')
        : hearts ? t('adventurePlay.combat.threatDamage', { count: n }) : t('adventurePlay.combat.threatTiles', { count: n })}
      className={cn('inline-flex items-center gap-1 rounded-xl border-[3px] border-black px-1.5 py-0.5 shadow-[3px_3px_0_#000]',
        blocked ? 'bg-neo-cyan' : incoming ? 'bg-neo-pink' : 'bg-[#0f1b3d]',
        incoming && !reduce && 'animate-pulse')}>
      <Icon className={cn('w-4 h-4 shrink-0', incoming ? 'text-black' : 'text-neo-pink')} strokeWidth={3} />
      <span className={cn('font-neo-display text-xl font-black leading-none tabular-nums',
        blocked ? 'text-black line-through decoration-2' : incoming ? 'text-black' : 'text-neo-pink')}>
        {hedge && <span aria-hidden className="text-sm opacity-70">≤</span>}{n}
      </span>
      <Unit className={cn('w-3.5 h-3.5 shrink-0', blocked ? 'text-black' : incoming ? 'text-black fill-black' : 'text-neo-pink',
        hearts && !blocked && !incoming && 'fill-neo-pink')} strokeWidth={3} />
    </div>
  );
}

interface Props {
  combat: CombatState;
  /** Arena stage: a badge floating over the foe's head — tighter, same information. */
  compact?: boolean;
}

export default function IntentDial({ combat, compact = false }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const tele = combat.telegraph;
  const stunned = combat.stunnedUntil > combat.now;
  const incoming = incomingThreat(combat);
  const blocked = willBlock(combat, incoming);
  const standing = standingThreat(combat);
  const moves = phaseThreats(combat);

  // Ring: telegraph drains pink; idle fills grey toward the next wind-up.
  let frac = 0;
  let leftMs = 0;
  if (tele) {
    leftMs = Math.max(0, tele.endsAt - combat.now);
    frac = leftMs / Math.max(1, tele.endsAt - tele.startedAt);
  } else {
    leftMs = Math.max(0, Math.max(combat.nextAttackAt, combat.stunnedUntil) - combat.now);
    frac = 1 - Math.min(1, leftMs / Math.max(1, combat.script.cadenceMs));
  }
  const effect = tele?.attack.effect;
  const Icon = effect ? EFFECT_ICON[effect] : Hourglass;
  const color = effect ? EFFECT_COLOR[effect] : '#9ca3af';
  const secs = Math.ceil(leftMs / 1000);
  // Worth telling the player only while there is time to spell something.
  const interruptible = !!tele && leftMs > 700;

  return (
    <div className="flex items-center gap-1.5 min-w-0" data-testid="intent-dial">
      <div className={cn('relative shrink-0', compact ? 'w-9 h-9' : 'w-12 h-12', tele && !reduce && 'animate-pulse')}>
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
        <div className={cn('absolute grid place-items-center rounded-full border-2 border-black', compact ? 'inset-[6px]' : 'inset-[8px]')} style={{ background: tele ? color : '#16213e' }}>
          <Icon className={cn(compact ? 'w-3 h-3' : 'w-4 h-4', tele ? 'text-black' : 'text-neo-cream/70')} strokeWidth={2.75} />
        </div>
        {incoming?.heavy && (
          <span className="absolute -top-1 -end-1 rounded-md border-2 border-black bg-neo-yellow px-1 text-[10px] font-black text-black leading-none py-0.5">×2</span>
        )}
        {/* The number, on the icon — Slay the Spire's whole reason for reading.
            It is NEVER absent while a fight is live: the telegraphed price when
            something is winding up, the phase's standing price the rest of the
            time, so a word is always an answer to a number on screen. */}
        {!compact && (incoming ?? standing?.threat) && (
          <span className="absolute -bottom-1.5 -start-1.5">
            <ThreatTag threat={(incoming ?? standing!.threat)} blocked={blocked} big
              pending={!incoming} hedge={!incoming && !standing!.exact} />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn('font-bold uppercase tracking-widest text-neo-cream/70', compact ? 'text-[9px] leading-tight' : 'text-[10px]')}>
          {stunned ? t('adventurePlay.combat.stunned') : tele ? t('adventurePlay.combat.incomingIn', { seconds: secs }) : t('adventurePlay.combat.nextMove')}
        </div>
        <div className={cn('font-neo-display font-bold leading-tight break-words', compact ? 'line-clamp-1 text-[13px]' : 'line-clamp-2', tele ? 'text-base' : 'text-sm text-neo-cream/80', compact && 'text-[13px]')} style={tele ? { color } : undefined}>
          {tele ? t(moveKey(tele.attack.id)) : stunned ? '…' : t('adventurePlay.combat.windingUp', { seconds: secs })}
        </div>
        {tele && interruptible && (
          <div className={cn('mt-0.5 font-black text-neo-yellow leading-tight', compact ? 'text-[10px] line-clamp-1' : 'text-[11px] line-clamp-2')}>
            {t('adventurePlay.combat.interruptHint', { count: combat.script.rules?.interruptLen ?? 5 })}
          </div>
        )}
        {/* The standing threat: every move this phase owns, priced. Always on
            screen, so a word is always an answer to something. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-1" aria-label={t('adventurePlay.combat.moveList')}>
          {moves.map((m) => {
            const MI = EFFECT_ICON[m.effect];
            const active = tele?.attack.id === m.id;
            return (
              <span key={m.id} title={t(moveKey(m.id))}
                className={cn('inline-flex items-center gap-[2px] rounded-md border-2 border-black px-[3px] py-px',
                  active ? 'scale-105 shadow-[0_0_0_2px_#ffd60a]' : 'opacity-75')}
                style={{ background: active ? EFFECT_COLOR[m.effect] : '#0b1330' }}>
                <MI className={cn('w-3 h-3', active ? 'text-black' : 'text-neo-cream')} strokeWidth={2.75} />
                {(m.damage > 0 || m.tiles > 0) && (
                  <span className={cn('text-[10px] font-black leading-none tabular-nums', active ? 'text-black' : m.damage > 0 ? 'text-neo-pink' : 'text-neo-cyan')}>
                    {m.damage > 0 ? m.damage : m.tiles}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
