'use client';

import React, { memo, useCallback, useState } from 'react';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarType } from '@/types';
import { cn } from '@/lib/utils';
import type { BragCardData, BragAccent } from '@/lib/results/bragCard';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface BragPlayer {
  name: string;
  avatar?: AvatarType;
  score: number;
}

interface MpBragCardProps {
  data: BragCardData;
  current: BragPlayer;
  opponent?: BragPlayer;
  /** Mode label already localized (e.g. "Word Hunt"). */
  modeLabel: string;
  /** The play/challenge URL printed on the card and copied by the Copy-link tap. */
  shareUrl: string;
  /** Fires when the player taps Copy-link (the one directly-measurable share action). */
  onCopyLink?: () => void;
  t: TFunction;
  className?: string;
}

/** accent family → tailwind tokens. Bright accents (lime/cyan) take black ink,
 * saturated ones (pink/purple) take white. The card carries the accent itself, so
 * the avatar needs no mode-frame ring. */
const ACCENT: Record<BragAccent, { bg: string; text: string; on: string }> = {
  lime: { bg: 'bg-neo-lime', text: 'text-neo-lime', on: 'text-black' },
  pink: { bg: 'bg-neo-pink', text: 'text-neo-pink', on: 'text-white' },
  cyan: { bg: 'bg-neo-cyan', text: 'text-neo-cyan', on: 'text-black' },
  purple: { bg: 'bg-neo-purple', text: 'text-neo-purple', on: 'text-white' },
};

/**
 * Screenshot-first "brag card" for multiplayer results. There is no Share button —
 * the card is built to be screenshotted, so the link is PRINTED on it (a screenshot
 * carries pixels, not share-text). Self-contained framing: avatars + rivalry
 * headline + ONE hero stat + printed link.
 */
function MpBragCardComponent({ data, current, opponent, modeLabel, shareUrl, onCopyLink, t, className }: MpBragCardProps) {
  const a = ACCENT[data.accent];
  const headToHead = data.outcome === 'winner_2p' && !!opponent;
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the printed link on the card still does the job */
    }
    onCopyLink?.();
  }, [shareUrl, onCopyLink]);

  return (
    <div
      dir={data.isRTL ? 'rtl' : 'ltr'}
      data-testid="mp-brag-card"
      className={cn(
        '@container/brag relative mx-auto w-full max-w-sm overflow-hidden',
        'rounded-neo border-neo-thick border-black bg-neo-navy shadow-hard-lg',
        className
      )}
    >
      {/* top accent strip + mode badge */}
      <div className={cn('flex items-center justify-between px-3 py-1.5', a.bg)}>
        <span className={cn('font-neo-display text-[3cqw] font-bold tracking-wide', a.on)}>
          LEXICLASH
        </span>
        <span className={cn('font-neo-body text-[2.6cqw] font-bold uppercase tracking-widest', a.on)}>
          {modeLabel}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 px-4 py-5 text-center">
        {/* rivalry avatars */}
        <div className="flex items-end justify-center gap-3">
          <div className="flex flex-col items-center gap-1">
            <Avatar
              customAvatar={current.avatar?.customAvatar}
              userId={current.name}
              size="2xl"
              mood={data.outcome === 'non_winner' ? 'emoteWink' : 'win'}
              tierMarker
            />
            <span className="max-w-[22cqw] truncate font-neo-display text-[3.2cqw] font-bold text-neo-white">
              {current.name}
            </span>
            <span className={cn('font-neo-display text-[4.5cqw] font-extrabold leading-none', a.text)}>
              {current.score}
            </span>
          </div>

          {headToHead && opponent && (
            <>
              <span className="pb-8 font-neo-display text-[4cqw] font-black text-neo-white/60">VS</span>
              <div className="flex flex-col items-center gap-1 opacity-80">
                <Avatar
                  customAvatar={opponent.avatar?.customAvatar}
                  userId={opponent.name}
                  size="xl"
                  disableEffects
                />
                <span className="max-w-[22cqw] truncate font-neo-body text-[2.8cqw] font-semibold text-neo-white/70">
                  {opponent.name}
                </span>
                <span className="font-neo-display text-[3.4cqw] font-bold leading-none text-neo-white/60">
                  {opponent.score}
                </span>
              </div>
            </>
          )}
        </div>

        {/* headline */}
        <h2 className="font-neo-display text-[5.2cqw] font-extrabold uppercase leading-tight text-neo-white">
          {t(data.headlineKey, data.headlineParams)}
        </h2>

        {/* one hero stat */}
        <div className={cn('w-full rounded-neo border-neo-thick border-black px-3 py-3 shadow-hard', a.bg)}>
          <div className={cn('font-neo-display text-[9cqw] font-black leading-none', a.on)}>
            {data.hero.primary}
          </div>
          <div className={cn('mt-1 font-neo-body text-[2.6cqw] font-bold uppercase tracking-widest', a.on)}>
            {t(data.hero.labelKey)}
          </div>
        </div>

        {/* printed link — the viral loop carrier (a screenshot has no share-text,
            so the URL must live in the pixels). Tappable = the one measurable
            share action (Copy link). */}
        <button
          type="button"
          onClick={handleCopy}
          data-testid="brag-copy-link"
          className="w-full rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 text-center transition active:translate-y-px"
        >
          <div className={cn('font-neo-display text-[4cqw] font-extrabold', a.text)}>lexiclash.live</div>
          <div className="font-neo-body text-[2.4cqw] font-semibold text-neo-white/60">
            {copied ? t('brag.copied') : t('brag.cta')}
          </div>
        </button>
      </div>

      {/* screenshot hint (sits OUTSIDE the brag frame visually via muted strip) */}
      <div className="border-t-neo border-black bg-black/30 py-1.5 text-center">
        <span className="font-neo-body text-[2.6cqw] font-semibold text-neo-white/70">
          📸 {t('brag.screenshotHint')}
        </span>
      </div>
    </div>
  );
}

export const MpBragCard = memo(MpBragCardComponent);
export default MpBragCard;
