'use client';

import React, { memo, useCallback, useState } from 'react';
import Avatar from '@/components/Avatar';
import type { Avatar as AvatarType } from '@/types';
import { cn } from '@/lib/utils';
import { hashString } from '@/shared/types/customAvatar';
import type { AvatarMood } from '@/lib/avatar/avatarMood';
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
  /** The named face-off rival (avatar source). Name/score come from data.rival. */
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
const ACCENT: Record<BragAccent, { bg: string; text: string; on: string; ring: string }> = {
  lime: { bg: 'bg-neo-lime', text: 'text-neo-lime', on: 'text-black', ring: 'border-neo-lime' },
  pink: { bg: 'bg-neo-pink', text: 'text-neo-pink', on: 'text-white', ring: 'border-neo-pink' },
  cyan: { bg: 'bg-neo-cyan', text: 'text-neo-cyan', on: 'text-black', ring: 'border-neo-cyan' },
  purple: { bg: 'bg-neo-purple', text: 'text-neo-purple', on: 'text-white', ring: 'border-neo-purple' },
};

/** Situational expression pools — victors look triumphant/smug/fierce, the beaten
 * defeated/stunned/salty. Pick is deterministic (hash of name+score) so it's
 * varied across cards but stable per result — no flicker, no Math.random. */
const WINNER_MOODS: AvatarMood[] = ['win', 'emoteLaugh', 'emoteCool', 'streak'];
const LOSER_MOODS: AvatarMood[] = ['lose', 'wrong', 'emoteShock', 'emoteAngry'];

function pickMood(pool: AvatarMood[], seed: string): AvatarMood {
  return pool[hashString(seed) % pool.length];
}

/**
 * Screenshot-first "brag card" for multiplayer results, built as a FIGHT POSTER:
 * a named face-off (you vs your rival + "and N others") with a boast headline across
 * the top like a fight result, ONE hero number, and the play link printed as a footer
 * stamp. There is no Share button — a screenshot carries pixels, not share-text, so the
 * URL lives on the card. People share "I beat so-and-so", not a score, so EVERY outcome
 * names a rival: you won → the runner-up; you lost → the winner you're coming back for.
 */
function MpBragCardComponent({ data, current, opponent, modeLabel, shareUrl, onCopyLink, t, className }: MpBragCardProps) {
  const a = ACCENT[data.accent];
  const [copied, setCopied] = useState(false);

  const youLost = data.outcome === 'non_winner';
  const rival = data.rival;

  // Your face: a winner's unless you lost. The rival's face is the inverse of yours —
  // when you won they're crushed; when you lost they're the smug victor you're challenging.
  const currentMood = pickMood(youLost ? LOSER_MOODS : WINNER_MOODS, `${current.name}:${current.score}`);
  const rivalMood = rival
    ? pickMood(youLost ? WINNER_MOODS : LOSER_MOODS, `${rival.name}:${rival.score}`)
    : undefined;

  // The face-off scoreline IS the number for a plain points game, so the separate hero
  // box only earns its place for a DISTINCTIVE flex (combo / longest word). This kills
  // the in-card score-shown-twice dup and keeps the poster uncluttered.
  const showHeroBox = data.hero.kind !== 'points';

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
      {/* brand watermark strip */}
      <div className={cn('flex items-center justify-between px-3 py-1.5', a.bg)}>
        <span className={cn('font-neo-display text-[3cqw] font-bold tracking-wide', a.on)}>
          LEXICLASH
        </span>
        <span className={cn('font-neo-body text-[2.6cqw] font-bold uppercase tracking-widest', a.on)}>
          {modeLabel}
        </span>
      </div>

      <div className="flex flex-col items-center gap-3 px-4 py-5 text-center">
        {/* boast headline — the fight result, across the top */}
        <h2 className={cn('font-neo-display text-[6cqw] font-black uppercase leading-[0.95]', a.text)}>
          {t(data.headlineKey, data.headlineParams)}
        </h2>

        {/* the face-off: you vs your named rival */}
        <div className="flex w-full items-stretch justify-center gap-2">
          {/* YOU */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <div className={cn('rounded-full border-neo-thick p-0.5', a.ring)}>
              <Avatar
                customAvatar={current.avatar?.customAvatar}
                userId={current.name}
                size="2xl"
                mood={currentMood}
                tierMarker
              />
            </div>
            <span className="max-w-[26cqw] truncate font-neo-display text-[3.4cqw] font-black uppercase text-neo-white">
              {current.name}
            </span>
            <span className={cn('font-neo-display text-[6.5cqw] font-black leading-none tabular-nums', a.text)}>
              {current.score}
            </span>
          </div>

          {rival && (
            <>
              {/* VS clash */}
              <div className="flex flex-col items-center justify-center px-1">
                <span className="font-neo-display text-[5.5cqw] font-black italic text-neo-white drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                  VS
                </span>
                {data.othersCount > 0 && (
                  <span className={cn('mt-1 rounded-full border-neo border-black px-2 py-0.5 font-neo-body text-[2.4cqw] font-bold', a.bg, a.on)}>
                    {t('brag.others', { count: data.othersCount })}
                  </span>
                )}
              </div>

              {/* RIVAL — dimmed when they lost, full-strength (smug) when they beat you */}
              <div className={cn('flex flex-1 flex-col items-center gap-1', youLost ? '' : 'opacity-80')}>
                <div className="rounded-full border-neo-thick border-neo-white/30 p-0.5">
                  <Avatar
                    customAvatar={opponent?.avatar?.customAvatar}
                    userId={rival.name}
                    size="2xl"
                    mood={rivalMood}
                    disableEffects
                  />
                </div>
                <span className="max-w-[26cqw] truncate font-neo-body text-[3cqw] font-bold uppercase text-neo-white/70">
                  {rival.name}
                </span>
                <span className="font-neo-display text-[5.5cqw] font-bold leading-none tabular-nums text-neo-white/50">
                  {rival.score}
                </span>
              </div>
            </>
          )}
        </div>

        {/* one hero stat — only for a distinctive flex (combo / longest word);
            a plain points game's number already lives in the scoreline above. */}
        {showHeroBox && (
          <div className={cn('w-full rounded-neo border-neo-thick border-black px-3 py-3 shadow-hard', a.bg)}>
            <div className={cn('font-neo-display text-[9cqw] font-black leading-none', a.on)}>
              {data.hero.primary}
            </div>
            <div className={cn('mt-1 font-neo-body text-[2.6cqw] font-bold uppercase tracking-widest', a.on)}>
              {t(data.hero.labelKey)}
            </div>
          </div>
        )}

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
