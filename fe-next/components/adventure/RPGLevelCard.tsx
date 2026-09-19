'use client';

import { memo } from 'react';
import { Star, Lock, Play, Crown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LevelKind } from '@/lib/adventure/play/levels';
import { ThreatPips } from './play/variants/KindBadge';
import { KIND_META } from './play/variants/levelKinds';
import { NODE_SHAPE, LABEL, nodeSize, type NodeStatus } from './play/variants/trailLayout';
import TrailNodeShape from './play/variants/TrailNodeShape';

interface RPGLevelCardProps {
  levelNum: number;
  stars: number;
  maxStars: number;
  kind: LevelKind;
  status: NodeStatus;
  isPerfect: boolean;
  /** 1-5 difficulty pips. */
  threat: number;
  /** Which side of the node has room for the label ('plate' = elite/boss nameplate). */
  labelSide: 'left' | 'right' | 'plate';
  onClick: () => void;
  /** Enemy portrait for elite/boss nodes. */
  enemyArt?: string;
  /** Enemy name on elite/boss labels. */
  enemyName?: string;
}

/**
 * RPGLevelCard — one node on the world trail. The silhouette + colour + icon say
 * the level kind at a glance; elite/boss are big nodes wearing the enemy portrait.
 * Fills its (absolutely positioned) parent; the label hangs off the open side.
 */
