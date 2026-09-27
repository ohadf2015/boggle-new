'use client';

/**
 * The run, itemized — the payout sheet that closes a run.
 *
 * The bar is Slay the Spire's Victory screen: TWO columns of named line items,
 * each carrying its own point contribution, a rule, then one bold Score. The
 * left column is the spine of the climb (floors, enemies, elites, boss, words)
 * and is printed even at nought — the reference prints `Beyond Elites Killed
 * (0)  0`, and a nought there is information: no elite stood on the path you
 * took. The right column is what this run earned on top.
 *
 * Two columns, not one, because the beat only works if the rows AND the total
 * are in the same 390x844 frame — a scrolled score is an asserted score. The
 * arithmetic is `runLedger()`; this file only draws it.
 *
 * Deliberately NOT the season number: the ecosystem strip beside it shows the
 * server's leaderboard points, so this one is titled and unit-labelled as a RUN
 * score and never borrows the word "pts" from that strip.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Crown, Footprints, Gem, HeartPulse, PackageOpen, Skull, Sparkles, Swords, Type, HelpCircle, type LucideIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { runLedger, type LedgerInput, type LedgerKey, type LedgerLine } from './ledger';
import { useCountUp } from './GoldCounter';
import { RunPips } from './RunStats';
import { COIN_ART } from './art';
import { cn } from '@/lib/utils';

interface Props extends LedgerInput {
  /** Seconds of runway before the rows start landing. */
  delay?: number;
  /**
   * The act-map pip row, hosted INSIDE this card. It answers "how far did I
   * get?" in the same shape on both endings; giving it its own card cost ~60px
   * and put the final score under the action bar at 390px.
   */
  pips?: { cleared: number; fell: boolean };
  className?: string;
}

const ROW: Record<LedgerKey, { Icon: LucideIcon | null; ink: string; label: string }> = {
  nodes: { Icon: Footprints, ink: 'text-neo-cream', label: 'adventurePlay.ledger.nodes' },
  enemies: { Icon: Swords, ink: 'text-neo-cyan', label: 'adventurePlay.ledger.enemies' },
  elites: { Icon: Skull, ink: 'text-neo-pink', label: 'adventurePlay.ledger.elites' },
  boss: { Icon: Crown, ink: 'text-neo-yellow', label: 'adventurePlay.ledger.boss' },
  words: { Icon: Type, ink: 'text-neo-cream', label: 'adventurePlay.ledger.words' },
  bestWord: { Icon: Sparkles, ink: 'text-neo-lime', label: 'adventurePlay.ledger.bestWord' },
  treasure: { Icon: PackageOpen, ink: 'text-neo-yellow', label: 'adventurePlay.ledger.treasure' },
  events: { Icon: HelpCircle, ink: 'text-neo-cyan', label: 'adventurePlay.ledger.events' },
  gold: { Icon: null, ink: 'text-neo-yellow', label: 'adventurePlay.ledger.gold' },
  relics: { Icon: Gem, ink: 'text-neo-purple', label: 'adventurePlay.ledger.relics' },
  flawless: { Icon: HeartPulse, ink: 'text-neo-lime', label: 'adventurePlay.ledger.flawless' },
};

const ROW_GAP = 0.07;

function Row({ line, index, delay }: { line: LedgerLine; index: number; delay: number }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const s = ROW[line.key];
  const shown = useCountUp(line.points, { from: 0, delayMs: (delay + index * ROW_GAP) * 1000, durationMs: 520 });
  // What the row counted, in its own unit — a word row names the word, a
  // flawless row has nothing to count, the rest show "N x rate".
  const tally = line.key === 'bestWord'
    ? line.word ?? ''
    : line.key === 'flawless'
      ? ''
      : line.per != null
        ? `${line.count}×${line.per}`
        : `${line.count}`;
  // A nought row is still stated, just quieter — it is the sheet saying this
  // line was on offer and paid nothing.
  const dim = line.points === 0;

  return (
    <motion.li
      data-testid={`ledger-${line.key}`}
      initial={reduce ? false : { x: -14, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26, delay: reduce ? 0 : delay + index * ROW_GAP }}
      className={cn('flex items-center gap-1 border-b border-dashed border-white/12 py-[3px] last:border-b-0', dim && 'opacity-45')}
    >
      <span className={cn('grid h-4 w-4 shrink-0 place-items-center', s.ink)} aria-hidden>
        {s.Icon
          ? <s.Icon className="h-[14px] w-[14px]" strokeWidth={2.6} />
          // eslint-disable-next-line @next/next/no-img-element -- small static art, the same coin the HUD uses
          : <img src={COIN_ART} alt="" className="h-[14px] w-[14px]" draggable={false} />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase leading-tight tracking-wide opacity-90">
        {t(s.label)}
      </span>
      {tally && (
        <span className="max-w-[64px] shrink-0 truncate font-mono text-[9px] font-bold tabular-nums opacity-55">
          <bdi>{tally}</bdi>
        </span>
      )}
      <span className={cn('w-8 shrink-0 text-end font-neo-display text-[15px] font-bold leading-none tabular-nums', s.ink)}>
        <bdi>{shown}</bdi>
      </span>
    </motion.li>
  );
}

export default function RunLedger({ delay = 0, pips, className, ...input }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const { spine, bonus, lines, total } = runLedger(input);
  const totalDelay = delay + Math.max(spine.length, bonus.length) * ROW_GAP + 0.15;
  const shownTotal = useCountUp(total, { from: 0, delayMs: totalDelay * 1000, durationMs: 900 });
  if (!lines.length) return null;

  return (
    <section data-testid="run-ledger"
      className={cn('rounded-2xl border-[3px] border-black bg-black/40 px-3 py-2.5 shadow-[4px_4px_0_#000]', className)}>
      {pips && <div className="mb-2 border-b-2 border-black/50 pb-2"><RunPips cleared={pips.cleared} fell={pips.fell} /></div>}
      <h3 className="text-xs font-bold uppercase tracking-wider opacity-80">{t('adventurePlay.ledger.title')}</h3>
      {/* Two columns once there are bonuses to fill the second one — the
          reference's shape, and the only way the rows and the total share one
          phone frame. A run that earned no extra keeps ONE full-width column
          instead of printing half a sheet against a blank half. */}
      <div className={cn('mt-1', bonus.length > 0 && 'grid grid-cols-2 gap-x-3')}>
        <ul>
          {spine.map((line, i) => <Row key={line.key} line={line} index={i} delay={delay} />)}
        </ul>
        {bonus.length > 0 && (
          <ul className="border-s border-white/10 ps-2">
            {bonus.map((line, i) => <Row key={line.key} line={line} index={i} delay={delay} />)}
          </ul>
        )}
      </div>
      <motion.div
        data-testid="ledger-total"
        initial={reduce ? false : { scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 18, delay: reduce ? 0 : totalDelay }}
        className="mt-2 flex items-center justify-between gap-2 rounded-xl border-[3px] border-black bg-neo-lime px-3 py-1.5 text-black shadow-[4px_4px_0_#000]"
      >
        <span className="font-neo-display text-sm font-bold uppercase leading-tight">{t('adventurePlay.ledger.total')}</span>
        <span className="font-neo-display text-[1.75rem] font-bold leading-none tabular-nums">{shownTotal}</span>
      </motion.div>
    </section>
  );
}
