'use client';

import { useEffect, useRef, useState } from 'react';
import { useSkipAnimations } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';

/*
 * The practice buddy: the house marshmallow knight, live beside the round.
 *
 * It breathes while it waits, leans in and nods with every keystroke, and
 * answers each verdict with one of the hand-animated clips from
 * public/mascot/anim that had only ever played in solo Blast: a star-burst
 * joy jump for a right answer, a faceplant that bounces back with a thumbs-up
 * for a miss (encouraging, never sad), and a puffed-chest strut when a streak
 * hits a new stage.
 *
 * Each clip is fetched once as a blob and replayed from a fresh object URL,
 * so a one-shot animated webp restarts from frame one on every answer without
 * downloading it again. With reduced motion or on a low-end device nothing is
 * fetched: the buddy holds a still pose per reaction and never moves.
 */

export type BuddyReactionKind = 'correct' | 'miss' | 'streak';

export interface BuddyReaction {
  kind: BuddyReactionKind;
  /** Changes on every answer, so two right answers in a row both play. */
  id: number;
}

interface ClipSpec {
  src: string;
  ms: number;
  /** Still shown instead of the clip when motion is skipped. */
  still: string;
}

export const BUDDY_CLIPS: Record<BuddyReactionKind, ClipSpec> = {
  correct: { src: '/mascot/anim/joy-jump.webp', ms: 2650, still: '/mascot/bridge-cheer-nobg.webp' },
  miss: { src: '/mascot/anim/faceplant-thumbsup.webp', ms: 2900, still: '/mascot/bridge-oops-nobg.webp' },
  streak: { src: '/mascot/anim/puffed-chest-smug.webp', ms: 2900, still: '/mascot/anim/puffed-chest-smug-poster.webp' },
};

/** The resting pose: the joy-jump clip's first frame, a plain happy face. */
export const BUDDY_IDLE = '/mascot/anim/joy-jump-poster.webp';

interface PracticeBuddyProps {
  reaction: BuddyReaction | null;
  /** The student has letters in the box. */
  typing: boolean;
  /** Bumps on every keystroke; each bump is one nod. */
  typingTick: number;
  className?: string;
}

export function PracticeBuddy({ reaction, typing, typingTick, className }: PracticeBuddyProps) {
  const skip = useSkipAnimations();
  const blobs = useRef<Partial<Record<BuddyReactionKind, Blob>>>({});
  const [playing, setPlaying] = useState<{ kind: BuddyReactionKind; src: string; id: number } | null>(null);

  // Warm the three clips once, after first paint. Skipped entirely when motion is off.
  useEffect(() => {
    if (skip || typeof fetch !== 'function' || typeof URL.createObjectURL !== 'function') return;
    let cancelled = false;
    const kinds = Object.keys(BUDDY_CLIPS) as BuddyReactionKind[];
    const timer = setTimeout(() => {
      for (const kind of kinds) {
        fetch(BUDDY_CLIPS[kind].src)
          .then((r) => (r.ok ? r.blob() : null))
          .then((b) => {
            if (b && !cancelled) blobs.current[kind] = b;
          })
          .catch(() => undefined);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [skip]);

  useEffect(() => {
    if (!reaction) return;
    const spec = BUDDY_CLIPS[reaction.kind];
    let objectUrl: string | null = null;
    let src = spec.still;
    if (!skip) {
      const blob = blobs.current[reaction.kind];
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        src = objectUrl;
      } else {
        src = spec.src;
      }
    }
    setPlaying({ kind: reaction.kind, src, id: reaction.id });
    const timer = setTimeout(() => setPlaying(null), skip ? 1400 : spec.ms);
    return () => {
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reaction, skip]);

  const mood = playing ? playing.kind : typing ? 'typing' : 'idle';

  return (
    <div
      data-testid="practice-buddy"
      data-mood={mood}
      aria-hidden="true"
      className={cn('pointer-events-none relative flex flex-col items-center justify-end [--lc-buddy-lean:-7deg] rtl:[--lc-buddy-lean:7deg]', className)}
    >
      {/* Streak stage: a ring of light pulses behind the strut. */}
      {mood === 'streak' && (
        <span className="absolute inset-x-[8%] bottom-[12%] top-[8%] rounded-full bg-neo-yellow/30 motion-safe:animate-[lc-buddy-glow_900ms_ease-in-out_infinite]" />
      )}
      <div
        className={cn(
          'relative size-full origin-bottom',
          mood === 'idle' && 'motion-safe:animate-[lc-buddy-breathe_2.6s_ease-in-out_infinite]',
          mood === 'typing' && 'motion-safe:animate-[lc-buddy-lean_360ms_ease-out_both]',
          mood === 'miss' && 'motion-safe:animate-[lc-buddy-wobble_700ms_ease-in-out_both]'
        )}
      >
        {/* One nod per keystroke: a key change restarts the squash. */}
        <div
          key={mood === 'typing' ? `t${typingTick}` : mood}
          className={cn(
            'size-full origin-bottom',
            mood === 'typing' && typingTick > 0 && 'motion-safe:animate-[lc-buddy-nod_260ms_cubic-bezier(.34,1.56,.64,1)]'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- animated webp; next/image would freeze it */}
          <img
            key={playing ? `${playing.kind}-${playing.id}` : 'idle'}
            src={playing ? playing.src : BUDDY_IDLE}
            alt=""
            width={288}
            height={288}
            draggable={false}
            data-testid="practice-buddy-art"
            className="size-full select-none object-contain object-bottom"
          />
        </div>
      </div>
      {/* Ground shadow: grounds the buddy and squashes with its breathing. */}
      <span className="mt-[-6%] h-[7%] w-[55%] rounded-full bg-neo-black/40 motion-safe:animate-[lc-buddy-shadow_2.6s_ease-in-out_infinite]" />
    </div>
  );
}

/** Rendered once by the drill root. Transforms only (`scale`/`translate`/`rotate`), so it stays on the compositor. */
export const BUDDY_KEYFRAMES =
  '@keyframes lc-buddy-breathe{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-4%) scale(.98,1.03)}}' +
  '@keyframes lc-buddy-shadow{0%,100%{transform:scaleX(1);opacity:.4}50%{transform:scaleX(.82);opacity:.28}}' +
  '@keyframes lc-buddy-lean{to{transform:rotate(var(--lc-buddy-lean,-7deg)) translateY(2%)}}' +
  '@keyframes lc-buddy-nod{0%{transform:scale(1.06,.9)}100%{transform:scale(1,1)}}' +
  '@keyframes lc-buddy-wobble{0%,100%{transform:rotate(0)}25%{transform:rotate(-5deg)}60%{transform:rotate(4deg)}}' +
  '@keyframes lc-buddy-glow{0%,100%{transform:scale(.9);opacity:.5}50%{transform:scale(1.08);opacity:1}}';

export default PracticeBuddy;
