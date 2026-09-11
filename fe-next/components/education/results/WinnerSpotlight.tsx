/**
 * WinnerSpotlight — the payoff.
 *
 * Blooket ends a game on the word "Victory" and a character standing on a
 * plinth. Same instinct, louder: Lexi actually celebrates (a 2s trophy loop),
 * the room hears one short sting, and confetti fires on the winner's beat —
 * the moment the podium's first placard lands, not a frame before.
 *
 * CLASS-5 RULES, all of them, on purpose:
 *  - The bar is PAINTED at every stage. Waiting, it shows the trophy still and
 *    a drumroll line; revealed, it shows the name. Nothing enters from
 *    `opacity: 0`, nothing reserves an empty hole, and the projector layout
 *    does not move when the winner arrives.
 *  - Reduced motion swaps the video for its own poster still and fires no
 *    confetti — the celebration becomes a painted trophy, not a stalled one.
 *  - `bg-neo-navy-elevated` is hardcoded: this is a dark-only game surface, so
 *    the cream/dark pair that flashes cream on a lazy mount is never used.
 *
 * The sting and the confetti are ref-guarded to fire ONCE per mount: a results
 * screen re-renders every time a score payload settles, and a fanfare that
 * re-fires on each of those is the bug a teacher reports as "it screamed at us
 * four times".
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { fireRankConfetti, cleanupConfetti } from '@/utils/confettiUtils';
import { playRoundEndCue, ROUND_WIN_SOUND } from '@/lib/education/roundEndSound';

const TROPHY_STILL = '/mascot/teacher/badge-trophy.webp';
const TROPHY_LOOP = '/mascot/teacher/video/trophy-celebrate.mp4';

export interface WinnerSpotlightProps {
  /** The room's first place. Absent (a room nobody scored in) renders nothing. */
  winner?: { username: string; score: number };
  /** True from the winner's beat onward. */
  active: boolean;
  /**
   * Is the fanfare THIS screen's to play? The projector celebrates for the
   * whole room; a student phone only when its owner actually won. Thirty
   * phones firing one sting a third of a second apart is noise, not a
   * celebration — and twenty-nine of them would be cheering for someone else.
   * Default true: the wall, and every caller that is the room's one screen.
   */
  cue?: boolean;
  size?: 'card' | 'projector';
  t: (key: string, params?: Record<string, string | number>) => string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function WinnerSpotlight({
  winner,
  active,
  cue = true,
  size = 'card',
  t,
}: WinnerSpotlightProps) {
  const projector = size === 'projector';
  const { sfxMuted, sfxVolume } = useSoundEffects();
  const celebratedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const calm = prefersReducedMotion();

  useEffect(() => {
    if (!active || !winner || !cue || celebratedRef.current) return;
    celebratedRef.current = true;
    if (!calm) fireRankConfetti(1);
    audioRef.current = playRoundEndCue(ROUND_WIN_SOUND, {
      unlocked: true,
      muted: sfxMuted,
      volume: sfxVolume,
    });
  }, [active, winner, cue, calm, sfxMuted, sfxVolume]);

  // A rematch remounts this surface. Leave nothing of the last round running.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
      cleanupConfetti();
    },
    []
  );

  if (!winner) return null;

  return (
    <div
      data-testid="winner-spotlight"
      data-active={String(active)}
      className={cn(
        'flex items-center gap-4 rounded-neo border-[2px] border-neo-black shadow-hard',
        'bg-neo-navy-elevated text-neo-white',
        projector ? 'px-6 py-4 gap-6' : 'px-4 py-3'
      )}
    >
      {/* The mascot is the constant: it is on the wall before the name is, so
          the bar is never an empty rectangle waiting for content. */}
      <div
        className={cn(
          'shrink-0 overflow-hidden rounded-neo border-[2px] border-neo-black bg-neo-navy',
          projector ? 'w-28 h-28' : 'w-16 h-16'
        )}
      >
        {calm ? (
          // The still IS the video's own poster frame; routing it through
          // next/image would request a second, differently-encoded copy of an
          // asset the browser already has.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="winner-mascot-still"
            src={TROPHY_STILL}
            alt=""
            aria-hidden
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            data-testid="winner-mascot-video"
            src={TROPHY_LOOP}
            poster={TROPHY_STILL}
            autoPlay
            loop
            muted
            playsInline
            aria-hidden
            className="w-full h-full object-cover"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-neo-display font-black uppercase tracking-widest leading-none',
            active ? 'text-neo-yellow' : 'text-neo-white/40',
            projector ? 'text-3xl' : 'text-sm'
          )}
        >
          {active
            ? t('education.results.moment.winnerBanner')
            : t('education.results.moment.drumroll')}
        </p>
        {active && (
          <p
            className={cn(
              'mt-1 flex items-baseline gap-3 font-neo-display font-black text-neo-white truncate',
              projector ? 'text-5xl' : 'text-2xl'
            )}
          >
            <span className="truncate">{winner.username}</span>
            <span
              className={cn(
                'shrink-0 tabular-nums text-neo-lime',
                projector ? 'text-4xl' : 'text-xl'
              )}
            >
              {winner.score}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default WinnerSpotlight;
