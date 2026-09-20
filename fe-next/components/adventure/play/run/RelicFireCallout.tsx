'use client';

/**
 * "THIS relic did that." — the callout a relic throws the instant a word
 * triggers it.
 *
 * ROUND 3 GAP, verbatim: when the second relic fired, all the player got was a
 * ~30px "+500" badge appended to its icon in the top-left corner, while a
 * full-screen "WHOMPED!" banner, a "-500" over the dragon and a glowing board
 * owned the eye. The relic's own contribution was the least salient thing on
 * screen and the causal link had to be inferred.
 *
 * So the number leaves the icon and becomes its own panel: the relic's art, its
 * NAME, and what it added — connected back to its chip by a drawn trail, the
 * way `v1_debuff_timer.jpg` gives "Vulnerable Wears Off" its own clean line in
 * open space. Several relics firing on one word share ONE panel, one row each:
 * two pills anchored to chips 44px apart would collide, which is the same
 * defect ("-1000 -1000" stacked) the judge marked on the boss frame.
 *
 * It lands fast and HOLDS: the judge reads still frames, so a 300ms flourish
 * that is gone before the shutter is worth nothing.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { RelicId } from '@/lib/adventure/play/relics';
import { relicArt } from './art';
import { calloutSpot, trailRect, type Rect, type Spot } from './overlayPlace';
import { cn } from '@/lib/utils';

interface Props {
  /** The relics that fired, in rail order, with what each one added. */
  fired: readonly { id: RelicId; label: string }[];
  /** Bumps per trigger so the whole callout replays instead of sticking. */
  fireKey: number;
  /** The rail element — the callout parks directly under it. */
  host: HTMLElement | null;
  /** The chip each relic lives in, so a trail can be drawn back to it. */
  chipAt: (id: RelicId) => HTMLElement | null;
  onDone: () => void;
}

/** Long enough that the callout is reliably in the same frame as the celebration banner. */
const HOLD_MS = 1900;
/** It starts fading this long before it goes, so it leaves rather than blinking out. */
const FADE_MS = 260;
/**
 * The gap the trail is drawn in. It has to be big enough to READ as a line
 * joining the chip to the panel — park the panel flush under the rail and the
 * connector collapses to a few pixels hidden under the panel's own shadow.
 */
const GAP_PX = 18;
/**
 * How many relics get a NAMED row. Late in a run a 7-letter first word can fire
 * five at once; five rows is a ~190px wall hanging off the rail that swallows
 * the foe card and the top of the board — the opposite of "keep the board the
 * hero". Past this, the overflow is summed on one row.
 */
const MAX_ROWS = 3;

const toRect = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

