'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { Gem, Lock, Pencil, Settings, Share2, Sparkles, Star, Shirt } from 'lucide-react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { PartThumb, type ThumbCategory } from '@/lib/avatar/catalog';
import { getConfigRarity, RARITY_TOKENS } from '@/lib/avatar/rarity';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { LevelRing } from '@/components/profile/LevelRing';
import { RankTierChip } from '@/components/seasons/RankTierChip';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import { StageBackdrop } from './StageBackdrop';
import { StageStatTile } from './StageStatTile';
import {
  getNextUnlock,
  getProfileTitleId,
  getRarestEquipped,
  getStageTheme,
  type HeadlineStat,
} from './profileShowcaseModel';

export interface ShowcaseStageProps {
  config: CustomAvatarConfig | null | undefined;
  /** Display name; '' when only an auto-generated username exists. */
  name: string;
  isPlaceholderName?: boolean;
  /** Public profiles show @handle under the name. */
  handle?: string | null;
  countryCode?: string | null;
  /** Own profile: replaces the flag with an editable country control. */
  countryNode?: React.ReactNode;
  /** Own profile: inline editor that replaces the name heading while editing. */
  nameEditor?: React.ReactNode;
  level: number;
  /** 0–100 progress to next level. */
  levelPercent: number;
  isMaxLevel?: boolean;
  xpToNext?: number | null;
  rankTier?: string | null;
  collection: { owned: number; total: number };
  stats: HeadlineStat[];
  isOwn: boolean;
  onEditAvatar?: () => void;
  onEditName?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  /** Overlay on the avatar (own: the compact edit pencil). */
  avatarBadge?: React.ReactNode;
  /** Rendered under the actions (own: the customize nudge). */
  footer?: React.ReactNode;
  /** Equipped profile-frame cosmetic id ('frame-gold'…); null/'frame-none' = none. */
  frameId?: string | null;
  /** Player's chosen accent for the level ring (null = default yellow). */
  ringColorHex?: string | null;
  /** Pre-formatted join date. */
  memberSince?: string | null;
  className?: string;
}

function CrestStars({ count, side }: { count: number; side: 'start' | 'end' }) {
  return (
    <div className={cn('flex items-center gap-0.5', side === 'start' ? 'flex-row-reverse' : 'flex-row')} aria-hidden>
      {Array.from({ length: 4 }, (_, i) => (
        <Star
          key={i}
          className={cn('w-4 h-4 sm:w-5 sm:h-5', i < count ? 'text-neo-white fill-neo-white' : 'text-neo-black/40 fill-neo-black/25')}
          strokeWidth={2.5}
          style={i < count ? { filter: 'drop-shadow(1px 1px 0 #000)' } : undefined}
        />
      ))}
    </div>
  );
}

