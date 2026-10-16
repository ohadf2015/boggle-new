'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown, Lock, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CUBE_BLUR_DATA_URL, type ModeCubeModel, type ModeCubeVariant } from '@/lib/landing/modeMeta';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';
import ModeResumeChip from '../ModeResumeChip';
import { useHomeLaunch } from './HomeLaunch';
import styles from './HomeModeGrid.module.css';

const TINT: Record<ModeCubeVariant, { shadow: string; chip: string; ring: string; glow: string }> = {
  pink: { shadow: 'shadow-hard-pink', chip: 'bg-neo-pink text-neo-navy', ring: 'focus-visible:ring-neo-pink', glow: 'rgba(255,20,147,0.42)' },
  cyan: { shadow: 'shadow-hard-cyan', chip: 'bg-neo-cyan text-neo-navy', ring: 'focus-visible:ring-neo-cyan', glow: 'rgba(0,255,255,0.34)' },
  purple: { shadow: 'shadow-hard-purple', chip: 'bg-neo-purple text-neo-white', ring: 'focus-visible:ring-neo-purple', glow: 'rgba(139,92,246,0.5)' },
  orange: { shadow: 'shadow-hard-orange', chip: 'bg-neo-orange text-neo-navy', ring: 'focus-visible:ring-neo-orange', glow: 'rgba(255,107,53,0.42)' },
  lime: { shadow: 'shadow-hard-lime', chip: 'bg-neo-lime text-neo-navy', ring: 'focus-visible:ring-neo-lime', glow: 'rgba(191,255,0,0.36)' },
  blue: { shadow: 'shadow-hard-blue', chip: 'bg-blue-500 text-neo-white', ring: 'focus-visible:ring-blue-400', glow: 'rgba(59,130,246,0.42)' },
};

const BADGE_CLASS =
  'w-fit rounded-full border-2 border-black px-1.5 py-0.5 font-neo-display font-black uppercase leading-none shadow-hard-sm';

interface ModeTileProps {
  model: ModeCubeModel;
  index: number;
  anchor?: boolean;
  onPicked?: () => void;
}

