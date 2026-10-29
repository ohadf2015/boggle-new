'use client';

import { useState, type CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bot, Lock, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CUBE_BLUR_DATA_URL, type ModeCubeModel, type ModeCubeVariant, type ModeTag } from '@/lib/landing/modeMeta';
import ModeResumeChip from '../ModeResumeChip';
import { useHomeLaunch } from './HomeLaunch';
import styles from './HomeModeGrid.module.css';

/** banner: the live race. poster: a solo run. row: a quiet puzzle or preview. */
export type TileVariant = 'banner' | 'poster' | 'row';

const TINT: Record<ModeCubeVariant, { shadow: string; chip: string; ring: string; glow: string; border: string }> = {
  pink: { shadow: 'shadow-hard-pink', chip: 'bg-neo-pink text-neo-navy', ring: 'focus-visible:ring-neo-pink', glow: 'rgba(255,20,147,0.42)', border: 'border-neo-pink' },
  cyan: { shadow: 'shadow-hard-cyan', chip: 'bg-neo-cyan text-neo-navy', ring: 'focus-visible:ring-neo-cyan', glow: 'rgba(0,255,255,0.34)', border: 'border-neo-cyan' },
  purple: { shadow: 'shadow-hard-purple', chip: 'bg-neo-purple text-neo-black', ring: 'focus-visible:ring-neo-purple', glow: 'rgba(139,92,246,0.5)', border: 'border-neo-purple' },
  orange: { shadow: 'shadow-hard-orange', chip: 'bg-neo-orange text-neo-navy', ring: 'focus-visible:ring-neo-orange', glow: 'rgba(255,107,53,0.42)', border: 'border-neo-orange' },
  lime: { shadow: 'shadow-hard-lime', chip: 'bg-neo-lime text-neo-navy', ring: 'focus-visible:ring-neo-lime', glow: 'rgba(191,255,0,0.36)', border: 'border-neo-lime' },
  blue: { shadow: 'shadow-hard-blue', chip: 'bg-blue-500 text-neo-black', ring: 'focus-visible:ring-blue-400', glow: 'rgba(59,130,246,0.42)', border: 'border-blue-500' },
};

const BADGE_CLASS =
  'w-fit rounded-full border-2 border-black px-1.5 py-0.5 font-neo-display font-black uppercase leading-none shadow-hard-sm';

/** Literal keys (not a template) so i18n key guards can see every one. */
const TAG_LABEL_KEY: Record<ModeTag['players'], string> = {
  solo: 'landing.home.modeTag.solo',
  multiplayer: 'landing.home.modeTag.multiplayer',
  vsBot: 'landing.home.modeTag.vsBot',
};
const TAG_ICON = { solo: User, multiplayer: Users, vsBot: Bot } as const;

/** "Solo" / "Multiplayer" / "vs bot" chip; "· No timer" joins it from md up. */
function ModeTagChip({ tag, compact = false }: { tag: ModeTag; compact?: boolean }) {
  const { t } = useLanguage();
  const Icon = TAG_ICON[tag.players];
  return (
    <span
      data-testid="mode-tag"
      title={compact ? t(TAG_LABEL_KEY[tag.players]) : undefined}
      className={cn(
        'inline-flex w-fit max-w-full items-center gap-1 rounded-full border border-neo-cream/35 bg-black/45 py-0.5 font-neo-body text-[0.68rem] font-bold leading-none text-neo-cream md:px-1.5',
        compact ? 'px-1' : 'px-1.5',
      )}
    >
      <Icon className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className={cn('truncate', compact && 'max-md:sr-only')}>{t(TAG_LABEL_KEY[tag.players])}</span>
      {tag.untimed && (
        <span className="hidden truncate md:inline">
          <span aria-hidden="true">· </span>
          {t('landing.home.modeTag.untimed')}
        </span>
      )}
    </span>
  );
}

