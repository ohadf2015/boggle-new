'use client';

/**
 * The ONE hero button, bound to the recommended island (see `pickNextAction`):
 *   live game → "JOIN LIVE GAME"   · no class → "Join your class"
 *   next lesson → "PLAY · <lesson>" · review due → "REVIEW · Missed Words" (+ due badge)
 *   boss unlocked → "FIGHT THE BOSS" · workshop → "PLAY · Word Workshop"
 *   nothing assigned → solo practice
 * Solo practice otherwise lives in a small secondary medallion beside it.
 */

import Image from 'next/image';
import { m, useReducedMotion } from 'framer-motion';
import { Loader2, Play, Sparkles, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import type { ActiveGame } from '@/hooks/useActiveClassroomGame';
import type { AcademyIsland, NextActionKind } from './academyIslands';
import { INK_TEXT, Medallion, toneStyle, type Tone } from './chrome';

export type CtaKind = NextActionKind;

interface Props {
  kind: CtaKind;
  activeGame: ActiveGame | null;
  target: AcademyIsland | undefined;
  targetLabel: string;
  isJoining: boolean;
  joinError: string | null;
  onPress: () => void;
  reducedMotion: boolean;
  /** Desktop: a taller hero, centred under the map. */
  big?: boolean;
}

const ART: Partial<Record<CtaKind, string>> = {
  live: '/images/education/node-arena.webp',
  review: '/images/education/node-quiz.webp',
  boss: '/images/education/node-boss.webp',
  workshop: '/images/education/node-wordcraft.webp',
};

/** The hero's colour — the spotlight over the island wears the same one. */
export function ctaTone(kind: CtaKind): Tone {
  return kind === 'live' ? 'pink' : kind === 'join-class' || kind === 'solo' ? 'teal' : 'gold';
}

/**
 * The hero's lead word. The spotlight pointer over the recommended island says
 * the SAME word in the same gold, so the button and the island read as one.
 */
export function useCtaOverline(kind: CtaKind): string {
  const { t } = useLanguage();
  return kind === 'live'
      ? t('academy.student.liveNow', 'Live now')
      : kind === 'review'
        ? t('academy.student.ctaReview', 'Review')
        : kind === 'boss'
          ? t('academy.student.ctaBoss', 'Boss unlocked')
          : kind === 'join-class'
            ? t('academy.student.ctaStart', 'Start here')
            : kind === 'solo'
              ? t('academy.student.ctaSoloOver', 'Warm up')
              : t('academy.student.ctaPlay', 'Play');
}

export function AcademyCta({ kind, activeGame, target, targetLabel, isJoining, joinError, onPress, reducedMotion, big = false }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const osReduced = useReducedMotion();
  const still = reducedMotion || !!osReduced;
  const overline = useCtaOverline(kind);

  const title =
    kind === 'live'
      ? isJoining
        ? t('student.activeGame.joining', 'Joining...')
        : t('academy.student.ctaLive', 'Join live game')
      : kind === 'join-class'
        ? t('student.joinClassroom', 'Join a Classroom')
        : kind === 'review'
          ? targetLabel
          : kind === 'boss'
            ? t('academy.student.ctaBossTitle', 'Fight the boss')
            : kind === 'solo'
              ? t('student.dashboard.soloPractice', 'Solo Practice')
              : targetLabel;

  const sub =
    kind === 'live'
      ? t('student.activeGame.teacherStarted', '{teacher} started a classroom game', { teacher: activeGame?.teacherName ?? '' })
      : kind === 'join-class'
        ? t('academy.student.ctaJoinSub', 'Type the code from your teacher')
        : null;

  const tone = ctaTone(kind);
  const art = kind === 'next' ? `/images/education/node-${target?.type ?? 'lesson'}.webp` : ART[kind];

  return (
    <div className="relative">
      {joinError && (
        <p
          role="alert"
          className="absolute bottom-full mb-2 w-full rounded-neo border-3 border-neo-black bg-neo-red px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard"
        >
          {joinError}
        </p>
      )}
      <m.button
        type="button"
        data-testid="academy-cta"
        data-kind={kind}
        data-tone={tone}
        onClick={() => {
          sfx.playButtonClickSound?.();
          onPress();
        }}
        disabled={isJoining}
        className={cn(
          'relative flex w-full items-center gap-3 overflow-hidden rounded-[20px] border-3 border-neo-black ps-2 pe-2 text-start text-neo-black disabled:cursor-wait',
          big ? 'h-[92px] gap-4 ps-3 pe-3' : 'h-[68px] sm:h-[76px]',
        )}
        style={toneStyle(tone, { shadow: 5, trim: 2.5 })}
        animate={still ? undefined : { scale: [1, 1.025, 1] }}
        transition={still ? undefined : { duration: kind === 'live' ? 1 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
        whileTap={{ scaleX: 1.04, scaleY: 0.9, y: 3 }}
      >
        {/* Shine sweep — the hero catches the light. */}
        {!still && (
          <m.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-1/4 -skew-x-12 bg-white/45"
            initial={{ left: '-40%' }}
            animate={{ left: '140%' }}
            transition={{ duration: 1.4, repeat: Infinity, repeatDelay: kind === 'live' ? 0.5 : 2.2, ease: 'easeInOut' }}
          />
        )}
        <span className={cn('relative flex shrink-0 items-center justify-center', big ? 'h-20 w-20' : 'h-14 w-14 sm:h-16 sm:w-16')}>
          {art ? (
            <>
              <Image src={art} alt="" aria-hidden="true" fill priority unoptimized sizes="64px" className="object-contain drop-shadow-[2px_3px_0_#000]" />
              {target?.badge != null && (
                <span
                  className="absolute -top-1 -end-1"
                  aria-label={t('academy.student.reviewDueAria', '{count} words to review', { count: target.badge })}
                >
                  <Medallion tone="pink" size={24} shadow={1}>
                    <span className="font-neo-display text-xs font-black leading-none text-neo-white [text-shadow:0_1px_0_#000]">{target.badge}</span>
                  </Medallion>
                </span>
              )}
            </>
          ) : (
            <Medallion tone="night" size={48}>
              {kind === 'join-class' ? (
                <UserPlus className="h-6 w-6 text-neo-yellow" strokeWidth={2.5} />
              ) : (
                <Sparkles className="h-6 w-6 fill-neo-yellow text-neo-black" strokeWidth={2} />
              )}
            </Medallion>
          )}
        </span>
        <span className="relative min-w-0 flex-1">
          <span
            dir="auto"
            className={cn(
              'mb-0.5 inline-flex items-center gap-1 rounded-full border-2 border-neo-black px-2 font-neo-display text-[10px] font-black uppercase leading-4 tracking-widest',
              kind === 'live' ? 'bg-neo-black text-neo-lime' : 'bg-neo-black text-neo-yellow',
            )}
          >
            {kind === 'live' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neo-red" aria-hidden="true" />}
            {overline}
          </span>
          <span dir="auto" className={cn('block truncate font-neo-display font-black uppercase leading-none tracking-tight', big ? 'text-3xl' : 'text-xl sm:text-2xl')}>
            {title}
          </span>
          {sub && (
            <span dir="auto" className="mt-0.5 block truncate font-neo-body text-xs font-bold text-neo-black/75">
              {sub}
            </span>
          )}
        </span>
        <span className="relative flex shrink-0">
          <Medallion tone="night" size={big ? 58 : 46} shadow={2}>
            {isJoining ? (
              <Loader2 className="h-5 w-5 animate-spin text-neo-yellow" aria-hidden="true" />
            ) : (
              <DirectionalIcon icon={Play} mirror className={`h-5 w-5 fill-neo-yellow text-neo-black ${INK_TEXT}`} />
            )}
          </Medallion>
        </span>
      </m.button>
    </div>
  );
}