const RPGLevelCard = memo(function RPGLevelCard({
  levelNum, stars, maxStars, kind, status, isPerfect, threat, labelSide, onClick, enemyArt, enemyName,
}: RPGLevelCardProps) {
  const { t } = useLanguage();
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const shape = NODE_SHAPE[kind];
  const big = kind === 'elite' || kind === 'boss';
  const locked = status === 'locked';
  const current = status === 'current';
  const kindLabel = t(`adventurePlay.variety.kind.${kind}`);
  const select = locked ? undefined : onClick;
  const size = nodeSize(kind);
  const plateW = kind === 'boss' ? LABEL.plateW.boss : LABEL.plateW.elite;
  const plateOverlap = kind === 'boss' ? LABEL.plateOverlap.boss : LABEL.plateOverlap.elite;

  return (
    <div
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-disabled={locked}
      aria-label={locked
        ? t('adventure.levelLocked', { level: levelNum })
        : kind === 'boss'
          ? t('adventure.bossLevel', { level: levelNum })
          : t('adventure.playLevel', { level: levelNum, stars, maxStars })}
      onClick={select}
      onKeyDown={select ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } } : undefined}
      data-testid={`level-card-${levelNum}`}
      data-kind-node={kind}
      data-shape={shape}
      data-status={status}
      data-big={big}
      className={cn('trail-node group relative h-full w-full select-none outline-none',
        locked ? 'cursor-not-allowed' : 'cursor-pointer', current && 'trail-node--current')}
    >
      {current && <span aria-hidden className="trail-node-ring" style={{ borderColor: meta.hex }} />}

      <div className="trail-node-body relative h-full w-full">
        <TrailNodeShape shape={shape} fill={locked ? '#2a3150' : meta.hex} art={big ? enemyArt : undefined}
          greyArt={locked} className="absolute inset-0 h-full w-full" />

        {!big && (
          <span className={cn('absolute inset-0 grid place-items-center', shape === 'bomb' && 'pt-[14%]', shape === 'cloud' && 'pt-[6%]')}>
            {locked
              ? <Lock data-testid="lock-icon" className="h-[36%] w-[36%] text-white/70" strokeWidth={3} />
              : <Icon className="h-[42%] w-[42%] text-black" strokeWidth={2.75} aria-hidden />}
          </span>
        )}
        {big && locked && (
          <span className="absolute inset-0 grid place-items-center">
            <Lock data-testid="lock-icon" className="h-[26%] w-[26%] text-white drop-shadow-[2px_2px_0_#000]" strokeWidth={3} />
          </span>
        )}

        {/* level number plate (big nodes carry it in their ribbon) */}
        {!big && (
          <span data-testid="level-number"
            className="absolute bottom-[-4%] start-[-4%] grid h-[40%] min-w-[40%] place-items-center rounded-md border-[3px] border-black bg-neo-cream font-neo-display text-[clamp(13px,4.2cqw,26px)] font-black leading-none text-black shadow-[2px_2px_0_#000]">
            {levelNum}
          </span>
        )}

        {status === 'cleared' && (
          <span data-testid="path-cleared" title={t('adventurePlay.variety.pathCleared')}
            className={cn('absolute top-[-6%] end-[-6%] grid place-items-center rounded-full border-[3px] border-black bg-neo-lime text-black shadow-[2px_2px_0_#000]',
              big ? 'h-[24%] w-[24%]' : 'h-[38%] w-[38%]')}>
            <Check className="h-[65%] w-[65%]" strokeWidth={4} />
          </span>
        )}
        {isPerfect && !locked && (
          <span data-testid="crown-badge"
            className={cn('absolute top-[-8%] start-[-2%] grid place-items-center rounded-full border-[3px] border-black bg-neo-yellow text-black shadow-[2px_2px_0_#000]',
              big ? 'h-[22%] w-[22%]' : 'h-[34%] w-[34%]')}>
            <Crown className="h-[62%] w-[62%]" strokeWidth={3} />
          </span>
        )}
      </div>

      {current && (
        <span className={cn('absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap', big ? 'bottom-[calc(100%+16px)]' : 'bottom-[calc(100%+6px)]', 'rounded-md border-[3px] border-black bg-neo-lime px-1.5 py-0.5 text-black shadow-[2px_2px_0_#000]')}>
          <span className="flex items-center gap-1 text-[clamp(10px,2.8cqw,16px)] font-black uppercase leading-none tracking-wide">
            <Play data-testid="play-icon" className="h-[1.1em] w-[1.1em] fill-black" />
            {t('adventurePlay.variety.youAreHere')}
          </span>
        </span>
      )}

      {big ? (
        <>
          {/* ribbon: kind + stars across the top edge (big nodes read as max threat by size) */}
          <div className="absolute left-1/2 top-[-9%] z-10 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md border-[3px] border-black px-1.5 py-0.5 shadow-[2px_2px_0_#000]"
            style={{ backgroundColor: locked ? '#2a3150' : meta.hex }}>
            <span data-testid="level-number" className="-my-0.5 -ms-1 grid min-w-[1.5em] place-items-center self-stretch rounded-[4px] bg-neo-cream px-1 font-neo-display text-[clamp(11px,3.2cqw,19px)] font-black leading-none text-black">{levelNum}</span>
            <span className="font-neo-display text-[clamp(10px,2.9cqw,17px)] font-black uppercase leading-none tracking-wide text-black">{kindLabel}</span>
            <Stars stars={stars} maxStars={maxStars} dark />
          </div>
          {/* nameplate across the foot */}
          <div dir="auto" className="absolute left-1/2 z-10 -translate-x-1/2 rounded-lg border-[3px] border-black bg-[#0f1b3d] px-1.5 py-1 text-center shadow-[3px_3px_0_#000]"
            style={{ top: `${((size - plateOverlap) / size) * 100}%`, width: `${(plateW / size) * 100}%` }}>
            <div className="font-neo-display text-[clamp(12px,3.4cqw,20px)] font-black uppercase leading-[1.05] text-neo-cream line-clamp-2">
              {enemyName ?? kindLabel}
            </div>
          </div>
        </>
      ) : (
        <div dir="auto" className={cn('absolute top-1/2 z-10 -translate-y-1/2 rounded-lg border-[3px] border-black bg-[#0f1b3d] px-1.5 py-1 shadow-[3px_3px_0_#000]', locked && 'opacity-75')}
          style={{ width: `${(LABEL.w / size) * 100}%`, [labelSide === 'left' ? 'right' : 'left']: `calc(100% + ${(LABEL.gap / size) * 100}%)` }}>
          <div className="font-neo-display text-[clamp(11px,3.4cqw,20px)] font-black uppercase leading-[1.05] tracking-wide"
            style={{ color: locked ? '#9aa3c7' : meta.hex }}>
            {kindLabel}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <Stars stars={stars} maxStars={maxStars} />
            <ThreatPips threat={threat} label={t('adventurePlay.variety.threat', { threat })} />
          </div>
        </div>
      )}
    </div>
  );
});

function Stars({ stars, maxStars, dark }: { stars: number; maxStars: number; dark?: boolean }) {
  return (
    <span className="flex items-center">
      {Array.from({ length: maxStars }).map((_, i) => (
        <Star key={i} data-testid={i < stars ? 'star-filled' : 'star-empty'}
          className={cn('h-[clamp(11px,3cqw,18px)] w-[clamp(11px,3cqw,18px)]',
            i < stars ? 'text-black fill-neo-yellow' : dark ? 'text-black/60 fill-transparent' : 'text-white/40 fill-white/5')} strokeWidth={2.5} />
      ))}
    </span>
  );
}

export default RPGLevelCard;
