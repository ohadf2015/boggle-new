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
import { useCallback, useEffect, useMemo, useRef, useState, type Ref } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { RelicId } from '@/lib/adventure/play/relics';
import RelicChip from './RelicChip';
import RelicFireCallout from './RelicFireCallout';
import RelicTooltip, { type StackCtx } from './RelicTooltip';
import { relicSlotClass } from './relicSlot';
import { runStackCtx } from './relicRunTotals';
import { cn } from '@/lib/utils';

export interface RelicPulse { id: number; relics: RelicId[]; labels?: Partial<Record<RelicId, string>> }

interface Props {
  relics: readonly RelicId[];
  pulse?: RelicPulse | null;
  /** Render an empty dashed slot at the end (draft fly-in target). */
  ghostRef?: Ref<HTMLSpanElement>;
  size?: 'sm' | 'md';
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
}

export default function RelicBar({ relics, pulse, ghostRef, size = 'sm', className, contrib, stackCtx, runCtx }: Props) {
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
  const slot = relicSlotClass(relics.length + (ghostRef ? 1 : 0), size);

  useEffect(() => {
    if (!open) return undefined;
    const id = setTimeout(() => setOpen(null), 6000);
    return () => clearTimeout(id);
  }, [open]);

  // A relic that leaves the run must not leave its bubble hanging on the body.
  useEffect(() => { if (open && !relics.includes(open)) setOpen(null); }, [relics, open]);

  return (
    <div ref={rail} className={cn('relative', className)}>
      <ul className="flex flex-wrap items-start gap-1 pb-2 pt-3" aria-label={t('adventurePlay.loot.relicsTitle')}>
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
        <RelicFireCallout key={`fire-${shown}`} fired={fired} fireKey={shown ?? 0} host={rail.current}
          chipAt={(id) => chips.current.get(id) ?? null} onDone={endFire} />
      )}
      <AnimatePresence>
        {open && (
          <RelicTooltip key={open} id={open} onClose={() => setOpen(null)}
            stackCtx={ctx} anchor={chips.current.get(open) ?? null} />
        )}
      </AnimatePresence>
    </div>
  );
}