const SHELL: Record<TileVariant, string> = {
  banner: 'block min-h-[8.5rem] bg-neo-navy md:flex md:min-h-[9.5rem] md:items-stretch md:gap-5 md:bg-neo-navy-light md:p-3',
  poster: 'flex h-[5.5rem] flex-row items-center gap-2.5 bg-neo-navy-light p-2 md:h-auto md:flex-col md:items-stretch md:gap-3 md:p-2.5',
  row: 'flex min-h-[4.75rem] flex-row items-center gap-3 bg-neo-navy-light p-2',
};

const ART_WINDOW: Record<TileVariant, string> = {
  banner: 'absolute inset-0 md:relative md:inset-auto md:w-[19rem] md:shrink-0 md:overflow-hidden md:rounded-neo md:border-2 md:border-neo-cream/40 md:bg-neo-navy',
  poster: 'relative h-[3.875rem] w-[3.875rem] shrink-0 overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy md:h-auto md:w-full md:aspect-[8/7]',
  row: 'relative h-[3.5rem] w-[3.5rem] shrink-0 overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy md:h-[4.5rem] md:w-[4.5rem]',
};

const ART_SIZES: Record<TileVariant, string> = {
  banner: '(max-width: 768px) 100vw, 320px',
  poster: '(max-width: 768px) 25vw, 280px',
  row: '72px',
};

interface ModeTileProps {
  model: ModeCubeModel;
  /** position on the page: drives the load stagger and the idle-bob phase */
  index: number;
  /** position inside its group: drives the scroll-reveal cascade */
  slot?: number;
  variant: TileVariant;
}

