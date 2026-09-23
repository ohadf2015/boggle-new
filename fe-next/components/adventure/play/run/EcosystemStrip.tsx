'use client';

/**
 * The meta-game ledger after a cleared node — Slay the Spire's victory screen
 * rule: one line per thing that actually moved, with its number, counted up.
 *
 * Everything here is already on `result` (the /complete ecosystem block), so
 * nothing new is threaded through the screens. Zero lines ⇒ renders nothing:
 * a plain `fight` node pays no coins and the XP daily cap can zero the XP, so
 * "nothing moved" is the common case, not an edge.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, Flame, Medal, Coins, PiggyBank, type LucideIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { ecosystemGains, type Gain, type GainKind } from './ecosystemGains';
import { useCountUp } from './GoldCounter';
import { cn } from '@/lib/utils';

interface Props {
  /** The /complete payload for this node. */
  result: Parameters<typeof ecosystemGains>[0];
  /** Seconds of runway before the first chip counts (the screen's other beats first). */
  delay?: number;
  className?: string;
}

/**
 * Solid accent FILL with black ink, matching the app's own reward badges in
 * `components/results/BonusBadgesRow` (bg-neo-pink / bg-neo-lime + black
 * border + hard shadow). Not a tinted plate: these screens sit on navy, where
 * a black border over `bg-black/45` measures ~1.2:1 and vanishes, and the
 * meta-game reward would read quieter than the run score under it.
 */
const STYLE: Record<GainKind, { fill: string; label: string }> = {
  xp: { fill: 'bg-neo-lime', label: 'adventurePlay.eco.xp' },
  coins: { fill: 'bg-neo-yellow', label: 'adventurePlay.eco.coins' },
  purse: { fill: 'bg-neo-yellow', label: 'adventurePlay.eco.purse' },
  points: { fill: 'bg-neo-cyan', label: 'adventurePlay.eco.points' },
  streak: { fill: 'bg-neo-pink', label: 'adventurePlay.eco.streakDays' },
};

/**
 * A black-ink glyph per kind — including coins. The gold `COIN_ART` webp is the
 * right mark on the dark HUD and the ledger's gold row, but this chip is a
 * `bg-neo-yellow` fill: gold-on-yellow collapses to its outline at 20px. A
 * glyph inherits the chip's black ink and stays legible on every fill.
 */
const ICON: Record<GainKind, LucideIcon> = { xp: Zap, coins: Coins, purse: PiggyBank, points: Medal, streak: Flame };

function GainIcon({ kind }: { kind: GainKind }) {
  const Icon = ICON[kind];
  return <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />;
}

function GainChip({ gain, index, delay }: { gain: Gain; index: number; delay: number }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const s = STYLE[gain.kind];
  const shown = useCountUp(gain.value, { from: 0, delayMs: (delay + index * 0.14) * 1000, durationMs: 700 });
  // A streak is a STATE (day 6), the rest are deltas (+40). Only deltas get the plus.
  const text = gain.kind === 'streak' ? `${shown}` : `+${shown}`;
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 440, damping: 18, delay: delay + index * 0.14 }}
      className={cn(
        'flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 rounded-xl border-[3px] border-black px-2 py-1.5 text-black shadow-[3px_3px_0_#000]',
        s.fill,
      )}
    >
      {/* `dir="ltr"` keeps "+40" reading as a gain in Hebrew, not "40+". */}
      <span
        dir="ltr"
        data-testid={`eco-value-${gain.kind}`}
        className="flex items-center gap-1 font-neo-display text-xl font-bold leading-none tabular-nums"
      >
        <GainIcon kind={gain.kind} />
        {text}
      </span>
      <span className="text-[10px] font-black uppercase leading-none tracking-wider opacity-70">{t(s.label)}</span>
    </motion.li>
  );
}

export default function EcosystemStrip({ result, delay = 0, className }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const gains = ecosystemGains(result);
  if (!gains.length) return null;

  return (
    <motion.section
      data-testid="eco-strip"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
      aria-label={t('adventurePlay.eco.heading')}
      className={cn('w-full', className)}
    >
      <div className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.22em] text-neo-cream/75">
        {t('adventurePlay.eco.heading')}
      </div>
      <ul className="flex gap-1.5">
        {gains.map((g, i) => <GainChip key={g.kind} gain={g} index={i} delay={delay} />)}
      </ul>
    </motion.section>
  );
}