/** Chip at the card foot: rarest equipped part, or (all-common) the next level unlock. */
function GearChip({ config, level }: { config: CustomAvatarConfig; level: number }) {
  const { t } = useLanguage();
  const rarest = getRarestEquipped(config);
  const next = rarest ? null : getNextUnlock(level);
  if (!rarest && !next) return null;
  const tok = RARITY_TOKENS[rarest ? rarest.rarity : next!.rarity];
  const thumb = rarest
    ? <PartThumb category={rarest.category as ThumbCategory} id={rarest.partId} config={config} size={30} />
    : next!.category === 'bgColor'
      ? <span className="block w-6 h-6 rounded-full border-2 border-neo-black" style={{ background: next!.partId }} />
      : <PartThumb category={next!.category as ThumbCategory} id={next!.partId} config={config} size={30} />;
  return (
    <div
      data-testid="stage-rarest"
      className="flex items-center gap-2 min-w-0 ps-1 pe-2.5 py-1 bg-neo-black/80 border-2 border-neo-black rounded-neo shadow-hard-sm"
    >
      <span className={cn('relative shrink-0 w-9 h-9 flex items-center justify-center rounded-neo border-2', tok.border, tok.bg)}>
        {thumb}
        {!rarest && (
          <Lock className="absolute -bottom-1 -end-1 w-3.5 h-3.5 p-0.5 bg-neo-yellow text-neo-black rounded-full border border-neo-black" strokeWidth={3} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex flex-col leading-tight">
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neo-white/70 truncate">
          {t(rarest ? 'profile.showcase.rarest' : 'profile.showcase.nextUnlock')}
        </span>
        <span className={cn('text-xs font-black uppercase tracking-wide truncate', tok.text)}>
          {rarest ? t(tok.labelKey) : t('profile.showcase.unlocksAt', { level: next!.level })}
        </span>
      </span>
    </div>
  );
}

function CollectionChip({ owned, total }: { owned: number; total: number }) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div
      data-testid="stage-collection"
      className="shrink-0 flex flex-col gap-1 px-2.5 py-1.5 bg-neo-black/80 border-2 border-neo-black rounded-neo shadow-hard-sm"
    >
      <span className="flex items-center gap-1 text-neo-cyan">
        <Gem className="w-3.5 h-3.5" strokeWidth={2.75} aria-hidden />
        <span className="text-xs font-black tabular-nums text-neo-white whitespace-nowrap">
          {t('profile.showcase.parts', { owned, total })}
        </span>
      </span>
      <span className="block h-1.5 w-full bg-neo-white/15 rounded-full overflow-hidden" aria-hidden>
        <span className="block h-full bg-neo-cyan rounded-full" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

/**
 * The profile "showcase stage": the first screen of /profile and /u/[username].
 * Presentational — containers (ProfileHeader, the public page, the lab harness)
 * resolve data and pass it in, so all three render the exact same thing.
 */
export function ShowcaseStage(props: ShowcaseStageProps): React.ReactElement {
  const {
    config: rawConfig, name, isPlaceholderName, handle, countryCode, countryNode, nameEditor,
    level, levelPercent, isMaxLevel, xpToNext, rankTier, collection, stats, isOwn,
    onEditAvatar, onEditName, onShare, onSettings, avatarBadge, footer, frameId, ringColorHex, memberSince, className,
  } = props;
  const { t } = useLanguage();
  const reduced = useReducedMotion();
  const config = (rawConfig ?? DEFAULT_AVATAR_CONFIG) as CustomAvatarConfig;
  const theme = useMemo(() => getStageTheme(getConfigRarity(config)), [config]);
  const titleId = getProfileTitleId(level);
  const shownName = isPlaceholderName || !name ? t('profile.showcase.unnamed') : name;

  return (
    <section aria-label={t('profile.showcase.stageLabel')} className={cn('relative flex flex-col gap-3', className)}>
      {/* ── Battle card ── */}
      <div className="relative h-[292px] md:h-[340px] me-[6px]" data-testid="showcase-card">
        <StageBackdrop theme={theme} />

        {/* Crest: rarity stars around the level medallion */}
        <div className="absolute top-2 inset-x-0 flex items-center justify-center gap-2 z-10">
          <CrestStars count={theme.stars} side="start" />
          <LevelRing
            percent={levelPercent}
            size={54}
            color="yellow"
            colorHex={ringColorHex}
            isMaxLevel={isMaxLevel}
            ariaLabel={`${t('profile.level')} ${level} · ${levelPercent}%`}
          >
            <div className="w-full h-full rounded-full bg-neo-black border-2 border-neo-black flex flex-col items-center justify-center leading-none">
              <span className="text-[8px] font-black uppercase tracking-[0.12em] text-neo-yellow/80">{t('profile.showcase.levelShort')}</span>
              <span data-testid="stage-level" className="font-neo-display font-black text-xl text-neo-white tabular-nums">{level}</span>
            </div>
          </LevelRing>
          <CrestStars count={theme.stars} side="end" />
        </div>

        {/* Avatar — idle-animated renderer, gentle float */}
        <div className="absolute inset-x-0 top-[70px] md:top-[76px] flex justify-center z-[5]">
          <m.div
            className="relative"
            animate={reduced ? undefined : { y: [0, -5, 0] }}
            transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div
              className={cn(
                'rounded-full border-4 border-neo-black shadow-hard-lg bg-neo-black w-[156px] h-[156px] md:w-[188px] md:h-[188px] overflow-hidden',
                frameId && frameId !== 'frame-none' && `avatar-${frameId}`,
              )}
              data-frame={frameId && frameId !== 'frame-none' ? frameId : undefined}
            >
              <AvatarRenderer config={config} size={188} circular className="w-full h-full" />
            </div>
            {avatarBadge}
          </m.div>
        </div>

        {/* Card foot: rarest gear + collection */}
        <div className="absolute inset-x-3 bottom-4 flex items-end justify-between gap-2 z-10">
          <GearChip config={config} level={level} />
          <CollectionChip owned={collection.owned} total={collection.total} />
        </div>
      </div>

      {/* ── Identity ── */}
      <div className="flex flex-col gap-1 px-1">
        {nameEditor ?? (
          <div className="flex items-center gap-2 min-w-0">
            <h1
              className={cn(
                'min-w-0 truncate font-neo-display font-black uppercase tracking-tight text-3xl md:text-4xl leading-none',
                isPlaceholderName ? 'text-neo-white/70' : 'text-neo-white',
              )}
            >
              {shownName}
            </h1>
            {countryNode ?? (countryCode ? <span className="text-2xl leading-none shrink-0" aria-label={countryCode}>{getCountryFlag(countryCode)}</span> : null)}
            {isOwn && onEditName && !isPlaceholderName && (
              <button type="button" onClick={onEditName} className="shrink-0 p-1 rounded-neo text-neo-white/60 hover:text-neo-white" title={t('profile.editName')} aria-label={t('profile.editName')}>
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neo-yellow text-neo-black border-2 border-neo-black rounded-neo text-[11px] font-black uppercase tracking-wide shadow-hard-sm">
            <Sparkles className="w-3 h-3" strokeWidth={3} aria-hidden />
            {t(`profile.showcase.titles.${titleId}`)}
          </span>
          {rankTier && rankTier !== 'stone' && <RankTierChip tier={rankTier} size="xs" />}
          {handle && <span className="text-sm text-neo-white/60 font-neo-body" dir="ltr">@{handle}</span>}
          <span className="text-xs text-neo-white/60 font-neo-body tabular-nums">
            {isMaxLevel ? t('profile.showcase.maxLevel') : xpToNext != null ? t('profile.showcase.xpToNext', { xp: xpToNext.toLocaleString(), level: level + 1 }) : null}
          </span>
          {memberSince && (
            <span className="text-xs text-neo-white/50 font-neo-body">{t('profile.showcase.memberSince', { date: memberSince })}</span>
          )}
        </div>
        {isOwn && isPlaceholderName && onEditName && (
          <button
            type="button"
            onClick={onEditName}
            className="self-start mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 bg-neo-pink text-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm text-xs font-black uppercase"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            {t('profile.showcase.setName')}
          </button>
        )}
      </div>

      {/* ── Headline stats ── */}
      {stats.length > 0 ? (
        <div
          className={cn(
            'grid gap-2',
            // The best word gets a wider column so a long word stays readable.
            stats[0]?.id === 'bestWord'
              ? stats.length >= 4 ? 'grid-cols-[1.7fr_1fr_1fr_1fr]' : stats.length === 3 ? 'grid-cols-[1.6fr_1fr_1fr]' : 'grid-cols-[1.4fr_1fr]'
              : stats.length >= 4 ? 'grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
          )}
        >
          {stats.map(s => <StageStatTile key={s.id} stat={s} />)}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm font-bold text-neo-white/80 bg-neo-navy-light border-2 border-dashed border-neo-white/25 rounded-neo">
          {t(isOwn ? 'profile.showcase.emptyStats' : 'profile.showcase.emptyStatsPublic')}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-stretch gap-2">
        {isOwn && onEditAvatar && (
          <button
            type="button"
            onClick={onEditAvatar}
            className="flex-1 min-w-0 min-h-12 inline-flex items-center justify-center gap-2 px-3 bg-neo-lime text-neo-black font-neo-display font-black uppercase tracking-wide text-sm sm:text-base whitespace-nowrap border-3 border-neo-black rounded-neo shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
          >
            <Shirt className="w-5 h-5" strokeWidth={2.5} aria-hidden />
            {t('profile.showcase.editAvatar')}
          </button>
        )}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className={cn(
              'min-h-12 inline-flex items-center justify-center gap-2 px-3 bg-neo-cyan text-neo-black font-neo-display font-black uppercase tracking-wide text-sm sm:text-base whitespace-nowrap border-3 border-neo-black rounded-neo shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform',
              isOwn ? 'shrink-0' : 'flex-1',
            )}
          >
            <Share2 className="w-5 h-5" strokeWidth={2.5} aria-hidden />
            {t(isOwn ? 'profile.showcase.share' : 'profile.showcase.shareProfile')}
          </button>
        )}
        {isOwn && onSettings && (
          <button
            type="button"
            onClick={onSettings}
            aria-label={t('profile.showcase.settings')}
            className="shrink-0 w-12 min-h-12 inline-flex items-center justify-center bg-neo-navy-light text-neo-white border-3 border-neo-black rounded-neo shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
          >
            <Settings className="w-5 h-5" aria-hidden />
          </button>
        )}
      </div>
      {footer}
    </section>
  );
}

export default ShowcaseStage;