export function ModeTile({ model, index, slot = 0, variant }: ModeTileProps) {
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const launch = useHomeLaunch();
  const tint = TINT[model.variant];
  const locked = !!model.locked;
  const banner = variant === 'banner';
  const [imgFailed, setImgFailed] = useState(false);
  const hasArt = !!model.genIcon && !imgFailed;
  // A run in progress is the more useful thing to say than "new": one chip per tile.
  const showRun = !!model.resume && !locked;
  const badge = model.badge && !showRun ? t(`landing.badge.${model.badge.toLowerCase()}`, model.badge) : null;
  const badgeTone = model.featured ? cn('bg-neo-lime text-neo-navy px-2.5 py-1 text-xs md:text-sm', styles.featuredBadge) : cn('text-[0.65rem]', tint.chip);

  return (
    <Link
      href={locked ? '#' : model.href}
      prefetch={false}
      data-testid={banner && model.role === 'anchor' ? 'mode-cube-anchor' : 'mode-cube'}
      data-cube-key={model.key}
      data-featured={model.featured || undefined}
      aria-disabled={locked || undefined}
      onPointerEnter={() => !locked && launch?.prefetch(model.href)}
      onClick={(e) => {
        if (locked) {
          e.preventDefault();
          return;
        }
        model.onClick();
        launch?.start(e, { href: model.href, tone: model.variant, title: model.title, art: model.genIcon });
      }}
      style={{ '--i': index, '--j': slot, '--art-scale': model.imgScale ?? 1, '--cube-glow': tint.glow } as CSSProperties}
      className={cn(
        'group relative overflow-hidden rounded-neo border-[3px]',
        styles.tile,
        tint.border,
        tint.shadow,
        SHELL[variant],
        'transition-[transform,box-shadow,border-color] duration-150 ease-out hover:border-neo-cream/80 motion-safe:hover:-translate-y-0.5',
        'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none motion-reduce:transition-[border-color]',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        tint.ring,
        model.highlighted && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
        locked && 'cursor-not-allowed',
      )}
    >
      {hasArt ? (
        <span data-testid={banner ? undefined : 'mode-tile-art'} className={ART_WINDOW[variant]}>
          <span className={cn('absolute inset-0', banner && styles.zoom)}>
            <Image
              src={model.genIcon as string}
              alt=""
              fill
              placeholder="blur"
              blurDataURL={CUBE_BLUR_DATA_URL}
              sizes={ART_SIZES[variant]}
              onError={() => setImgFailed(true)}
              className={cn('object-cover', styles.art)}
            />
          </span>
        </span>
      ) : (
        <span className={cn('flex items-center justify-center rounded-neo border-2 border-black', tint.chip, banner ? 'absolute start-2 top-2 h-9 w-9 md:static md:h-full md:w-[19rem] md:shrink-0' : 'h-[3.5rem] w-[3.5rem] shrink-0 md:h-[3.875rem] md:w-[3.875rem]')}>
          <model.Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}
      {banner && (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-neo-navy via-neo-navy/70 to-transparent md:hidden" />
      )}

      {banner && badge && (
        <span className={cn('absolute end-1.5 top-1.5 z-[2] md:hidden', BADGE_CLASS, badgeTone)}>{badge}</span>
      )}
      {showRun && model.resume && <ModeResumeChip resume={model.resume} anchor={banner} />}

      {banner ? (
        <>
          <span className="absolute inset-0 z-[2] flex flex-col justify-end p-3 pe-14 md:static md:inset-auto md:flex-1 md:justify-center md:gap-1 md:p-0">
            <span className="mb-1.5 flex flex-wrap items-center gap-1.5 md:mb-0">
              {badge && <span className={cn('hidden md:inline-flex', BADGE_CLASS, badgeTone)}>{badge}</span>}
              {model.tag && <ModeTagChip tag={model.tag} />}
            </span>
            <span className="font-neo-display text-2xl font-black leading-none tracking-tight text-neo-white md:text-4xl">{model.title}</span>
            {model.description && (
              <span data-testid="mode-banner-hook" className={cn('mt-1 max-w-[44ch] font-neo-body leading-snug text-neo-cream/90 md:block md:text-base', model.featured ? 'line-clamp-2 text-[0.8rem]' : 'hidden')}>{model.description}</span>
            )}
            {model.livePill && (
              <span className="mt-1.5 inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-black bg-neo-lime px-2 py-0.5 font-neo-display text-xs font-black text-neo-navy shadow-hard-sm md:mt-2 md:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-70 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-navy" />
                </span>
                {model.livePill}
              </span>
            )}
          </span>
          <span className="absolute bottom-3 end-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-neo-lime text-neo-navy shadow-hard-sm transition-transform group-hover:translate-x-0.5 md:static md:me-3 md:h-14 md:w-14 md:shrink-0 md:self-center rtl:group-hover:-translate-x-0.5">
            <Arrow className="h-5 w-5 md:h-7 md:w-7" strokeWidth={3} aria-hidden="true" />
          </span>
        </>
      ) : (
        <>
          <span data-testid="mode-tile-label" className={cn('flex min-w-0 flex-1 flex-col items-start justify-center gap-1', variant === 'poster' && 'md:justify-start md:pe-7')}>
            <span
              className={cn('line-clamp-2 max-w-full font-neo-display font-black leading-[1.1] text-neo-white', variant === 'poster' ? 'text-[0.9rem] md:text-lg' : 'text-base')}
              style={{ textWrap: 'balance' } as CSSProperties}
            >
              {model.title}
            </span>
            {(badge || model.tag) && (
              <span className="flex max-w-full flex-wrap items-center gap-1">
                {badge && <span className={cn(BADGE_CLASS, 'text-[0.6rem] md:text-[0.65rem]', tint.chip)}>{badge}</span>}
                {model.tag && <ModeTagChip tag={model.tag} compact={variant === 'poster'} />}
              </span>
            )}
            {model.description && (
              <span
                data-testid="mode-tile-desc"
                className={cn('font-neo-body text-[0.78rem] leading-snug text-neo-cream/85 md:text-sm', variant === 'poster' ? 'hidden md:line-clamp-2' : 'line-clamp-2')}
              >
                {model.description}
              </span>
            )}
          </span>
          {!locked && (
            <Arrow
              aria-hidden="true"
              className={cn(
                'h-4 w-4 shrink-0 text-neo-cream/50 motion-safe:transition-[transform,color] motion-safe:duration-200 group-hover:text-neo-cream motion-safe:group-hover:translate-x-1 rtl:motion-safe:group-hover:-translate-x-1',
                variant === 'poster' && 'max-md:hidden md:absolute md:bottom-3 md:end-3',
              )}
              strokeWidth={3}
            />
          )}
        </>
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