export default function RelicFireCallout({ fired, fireKey, host, chipAt, onDone }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const boxRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [trails, setTrails] = useState<{ id: RelicId; left: number; top: number; height: number }[]>([]);
  const [mounted, setMounted] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setMounted(true), []);

  // Keyed on `fireKey` ALONE. Hanging the timer off `onDone` restarted it on
  // every parent render — and the parent re-renders on the level clock — so the
  // callout would never leave. The callback goes through a ref instead.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    setLeaving(false);
    const fade = setTimeout(() => setLeaving(true), HOLD_MS - FADE_MS);
    const gone = setTimeout(() => done.current(), HOLD_MS);
    return () => { clearTimeout(fade); clearTimeout(gone); };
  }, [fireKey]);

  useLayoutEffect(() => {
    if (!mounted || !host || !boxRef.current) return;
    const box = { width: boxRef.current.offsetWidth, height: boxRef.current.offsetHeight };
    const chips = fired.map((f) => chipAt(f.id)).filter((el): el is HTMLElement => !!el).map(toRect);
    const at = calloutSpot(toRect(host), chips, box, { width: window.innerWidth, height: window.innerHeight }, GAP_PX);
    setSpot(at);
    setTrails(fired.flatMap((f) => {
      const el = chipAt(f.id);
      const line = el ? trailRect(toRect(el), at, box) : null;
      return line ? [{ id: f.id, ...line }] : [];
    }));
    // `fireKey` is the trigger: the same relics can fire again on the next word.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, host, fireKey, fired.length]);

  if (!fired.length) return null;

  // Cap the named rows; anything past the cap is summed on a single line.
  const over = fired.length > MAX_ROWS;
  const named = over ? fired.slice(0, MAX_ROWS - 1) : fired;
  const rest = over ? fired.slice(MAX_ROWS - 1) : [];

  const layer = (
    <div className="pointer-events-none fixed inset-0 z-[115]" aria-hidden data-testid="relic-fire-layer">
      {/* The connecting trails: a lime beam from each firing chip down into the
          panel. This is the attribution — without it the panel is just another
          number floating near the top of the screen. */}
      {trails.map((line, i) => (
        <motion.span
          key={`${line.id}-${fireKey}`}
          className="absolute w-[11px] -translate-x-1/2 rounded-full border-[3px] border-black bg-neo-lime shadow-[0_0_10px_3px_rgba(198,244,50,0.55)]"
          style={{ left: line.left, top: line.top, height: line.height, transformOrigin: spot?.flipped ? 'bottom' : 'top' }}
          initial={reduce ? { opacity: 1 } : { scaleY: 0, opacity: 1 }}
          animate={leaving ? { opacity: 0 } : { scaleY: 1, opacity: 1 }}
          transition={{ duration: leaving ? FADE_MS / 1000 : 0.12, delay: leaving ? 0 : i * 0.04, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        ref={boxRef}
        data-testid="relic-fire-callout"
        className={cn(
          'absolute flex max-w-[min(22rem,calc(100vw-1rem))] flex-col gap-1 rounded-xl border-[3px] border-black bg-neo-lime p-1.5 text-black shadow-[4px_4px_0_#000]',
          !spot && 'opacity-0',
        )}
        style={spot ? { left: spot.left, top: spot.top } : { left: 8, top: 8 }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: spot?.flipped ? 8 : -8 }}
        animate={leaving ? { opacity: 0, scale: 0.92, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        transition={leaving ? { duration: FADE_MS / 1000 }
          : reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 460, damping: 18, delay: 0.08 }}
      >
        {named.map((f) => (
          <span key={f.id} data-testid="relic-fire-row" className="flex items-center gap-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
            <img src={relicArt(f.id)} alt="" draggable={false}
              className="h-8 w-8 shrink-0 rounded border-2 border-black bg-black/25 object-contain lg:h-11 lg:w-11" />
            <span className="min-w-0 flex-1 truncate font-neo-display text-[15px] font-black uppercase leading-tight tracking-tight lg:text-xl">
              {t(`adventurePlay.relic.${f.id}`)}
            </span>
            <span data-testid={`relic-fire-${f.id}`} dir="ltr"
              className="shrink-0 rounded-md border-2 border-black bg-black px-1.5 py-0.5 font-neo-display text-xl font-black leading-tight tabular-nums text-neo-lime lg:text-3xl">
              {f.label}
            </span>
          </span>
        ))}
        {rest.length > 0 && (
          <span data-testid="relic-fire-more" className="flex items-center gap-1.5">
            <span className="flex shrink-0 -space-x-2">
              {rest.slice(0, 3).map((f) => (
                /* eslint-disable-next-line @next/next/no-img-element -- small static art */
                <img key={f.id} src={relicArt(f.id)} alt="" draggable={false}
                  className="h-6 w-6 rounded border-2 border-black bg-black/25 object-contain lg:h-8 lg:w-8" />
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate font-neo-display text-[13px] font-black uppercase leading-tight lg:text-lg">
              {t('adventurePlay.loot.andMoreRelics', { n: rest.length })}
            </span>
          </span>
        )}
      </motion.div>
    </div>
  );

  return mounted && typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}