function ModeTile({ model, index, anchor = false, onPicked }: ModeTileProps) {
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const launch = useHomeLaunch();
  const tint = TINT[model.variant];
  const locked = !!model.locked;
  const [imgFailed, setImgFailed] = useState(false);
  const hasArt = !!model.genIcon && !imgFailed;
  // A run in progress is the more useful thing to say than "new" — one chip per tile.
  const showRun = !!model.resume && !locked;
  const badge = model.badge && !showRun ? t(`landing.badge.${model.badge.toLowerCase()}`, model.badge) : null;

  return (
    <Link
      href={locked ? '#' : model.href}
      prefetch={false}
      data-testid={anchor ? 'mode-cube-anchor' : 'mode-cube'}
      data-cube-key={model.key}
      aria-disabled={locked || undefined}
      onPointerEnter={() => !locked && launch?.prefetch(model.href)}
      onClick={(e) => {
        if (locked) {
          e.preventDefault();
          return;
        }
        model.onClick();
        onPicked?.();
        launch?.start(e, { href: model.href, tone: model.variant, title: model.title, art: model.genIcon });
      }}
      style={{ '--i': index, '--art-scale': model.imgScale ?? 1, '--cube-glow': tint.glow } as CSSProperties}
      className={cn(
        'group relative block overflow-hidden rounded-neo border-[3px] border-black bg-neo-navy',
        tint.shadow,
        'transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        tint.ring,
        anchor ? 'min-h-[5.75rem] flex-1 md:min-h-0' : 'h-[5.5rem] md:h-auto md:aspect-square',
        model.highlighted && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
        locked && 'cursor-not-allowed',
      )}
    >
      {hasArt ? (
        <span
          data-testid={anchor ? undefined : 'mode-tile-art'}
          className={cn(
            'absolute inset-0',
            // Phone row tile: the mascot sits in its own inset well rather than a
            // hard-ruled slab glued to the edge, so the card reads as one object.
            !anchor && 'max-md:inset-y-2 max-md:start-2 max-md:end-auto max-md:w-[4.125rem] max-md:overflow-hidden max-md:rounded-neo max-md:border-2 max-md:border-black max-md:bg-black/30',
          )}
        >
        <Image
          src={model.genIcon as string}
          alt=""
          fill
          placeholder="blur"
          blurDataURL={CUBE_BLUR_DATA_URL}
          sizes={anchor ? '(max-width: 768px) 100vw, 400px' : '(max-width: 768px) 25vw, 200px'}
          onError={() => setImgFailed(true)}
          className={cn('object-cover', styles.art)}
        />
        </span>
      ) : (
        <span className={cn('absolute start-2 top-2 flex h-9 w-9 items-center justify-center rounded-neo border-2 border-black', tint.chip)}>
          <model.Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
      {!anchor && (
        // Mode-hue wash across the whole card so each tile owns its colour, not just its shadow.
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: 'linear-gradient(160deg, var(--cube-glow) 0%, transparent 70%)' }}
        />
      )}
      <span aria-hidden="true" className="cube-glow pointer-events-none absolute inset-0 z-[1]" />
      <span aria-hidden="true" className={cn('absolute inset-x-0 bottom-0 z-[1] h-3/5 bg-gradient-to-t from-neo-navy via-neo-navy/70 to-transparent', !anchor && 'max-md:hidden')} />
      {anchor && (
        <span
          aria-hidden="true"
          className="cube-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-[1] w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        />
      )}

      {anchor && badge && (
        <span className={cn('absolute end-1.5 top-1.5 z-[2]', BADGE_CLASS, 'text-[0.65rem]', tint.chip)}>{badge}</span>
      )}
      {showRun && model.resume && <ModeResumeChip resume={model.resume} anchor={anchor} />}

      {anchor ? (
        <span className="absolute inset-0 z-[2] flex flex-col justify-end p-3 md:p-4">
          <span className="font-neo-display text-2xl font-black uppercase leading-none tracking-tight text-neo-white drop-shadow-[0_2px_0_rgba(0,0,0,0.7)] md:text-2xl">
            {model.title}
          </span>
          {model.livePill && (
            <span className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-black bg-neo-lime px-2 py-0.5 font-neo-display text-[0.65rem] font-black uppercase tracking-wide text-neo-navy shadow-hard-sm md:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-navy" />
              </span>
              {model.livePill}
            </span>
          )}
          <span className="absolute bottom-3 end-3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-neo-lime text-neo-navy shadow-hard-sm transition-transform group-hover:translate-x-0.5 md:bottom-3 md:end-3 md:h-10 md:w-10">
            <Arrow className="h-5 w-5 md:h-6 md:w-6" strokeWidth={3} aria-hidden="true" />
          </span>
        </span>
      ) : (
        <span
          data-testid="mode-tile-label"
          className={cn(
            'absolute inset-y-0 start-[5.25rem] end-2 z-[2] flex flex-col items-start justify-center gap-1',
            'md:inset-x-0 md:inset-y-auto md:bottom-0 md:start-0 md:end-0 md:justify-end md:px-2.5 md:pb-2',
          )}
        >
          {badge && <span className={cn(BADGE_CLASS, 'text-[0.6rem] md:text-[0.65rem]', tint.chip)}>{badge}</span>}
          <span
            className="line-clamp-2 font-neo-display text-[0.95rem] font-black uppercase leading-[1.1] text-neo-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)] md:text-sm"
            style={{ textWrap: 'balance' } as CSSProperties}
          >
            {model.title}
          </span>
        </span>
      )}

      {locked && (
        <span className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-1 bg-neo-navy/75">
          <Lock className="h-5 w-5 text-neo-white" strokeWidth={2.5} aria-hidden="true" />
          {model.lockedMessage && <span className="px-2 text-center font-neo-body text-[0.65rem] text-neo-white">{model.lockedMessage}</span>}
        </span>
      )}
    </Link>
  );
}

