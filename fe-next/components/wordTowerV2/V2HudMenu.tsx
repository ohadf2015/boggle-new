'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { RunState } from '@/lib/wordTowerV2/run';
import type { Estate } from '@/lib/wordTowerV2/estate';
import { type RewardId } from '@/lib/wordTowerV2/rewards';
import { RivalsCard, WorkshopCard } from './hud/SheetCards';
import { REWARD_ICON } from './v2Icons';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  open: boolean;
  onClose: () => void;
  run: RunState;
  tenants: number;
  estate: Estate;
  raids: number;
  onOpenEstate: () => void;
  /** Open the rival board (see their towers, buy a wrecking ball, ruin one). */
  onOpenRivals?: () => void;
  reducedMotion?: boolean;
  /** Shown first in the sheet (the rank card). */
  topSlot?: ReactNode;
  /** Shown last, under "What each block does" (the block legend). */
  footSlot?: ReactNode;
  /** The tower right above you, to suggest as the next wreck. */
  rivalTarget?: { name: string; gapM: number } | null;
  /** Someone who raided you and is still owed a payback. */
  raider?: string | null;
}

const EFFECT_CLASS: Record<'steady' | 'plumb' | 'wide', string> = {
  steady: 'bg-neo-cyan',
  plumb: 'bg-neo-purple',
  wide: 'bg-neo-lime',
};

/**
 * "Your tower": the sheet behind the HUD's menu button.
 *
 * The old sheet stacked a bar, a lone streak ring and two bare number chips
 * under headings like "Banked" (player report, Nov 2026: "weird and not
 * usable"). It now reads top to bottom as: where you stand (rank and the
 * metres to the next one), what you can do (workshop, rivals — each saying
 * what is waiting), this run's numbers with names, and what the blocks do.
 */
export function V2HudMenu({
  t,
  open,
  onClose,
  run,
  tenants,
  estate,
  raids,
  onOpenEstate,
  onOpenRivals,
  reducedMotion,
  topSlot,
  footSlot,
  rivalTarget = null,
  raider = null,
}: Props) {
  const effects: Array<{ id: 'steady' | 'plumb' | 'wide'; n: number }> = [];
  if (run.steadyDrops > 0) effects.push({ id: 'steady', n: run.steadyDrops });
  if (run.plumbDrops > 0) effects.push({ id: 'plumb', n: run.plumbDrops });
  if (run.nextWidthMult > 1) effects.push({ id: 'wide', n: 1 });

  if (!open) {
    return null;
  }

  return (
    <>
      {/* Backdrop to close drawer on tap */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      {/* Bottom sheet drawer */}
      <div
        data-wt2-hud-menu
        role="dialog"
        aria-label={t('wordTowerV2.hud.sheet.title')}
        className="fixed bottom-0 inset-x-0 z-50 mx-auto max-h-[78vh] max-w-lg overflow-y-auto rounded-t-neo-xl border-x-[3px] border-t-[3px] border-neo-cream bg-neo-navy pb-[max(0.5rem,env(safe-area-inset-bottom),var(--cap-safe-area-bottom,0px))]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-[3px] border-black bg-neo-purple px-4 py-2.5">
          <h2 className="font-neo-display text-lg font-black uppercase text-neo-cream [text-shadow:2px_2px_0_rgb(var(--neo-black))]">
            {t('wordTowerV2.hud.sheet.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('wordTowerV2.results.close')}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          {topSlot ? <div data-wt2-menu-top>{topSlot}</div> : null}

          {/* Decisions first: what you can spend on, and who you can hit. */}
          <WorkshopCard
            t={t}
            estate={estate}
            raids={raids}
            onOpen={() => {
              onOpenEstate();
              onClose();
            }}
          />
          {onOpenRivals ? (
            <RivalsCard
              t={t}
              balls={run.balls}
              target={rivalTarget}
              raider={raider}
              onOpen={() => {
                onOpenRivals();
                onClose();
              }}
            />
          ) : null}

          {/* This run, every number with a name next to it. */}
          <section data-wt2-this-run>
            <h3 className="mb-2 font-neo-display text-xs font-black uppercase text-neo-cream/70">
              {t('wordTowerV2.hud.sheet.thisRun')}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Stat
                label={t('wordTowerV2.streak.label')}
                sub={t('wordTowerV2.hud.sheet.streak')}
                value={run.combo}
                note={run.bestCombo > 0 ? t('wordTowerV2.hud.sheet.streakBest', { n: run.bestCombo }) : undefined}
                tone="bg-neo-orange"
                icon="🔥"
              />
              <Stat
                label={t('wordTowerV2.hud.sheet.tenants')}
                value={tenants}
                tone="bg-neo-cyan"
                icon="👥"
                ariaLabel={tenants > 0 ? t('wordTowerV2.tenants', { n: tenants }) : undefined}
              />
            </div>
            {effects.length > 0 ? (
              <div data-wt2-topbar-secondary className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="sr-only">{t('wordTowerV2.hud.banked')}</span>
                {effects.map(({ id, n }) => {
                  const Icon = REWARD_ICON[id as RewardId];
                  return (
                    <div
                      key={`${id}-${n}`}
                      className={`flex items-center gap-1 rounded-neo border-neo border-black px-2 py-1 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm ${EFFECT_CLASS[id]}`}
                      aria-label={t('wordTowerV2.hud.effect', { name: t(`wordTowerV2.reward.${id}.name`), n })}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="uppercase" aria-hidden>
                        {t(`wordTowerV2.reward.${id}.name`)}
                      </span>
                      {id === 'wide' ? null : (
                        <span className="tabular-nums" aria-hidden>
                          ×{n}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          {footSlot ? (
            <section data-wt2-menu-foot className="rounded-neo border-neo-thick border-black bg-neo-cream p-3 text-neo-navy shadow-hard">
              <h3 className="mb-2 font-neo-display text-sm font-black uppercase">{t('wordTowerV2.hud.sheet.legendTitle')}</h3>
              {footSlot}
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}

interface StatProps {
  label: string;
  sub?: string;
  value: number;
  note?: string;
  tone: string;
  icon: string;
  ariaLabel?: string;
}

/** One labelled number: the old sheet showed "3" and "87" with nothing saying what they counted. */
function Stat({ label, sub, value, note, tone, icon, ariaLabel }: StatProps) {
  return (
    <div
      className="flex items-center gap-2 rounded-neo border-[3px] border-neo-cream/80 bg-neo-navy-light p-2 text-neo-cream shadow-hard-sm"
      aria-label={ariaLabel}
    >
      <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-neo-sm border-2 border-black text-lg ${tone}`}>
        {icon}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block font-neo-display text-xl font-black tabular-nums">{value}</span>
        <span className="block truncate text-[11px] font-bold uppercase opacity-80">{label}</span>
        {sub ? <span className="block truncate text-[10px] font-semibold opacity-60">{sub}</span> : null}
        {note ? <span className="block text-[10px] font-bold text-neo-yellow">{note}</span> : null}
      </span>
    </div>
  );
}
