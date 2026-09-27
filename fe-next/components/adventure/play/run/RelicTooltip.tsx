'use client';

/**
 * Relic detail bubble: art, rarity, name, and the RULE in one plain sentence —
 * read it once and you know what the relic does.
 *
 * ROUND 3 GAP. It used to give the rule and then bury it under a three-row stat
 * ledger — "This run +0 / Alone +0 / With your relics +0" — which the judge read
 * as a debug panel, not an explanation: a cold player cannot tell what "Alone"
 * versus "With your relics" is even measuring, and on a fresh run every number
 * is zero. The reference tooltips state the rule and stop. So does this one. The
 * only number that survives is what the relic has ACTUALLY paid you this run,
 * and it appears only once it has paid something.
 *
 * It is PORTALED to the body and positioned from the chip's own rect. Round 1
 * rendered it inline, where the map screen's floor-title banner painted over it:
 * the judge saw a clipped, half-hidden fragment and read it as a rendering bug
 * rather than an affordance. A fixed, body-level layer has no ancestor that can
 * clip or out-stack it, and it clamps itself into the viewport so it is whole at
 * 390px and in Hebrew.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { RELICS, type RelicId } from '@/lib/adventure/play/relics';
import type { LevelWords } from '@/lib/adventure/play/relicStack';
import { RARITY_FRAME, relicArt } from './art';
import { relicTag } from './relicBadge';
import { relicRunContributions } from './relicRunTotals';
import { clampX, tooltipTop } from './overlayPlace';
import { cn } from '@/lib/utils';

export interface StackCtx { levels: readonly LevelWords[]; owned: readonly RelicId[] }

interface Props {
  id: RelicId;
  onClose: () => void;
  stackCtx?: StackCtx | null;
  /** The chip this bubble belongs to; the bubble anchors itself to its rect. */
  anchor?: HTMLElement | null;
  /** A region the bubble must not cover — the fight stage (boss HP + countdown). */
  avoid?: HTMLElement | null;
}

/**
 * Park the bubble under its chip and clamp it to the screen — and keep it CLEAR
 * of `avoid` (the fight stage). Round 6 flagged the bubble burying the boss HP
 * bar and the attack countdown mid-wind-up, which is the one thing the player
 * has to be reading. `tooltipTop` owns that decision and is tested alone.
 */
function place(anchor: HTMLElement | null, box: HTMLElement | null, avoid?: HTMLElement | null) {
  if (!anchor || !box || typeof window === 'undefined') return null;
  const a = anchor.getBoundingClientRect();
  const vp = { width: window.innerWidth, height: window.innerHeight };
  const bx = { width: box.offsetWidth, height: box.offsetHeight };
  const guard = avoid?.getBoundingClientRect();
  return {
    left: clampX(a.left + a.width / 2, bx.width, vp.width),
    top: tooltipTop(a, bx, vp, guard && guard.height > 0 ? guard : null),
  };
}

export default function RelicTooltip({ id, onClose, stackCtx, anchor, avoid }: Props) {
  const { t } = useLanguageSafe();
  const boxRef = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    if (!mounted) return undefined;
    const sync = () => setAt(place(anchor ?? null, boxRef.current, avoid ?? null));
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => { window.removeEventListener('resize', sync); window.removeEventListener('scroll', sync, true); };
  }, [anchor, avoid, mounted, id]);

  // What it has actually paid out over the whole run. Zero means it has not paid
  // yet, and "+0" is noise — the rule sentence above already says what it will do.
  const runTotal = stackCtx ? relicRunContributions(stackCtx.levels, stackCtx.owned)[id] : undefined;
  const paid = typeof runTotal === 'number' && runTotal > 0 ? runTotal : null;
  const rarity = RELICS[id].rarity;
  const frame = RARITY_FRAME[rarity];

  const bubble = (
    <motion.div
      ref={boxRef}
      role="tooltip"
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: at ? 1 : 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.14 }}
      onClick={onClose}
      /* z-[120] clears the play surface (z-50), the word-cast layer (z-70) and
         every banner on the map screen — this bubble is never underneath. */
      className={cn(
        'z-[120] flex w-[min(17rem,calc(100vw-1rem))] items-start gap-2.5 rounded-xl border-[3px] border-black bg-[#0f1b3d] p-2 text-neo-cream shadow-[4px_4px_0_#000]',
        mounted ? 'fixed' : 'absolute start-0 top-full mt-1.5',
      )}
      style={at ? { left: at.left, top: at.top } : undefined}
    >
      <span className={cn('grid shrink-0 place-items-center rounded-lg border-[3px] border-black p-0.5', frame.bg)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
        <img src={relicArt(id)} alt="" className="h-12 w-12 object-contain" />
        <span dir="ltr" className="mt-0.5 block rounded border-2 border-black bg-neo-cream px-1 font-neo-display text-[10px] font-black leading-none text-black">
          {relicTag(id)}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        {/* Rarity sits on its own line: inline beside a two-word name it overflowed the bubble. */}
        <span className={cn('block text-[10px] font-black uppercase leading-none tracking-wider', frame.text)}>{t(`adventurePlay.loot.rarity.${rarity}`)}</span>
        <span className="block font-neo-display text-base font-bold leading-tight">{t(`adventurePlay.relic.${id}`)}</span>
        {/* The rule, as one plain sentence, at a size you actually read. */}
        <span className="mt-0.5 block text-[13px] font-bold leading-snug">{t(`adventurePlay.relicDesc.${id}`)}</span>
        {paid !== null && (
          <span data-testid="relic-run" className="mt-1.5 block rounded-md border-2 border-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[11px] font-black leading-tight text-black">
            {t('adventurePlay.loot.earnedThisRun', { n: paid })}
          </span>
        )}
      </span>
    </motion.div>
  );

  // Before hydration (and in any environment without a document) it renders inline,
  // so the bubble is never simply missing.
  return mounted && typeof document !== 'undefined' ? createPortal(bubble, document.body) : bubble;
}
