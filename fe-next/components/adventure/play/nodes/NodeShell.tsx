'use client';

/**
 * The frame every map-node screen wears: world backdrop, a kind badge, the two
 * resources a node can spend (gold, hearts), a title banner, the scene, and one
 * pinned footer action. Dark-only surface, so the navy is hardcoded (a
 * `dark:` pair flashes cream on a lazy mount).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { NodeKind } from '@/lib/adventure/play/runMap';
import { COIN_ART } from '../run/art';
import { nodeScene, NODE_ACCENT } from './nodeArt';
import { cn } from '@/lib/utils';

interface Props {
  kind: NodeKind;
  world: number;
  title: string;
  /** One line under the title: what this node is about to cost or give. */
  subtitle?: string;
  gold: number;
  hp: number;
  maxHp: number;
  busy?: boolean;
  children: ReactNode;
  footer: ReactNode;
}

export default function NodeShell({ kind, world, title, subtitle, gold, hp, maxHp, busy, children, footer }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const accent = NODE_ACCENT[kind] ?? 'bg-neo-cyan';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
  }, []);
  useEffect(() => {
    measure();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [measure, children]);

  return (
    <div data-testid={`node-screen-${kind}`} className="fixed inset-0 z-[60] overflow-hidden bg-[#0f1b3d] text-neo-cream">
      {/* eslint-disable-next-line @next/next/no-img-element -- full-bleed decorative backdrop */}
      <img src={nodeScene(kind, world)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(15,27,61,0.35)_0%,rgba(9,14,34,0.92)_75%)]" />

      <div className="relative z-10 mx-auto flex h-full max-w-lg flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        {/* Resource strip: what this node can spend. `pe-11` keeps the hearts clear
            of the app's own sound button, which floats over the top-right corner. */}
        <div className="flex items-center gap-2 pe-11">
          <span className={cn('rounded-xl border-[3px] border-black px-2.5 py-1 font-neo-display text-sm font-bold text-black shadow-[3px_3px_0_#000]', accent)}>
            {t(`adventurePlay.map.kind.${kind}`)}
          </span>
          <span className="flex-1" />
          <span data-testid="node-gold" className="inline-flex items-center gap-1 rounded-xl border-[3px] border-black bg-black/70 px-2.5 py-1 font-neo-display font-bold tabular-nums shadow-[3px_3px_0_#000]">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
            <img src={COIN_ART} alt="" aria-hidden className="h-5 w-5 object-contain" />
            <bdi dir="ltr">{gold}</bdi>
          </span>
          <span data-testid="node-hp" className="inline-flex items-center gap-1 rounded-xl border-[3px] border-black bg-black/70 px-2.5 py-1 font-neo-display font-bold tabular-nums shadow-[3px_3px_0_#000]">
            <Heart className="h-4 w-4 fill-neo-pink stroke-black stroke-[2.5]" aria-hidden />
            <bdi dir="ltr">{hp}/{maxHp}</bdi>
            <span className="sr-only">{t('adventurePlay.hp')}</span>
          </span>
        </div>

        <motion.h2
          initial={reduce ? false : { y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="mt-3 rounded-2xl border-[3px] border-black bg-black/70 px-3 py-2 text-center font-neo-display text-2xl font-bold leading-tight shadow-[4px_4px_0_#000]"
        >
          {title}
          {subtitle && <span className="mt-0.5 block text-sm font-semibold leading-snug opacity-85">{subtitle}</span>}
        </motion.h2>

        {/* A shelf that runs past the fold must say so: without this the sixth
            row (and its "N gold short" line) is simply invisible at 390x844. */}
        <div className="relative mt-3 min-h-0 flex-1">
          <div ref={scrollRef} onScroll={measure}
            className={cn('h-full overflow-y-auto overscroll-contain', busy && 'pointer-events-none opacity-70')}>
            {children}
          </div>
          {more && (
            <span aria-hidden data-testid="node-scroll-more"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(to_top,#0b1230_0%,rgba(11,18,48,0)_100%)]" />
          )}
        </div>

        <div className="mt-3 shrink-0">{footer}</div>
      </div>
    </div>
  );
}

/** The one big neo-brutalist button every node screen ends on. */
export function NodeButton({ onClick, disabled, tone = 'lime', children, testId }: {
  onClick: () => void; disabled?: boolean; tone?: 'lime' | 'cream' | 'pink' | 'cyan' | 'yellow'; children: ReactNode; testId?: string;
}) {
  const bg = tone === 'lime' ? 'bg-neo-lime' : tone === 'pink' ? 'bg-neo-pink'
    : tone === 'cyan' ? 'bg-neo-cyan' : tone === 'yellow' ? 'bg-neo-yellow' : 'bg-neo-cream';
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className={cn('w-full rounded-2xl border-[3px] border-black px-4 py-3 font-neo-display text-lg font-bold text-black shadow-[4px_4px_0_#000] transition active:translate-y-0.5 active:shadow-none disabled:opacity-50', bg)}
    >
      {children}
    </button>
  );
}
