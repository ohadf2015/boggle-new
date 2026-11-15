'use client';

import { m } from 'framer-motion';
import { hex } from '@/lib/wordTowerV2/gear';
import type { StyleProgress, TowerStyle } from '@/lib/wordTowerV2/towerStyle';

type T = (key: string, params?: Record<string, string | number>) => string;

/** A three-floor sketch of a style, drawn like the in-game floors (flat fills, ink outlines). */
export function StyleSwatch({ style, className = 'h-16 w-14' }: { style: TowerStyle; className?: string }) {
  const floors = [0, 1, 2].map((i) => style.facades[i % style.facades.length]);
  const win = (x: number, y: number, lit: boolean, trim: number) => {
    const fill = hex(lit ? style.lit : style.glass);
    switch (style.window) {
      case 'arched':
        return <path key={`${x}-${y}`} d={`M${x} ${y + 9}v-5a3 3 0 0 1 6 0v5z`} fill={fill} stroke="#0b0e1c" strokeWidth="1" />;
      case 'round':
        return <circle key={`${x}-${y}`} cx={x + 3} cy={y + 5} r="3" fill={fill} stroke={hex(trim)} strokeWidth="1" />;
      case 'tall':
        return <rect key={`${x}-${y}`} x={x + 1} y={y} width="4" height="10" fill={fill} stroke="#0b0e1c" strokeWidth="1" />;
      case 'curtain':
        return <rect key={`${x}-${y}`} x={x - 1} y={y} width="8" height="9" fill={fill} />;
      case 'neon':
        return <rect key={`${x}-${y}`} x={x} y={y + 1} width="6" height="7" fill={fill} stroke={hex(trim)} strokeWidth="1.5" />;
      default:
        return <rect key={`${x}-${y}`} x={x} y={y + 1} width="6" height="7" fill={fill} stroke="#0b0e1c" strokeWidth="1" />;
    }
  };
  return (
    <svg viewBox="0 0 40 50" aria-hidden className={className}>
      {floors.map(([main, trim], i) => {
        const y = 36 - i * 16;
        return (
          <g key={i}>
            <rect x="4" y={y} width="32" height="14" fill={hex(main)} stroke="#0b0e1c" strokeWidth="1.5" />
            <rect x="4" y={y} width="32" height="3" fill={hex(trim)} />
            {[8, 17, 26].map((x, j) => win(x, y + 3, (i + j) % 2 === 0, trim))}
          </g>
        );
      })}
    </svg>
  );
}

interface Props {
  t: T;
  progress: StyleProgress;
}

/**
 * Workshop header strip: the look your tower is built in now, and how many
 * upgrades until the next one. Upgrades change the WHOLE building's look
 * (towerStyle.ts), so the workshop says so before the player buys.
 */
export function StyleBanner({ t, progress }: Props) {
  const { style, next, toNext, progress01 } = progress;
  return (
    <section data-wt2-style-banner={style.id} className="flex items-center gap-3 border-b-4 border-neo-cream/60 bg-neo-navy-light px-3 py-2">
      <span className="shrink-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy p-0.5 shadow-hard-sm">
        <StyleSwatch style={style} className="h-12 w-10" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-neo-display text-[10px] font-bold uppercase leading-none text-neo-cream/70">{t('wordTowerV2.style.label')}</p>
        <p className="truncate font-neo-display text-base font-black uppercase leading-tight text-neo-cream">{t(`wordTowerV2.style.name.${style.id}`)}</p>
        {next ? (
          <>
            <div className="mt-1 h-2 overflow-hidden rounded-sm border-2 border-neo-cream/70 bg-neo-navy" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress01 * 100)}>
              <div className="h-full bg-neo-yellow" style={{ width: `${Math.round(progress01 * 100)}%` }} />
            </div>
            <p data-wt2-style-next className="mt-0.5 text-xs font-bold text-neo-cream">
              {toNext === 1
                ? t('wordTowerV2.style.nextOne', { name: t(`wordTowerV2.style.name.${next.id}`) })
                : t('wordTowerV2.style.next', { n: toNext, name: t(`wordTowerV2.style.name.${next.id}`) })}
            </p>
          </>
        ) : (
          <p className="mt-0.5 text-xs font-bold text-neo-yellow">{t('wordTowerV2.style.max')}</p>
        )}
      </div>
      {next ? (
        <span className="shrink-0 rounded-neo border-[3px] border-neo-cream/60 bg-neo-navy p-0.5 opacity-80 shadow-hard-sm" aria-hidden>
          <StyleSwatch style={next} className="h-12 w-10" />
        </span>
      ) : null}
    </section>
  );
}

/** Full-screen moment when an upgrade crosses into a new look. */
export function StyleUnlocked({ t, style, reducedMotion, onDone }: { t: T; style: TowerStyle; reducedMotion?: boolean; onDone: () => void }) {
  return (
    <button
      type="button"
      data-wt2-style-unlocked={style.id}
      onClick={onDone}
      className="absolute inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black/70 px-6"
    >
      <m.div
        initial={reducedMotion ? false : { scale: 0.4, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 16 }}
        className="flex w-full max-w-xs flex-col items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-yellow p-4 text-neo-navy shadow-hard"
      >
        <p className="font-neo-display text-sm font-black uppercase">{t('wordTowerV2.style.unlocked')}</p>
        <StyleSwatch style={style} className="h-32 w-28" />
        <p className="font-neo-display text-2xl font-black uppercase">{t(`wordTowerV2.style.name.${style.id}`)}</p>
        <p className="text-center text-sm font-bold">{t('wordTowerV2.style.unlockedHint')}</p>
      </m.div>
    </button>
  );
}
