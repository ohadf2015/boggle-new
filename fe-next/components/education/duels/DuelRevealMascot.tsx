'use client';

/**
 * DuelRevealMascot — the champion/defeat clip, with no way to end up black.
 *
 * A bare <video> is a silent-failure machine (recurring-pitfalls Class 4): if
 * the codec is unavailable, the file 404s, autoplay is refused, or the frame is
 * simply still buffering, it paints a black rectangle and raises nothing. That
 * is exactly what the round-1 critic saw on the one CHAMPION reveal that
 * rendered — "an empty black box, no video/image loaded".
 *
 * So the still is not a `poster` attribute (which the element drops the instant
 * it thinks it has a frame). It is a real <img>, painted underneath, always
 * mounted. The clip sits on top at opacity-0 and is only revealed on the
 * `playing` event — the one signal that means pixels are actually moving. On
 * `error` the clip unmounts entirely. Every failure path lands on the mascot.
 *
 * Class-5 safe: the resting state (the still) is fully painted from the first
 * frame; the only tween is a small element's opacity, never a fullscreen layer.
 * prefers-reduced-motion gets the still and nothing else.
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

type ClipState = 'still' | 'playing';

export interface DuelRevealMascotProps {
  /** Short mascot loop under public/mascots. */
  src: string;
  /** Transparent still of the same character under public/mascot. */
  poster: string;
  /** i18n key describing the result, used as the accessible name. */
  label: string;
  className?: string;
}

export function DuelRevealMascot({ src, poster, label, className }: DuelRevealMascotProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const [clipState, setClipState] = useState<ClipState>('still');
  const [clipFailed, setClipFailed] = useState(false);

  const showClip = !prefersReducedMotion && !clipFailed;

  return (
    <div
      data-testid="duel-reveal-mascot"
      data-clip-state={clipState}
      className={cn(
        'relative isolate aspect-square w-full overflow-hidden rounded-neo border-[3px] border-neo-cream bg-neo-navy shadow-hard',
        className
      )}
    >
      {/* The floor: always painted, never black. */}
      <img
        data-testid="duel-reveal-still"
        src={poster}
        alt={t(label)}
        width={240}
        height={240}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {showClip && (
        <video
          data-testid="duel-reveal-clip"
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setClipState('playing')}
          onError={() => {
            setClipFailed(true);
            setClipState('still');
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-contain transition-opacity duration-300 motion-reduce:transition-none',
            clipState === 'playing' ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
}
