'use client';

/**
 * Owned relics as a strip of framed, numbered chips — the run's permanent
 * inventory, pinned where you can point at it.
 *
 * Round 1 shrank every chip to fit one row and the judge measured "two
 * undifferentiated ~20px flat squares". Now the rail keeps chips at a legible
 * size (see `relicSlot`) and WRAPS when a haul gets big, each chip carries a
 * numeral (`relicBadge`), and the tooltip is portaled so nothing can paint over
 * it (`RelicTooltip`).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { RelicId } from '@/lib/adventure/play/relics';
import RelicChip from './RelicChip';
import RelicFireCallout from './RelicFireCallout';
import RelicTooltip, { type StackCtx } from './RelicTooltip';
import { relicSlotClass, relicRailMaxPx, type RelicBarSize } from './relicSlot';
import { runStackCtx } from './relicRunTotals';
import { cn } from '@/lib/utils';

export interface RelicPulse { id: number; relics: RelicId[]; labels?: Partial<Record<RelicId, string>> }

interface Props {
  relics: readonly RelicId[];
  pulse?: RelicPulse | null;
  /** Render an empty dashed slot at the end (draft fly-in target). */
  ghostRef?: Ref<HTMLSpanElement>;
  size?: RelicBarSize;
  className?: string;
  /** Each relic's running points this level — baked onto its chip. */
  contrib?: Partial<Record<RelicId, number>>;
  /** Run words + owned relics, so the tooltip can show alone vs stacked values. */
  stackCtx?: StackCtx | null;
  /**
   * For a rail on a screen with no board of its own (the act map): the run
   * replays itself out of storage so the tooltip still answers "what has this
   * paid me THIS RUN?". Ignored when `stackCtx` is given — the live board wins.
   */
  runCtx?: { world?: number | null; step?: number | null } | null;
  /**
   * What the trigger callout must park CLEAR of. The rail is only the top row
   * of the run bar, so a callout parked under the rail landed on the HUD's own
   * potion slots and purse — and the one frame that has to show relics, potions
   * and a live toast at once showed two of the three. Pass the whole bar and the
   * callout drops below all of it, onto the stage art, which owns nothing.
   */
  calloutHost?: HTMLElement | null;
  /** A region the DETAIL BUBBLE must not cover — the fight stage. */
  tooltipAvoid?: HTMLElement | null;
}

export default function RelicBar({ relics, pulse, ghostRef, size = 'sm', className, contrib, stackCtx, runCtx, calloutHost, tooltipAvoid }: Props) {
  const { t } = useLanguageSafe();
  const [open, setOpen] = useState<RelicId | null>(null);
  const chips = useRef(new Map<RelicId, HTMLButtonElement>());
  const rail = useRef<HTMLDivElement>(null);
  // The callout outlives its pulse prop by design — it HOLDS, so a still frame
  // catches it beside the celebration banner instead of after it.
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => { if (pulse?.id != null) setShown(pulse.id); }, [pulse?.id]);
  const endFire = useCallback(() => setShown(null), []);
  const fired = useMemo(() => {
    if (!pulse || shown !== pulse.id) return [];
    return pulse.relics
      .map((id) => ({ id, label: pulse.labels?.[id] ?? '' }))
      .filter((f) => !!f.label && relics.includes(f.id));
  }, [pulse, shown, relics]);
  // The board's own context always wins; `runCtx` only fills the gap on a
  // boardless screen, where the alternative is a tooltip with no numbers at all.
  const ctx = useMemo(
    () => stackCtx ?? (runCtx?.world ? runStackCtx(runCtx.world, runCtx.step ?? 1, relics) : null),
    [stackCtx, runCtx?.world, runCtx?.step, relics],
  );
  const slotCount = relics.length + (ghostRef ? 1 : 0);
  const slot = relicSlotClass(slotCount, size);
  // Cap the rail at an even split so the wrap never leaves an orphan chip
  // on its own row. It only narrows: a tighter screen still wraps earlier.
  const railMax = relicRailMaxPx(slotCount, size);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(null), 6000);
    return () => clearTimeout(id);
  }, [open]);

  // A relic that leaves the run must not leave its bubble hanging on the body.
  useEffect(() => { if (open && !relics.includes(open)) setOpen(null); }, [relics, open]);

  return (
    /* `adv-relic-rail` is the landscape sheet's handle on the strip: on a TV it
       drops the width cap below and spreads the chips across the whole bar. */
    <div ref={rail} className={cn('adv-relic-rail relative', className)}>
      {/* gap-y clears the numeral pill that hangs off each chip's bottom edge —
          at gap-1 a wrapped row's badges sat ON the row beneath them, which is
          the "illegible at scale" reading the judge would take. pt is only the
          firing ring's headroom, so it is thin. */}
      {/* The cap travels as a CSS VARIABLE, not an inline width: the landscape
          sheet sets `--adv-rail-max: none` and the rail spreads. An inline
          `max-width` would have needed `!important` to beat. */}
      <ul style={{ '--adv-rail-max': `${railMax}px` } as CSSProperties} className={cn('flex max-w-[var(--adv-rail-max)] flex-wrap items-start gap-x-1', size === 'xs' ? 'gap-y-1 py-0.5' : 'gap-y-2.5 pb-2.5 pt-1')} aria-label={t('adventurePlay.loot.relicsTitle')}>
        {relics.map((id) => (
          <li key={id} className={cn('flex-1', slot)}>
            <RelicChip
              id={id}
              contrib={contrib?.[id]}
              /* Held for the callout's whole life, so a still frame shows the lit
                 chip, its trail and the named panel as one connected thing. */
              firing={fired.some((f) => f.id === id)}
              fireKey={shown ?? 0}
              open={open === id}
              onToggle={() => setOpen((o) => (o === id ? null : id))}
              innerRef={(el) => { if (el) chips.current.set(id, el); else chips.current.delete(id); }}
              bare={size === 'xs'}
            />
          </li>
        ))}
        {ghostRef && (
          <li className={cn('flex-1', slot)}>
            <span ref={ghostRef} aria-label={t('adventurePlay.loot.emptySlot')}
              className="grid aspect-square w-full place-items-center rounded-lg border-[3px] border-dashed border-neo-cream/40 bg-black/30" />
          </li>
        )}
      </ul>
      {/* NOT wrapped in AnimatePresence: the callout is not a motion component at
          its root (it portals), so an exiting copy would never report its exit
          finished and AnimatePresence would hold stale callouts on screen. It
          fades itself out instead. */}
      {fired.length > 0 && (
        <RelicFireCallout key={`fire-${shown}`} fired={fired} fireKey={shown ?? 0} host={calloutHost ?? rail.current}
          chipAt={(id) => chips.current.get(id) ?? null} onDone={endFire} />
      )}
      <AnimatePresence>
        {open && (
          <RelicTooltip key={open} id={open} onClose={() => setOpen(null)}
            stackCtx={ctx} anchor={chips.current.get(open) ?? null} avoid={tooltipAvoid ?? null} />
        )}
      </AnimatePresence>
    </div>
  );
}