function MoreSheet({ extras, open, onClose }: { extras: ModeCubeModel[]; open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d || d.open === open) return;
    if (open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (typeof d.close === 'function') d.close();
    else d.removeAttribute('open');
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-testid="home-more-sheet"
      aria-labelledby="home-more-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="mb-0 mt-auto w-full max-w-none rounded-t-neo-xl border-[3px] border-b-0 border-black bg-neo-navy p-0 text-neo-cream shadow-hard-lg backdrop:bg-black/70 md:m-auto md:max-w-2xl md:rounded-neo-xl md:border-b-[3px]"
    >
      <div className="p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="home-more-title" className="font-neo-display text-xl font-black uppercase tracking-wide">
            {t('landing.moreGameModes')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-black bg-neo-navy-light text-neo-cream shadow-hard-sm active:translate-y-px active:shadow-none"
          >
            <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-[env(safe-area-inset-bottom)] md:grid-cols-4">
          {extras.map((m, i) => (
            <ModeTile key={m.key} model={m} index={i} onPicked={onClose} />
          ))}
        </div>
      </div>
    </dialog>
  );
}

interface HomeModeGridProps {
  /** arena anchor first, then the tiles shown on the home itself */
  models: ModeCubeModel[];
  /** the rest of the roster, one tap away */
  extras: ModeCubeModel[];
  liveCount: number;
}

export function HomeModeGrid({ models, extras, liveCount }: HomeModeGridProps) {
  const { t } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const anchor = models.find((m) => m.role === 'anchor') ?? models[0];
  const tiles = models.filter((m) => m !== anchor);

  return (
    <section aria-labelledby="home-modes-title" className="flex min-h-0 flex-1 flex-col gap-2.5 md:flex-none md:gap-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 id="home-modes-title" className="font-neo-display text-base font-black uppercase tracking-wide text-neo-cream md:text-xl">
          {t('landing.home.gameModes')}
        </h2>
        {liveCount > 0 && (
          <span data-testid="home-live-count" className="inline-flex items-center gap-1.5 font-neo-display text-xs font-bold text-neo-lime md:text-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-65 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-lime" />
            </span>
            {formatLiveShort(liveCount)} {t('landing.home.online')}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 md:grid md:flex-none md:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))] md:gap-4">
        {anchor && (
          <div className="flex min-h-[5.75rem] flex-1 flex-col md:min-h-0">
            <ModeTile model={anchor} index={0} anchor />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:contents" data-testid="home-mode-tiles">
          {tiles.map((m, i) => (
            <ModeTile key={m.key} model={m} index={i + 1} />
          ))}
        </div>

        {extras.length > 0 && (
          <button
            type="button"
            data-testid="landing-cubes-more"
            aria-haspopup="dialog"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex h-11 w-[calc(100%-3.5rem)] md:w-full items-center gap-2.5 rounded-neo border-[3px] border-black bg-neo-navy-light px-2.5 text-start font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream shadow-hard transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
              'md:aspect-square md:h-auto md:flex-col md:justify-center md:gap-2 md:px-2 md:text-center',
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-neo border-2 border-black bg-neo-lime text-neo-navy md:h-12 md:w-12">
              <Sparkles className="h-4 w-4 md:h-6 md:w-6" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <span className="flex-1 truncate md:flex-none md:whitespace-normal md:text-sm md:leading-tight">{t('landing.moreGameModes')}</span>
            <span dir="ltr" className="rounded-full border-2 border-black bg-neo-lime px-2 py-0.5 text-xs leading-none text-neo-navy">+{extras.length}</span>
            <ChevronDown className="h-5 w-5 md:hidden" strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}
      </div>

      {extras.length > 0 && <MoreSheet extras={extras} open={moreOpen} onClose={() => setMoreOpen(false)} />}
    </section>
  );
}
