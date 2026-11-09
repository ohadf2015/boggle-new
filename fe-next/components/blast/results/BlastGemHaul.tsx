'use client';

import { useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { BLAST_GEM_KINDS, type BlastGemKind } from '@/shared/types/blast';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';
import { vibrateBlastGem } from '@/components/grid/hapticFeedback';
import { BlastGemArt } from '../legacy/BlastGemArt';
import { GEM_PALETTE, GEM_RARITY } from '../legacy/blastGemVisuals';
import { playGemCollect } from '../legacy/effects/blastFxAudio';
import type { BlastGemCounts } from '../legacy/utils/blastGems';
import type { BlastResultsT } from './types';
import styles from './gemHaul.module.css';

/** Seconds the haul waits so the score hero lands first. */
const REVEAL_DELAY = 0.9;

export function bestGemOf(gems: BlastGemCounts): BlastGemKind | null {
  let best: BlastGemKind | null = null;
  for (const kind of BLAST_GEM_KINDS) if ((gems[kind] ?? 0) > 0) best = kind;
  return best;
}

/**
 * The run's gems as a treasure shelf: one slot per gem color, rarest last. Found gems pop
 * in one by one with a climbing chime and count up; the best find glows. Colors not found
 * yet stay as dark silhouettes, so the shelf also shows what is left to hunt.
 * With only a total (multiplayer), it shows one stack of gems with the count.
 */
export function BlastGemHaul({ gems, total, t }: { gems?: BlastGemCounts; total: number; t: BlastResultsT }) {
  const rootRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const byKind = gems && BLAST_GEM_KINDS.some((k) => (gems[k] ?? 0) > 0) ? gems : null;
  const best = byKind ? bestGemOf(byKind) : null;

  useGSAP(
    () => {
      if (reducedMotion || total === 0) return;
      const found = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-gem-found="true"]') ?? []);
      const tl = gsap.timeline({ delay: REVEAL_DELAY });
      const root = rootRef.current;
      tl.from('[data-haul="frame"]', { y: 24, autoAlpha: 0, duration: 0.3, ease: 'back.out(1.6)' });
      if (root?.querySelector('[data-gem-found="false"]')) tl.from('[data-gem-found="false"]', { autoAlpha: 0, duration: 0.25 }, '<0.1');
      found.forEach((slot, i) => {
        const gem = slot.dataset.gem as BlastGemKind;
        const count = Number(slot.dataset.count ?? 1);
        const counter = slot.querySelector<HTMLElement>('[data-haul="count"]');
        const tally = { n: 0 };
        tl.from(slot.querySelector('[data-haul="art"]'), {
          scale: 0, rotate: -60, duration: 0.34, ease: 'back.out(3)',
          onStart: () => {
            playGemCollect(GEM_RARITY[gem] ?? 2, i);
            vibrateBlastGem(GEM_RARITY[gem] ?? 2);
          },
        }, i === 0 ? '+=0.05' : '+=0.12')
          // The count stays hidden until its gem lands, then climbs from zero.
          .from(counter, { autoAlpha: 0, scale: 0.5, duration: 0.15, ease: 'back.out(2)' }, '<0.1')
          .to(tally, {
            n: count, duration: Math.min(0.6, 0.15 + count * 0.08), ease: 'power1.out',
            onUpdate: () => { if (counter) counter.textContent = `×${Math.round(tally.n)}`; },
          }, '<')
          .fromTo(slot, { y: 0 }, { y: -6, duration: 0.1, yoyo: true, repeat: 1, ease: 'power1.out' }, '<');
      });
      if (root?.querySelector('[data-haul="best"]')) {
        tl.from('[data-haul="best"]', { scale: 2, rotate: -14, autoAlpha: 0, duration: 0.3, ease: 'back.out(2.4)' }, '+=0.1');
      }
    },
    { scope: rootRef, dependencies: [reducedMotion, total] },
  );

  if (total === 0) {
    return (
      <section data-testid="blast-gem-haul" data-empty="true" className="w-full rounded-neo border-3 border-neo-black bg-neo-navy-light px-3 py-2.5 shadow-hard">
        <h3 className="font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white">{t('blast.results.gemHaul', 'Gem haul')}</h3>
        <p className="mt-1 text-xs font-bold text-neo-white/80">{t('blast.results.gemHaulEmpty', 'No gems this run. Rare words earn them.')}</p>
      </section>
    );
  }

  return (
    <section
      ref={rootRef}
      data-testid="blast-gem-haul"
      className="w-full"
    >
      <div data-haul="frame" className="rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard">
        <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
          <h3 className="font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white tv:text-lg">
            {t('blast.results.gemHaul', 'Gem haul')}
          </h3>
          <span className="rounded-md border-2 border-neo-black bg-neo-cyan px-1.5 font-neo-display text-xs font-black tabular-nums text-neo-black tv:text-base" dir="ltr">
            {t('blast.results.gemTotal', { n: total })}
          </span>
        </div>
        <ul className="grid grid-cols-4 gap-2 p-3">
          {(byKind ? BLAST_GEM_KINDS : (['sapphire'] as const)).map((kind) => {
            const count = byKind ? byKind[kind] ?? 0 : total;
            const found = count > 0;
            const isBest = kind === best;
            const p = GEM_PALETTE[kind];
            return (
              <li
                key={kind}
                data-testid={`blast-gem-slot-${kind}`}
                data-gem={kind}
                data-count={count}
                data-gem-found={found ? 'true' : 'false'}
                className={cn(
                  'relative flex flex-col items-center gap-1 rounded-neo border-2 border-neo-black px-1 pb-1.5 pt-2',
                  !byKind && 'col-span-4 flex-row justify-center gap-3',
                  found ? 'bg-neo-navy' : 'bg-neo-navy/60',
                  isBest && [styles.best, styles.sweep],
                )}
                style={isBest ? ({ '--gem-glow': p.glow } as CSSProperties) : undefined}
              >
                {isBest && (
                  <span
                    data-haul="best"
                    className="absolute -top-2.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border-2 border-neo-black bg-neo-yellow px-1 text-[9px] font-black uppercase leading-tight tracking-wide text-neo-black rtl:translate-x-1/2 tv:text-sm"
                  >
                    {t('blast.results.bestFind', 'Best find')}
                  </span>
                )}
                <span data-haul="art" className={cn('block h-10 w-10 tv:h-16 tv:w-16', !found && 'opacity-25 grayscale')}>
                  <BlastGemArt gem={kind} className="h-full w-full drop-shadow-[2px_2px_0_rgb(var(--neo-black))]" />
                </span>
                <span
                  data-haul="count"
                  className="font-neo-display text-lg font-black leading-none tabular-nums tv:text-3xl"
                  style={{ color: found ? p.light : undefined }}
                  dir="ltr"
                >
                  {found ? `×${count}` : '?'}
                </span>
                {byKind && (
                  <span className="text-center text-[9px] font-bold uppercase leading-tight tracking-wide text-neo-white/80 tv:text-sm">
                    {t(`blastProgress.gem_${kind}`)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
