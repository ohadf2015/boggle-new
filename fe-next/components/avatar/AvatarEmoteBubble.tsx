'use client';

import React from 'react';
import { getLobbyEmote } from '@/lib/lobby/lobbyEmotes';
import type { ActiveEmote } from '@/hooks/useLobbyEmotes';

interface AvatarEmoteBubbleProps {
  /** The live emote on this avatar, or undefined when nothing is playing. */
  active?: ActiveEmote;
  className?: string;
}

/**
 * Floating emoji bubble that pops over an avatar when a lobby emote fires.
 *
 * Primary, universally-legible signal (the avatar face-swap is the enhancement).
 * Keyed on `nonce` so a repeated emote re-mounts and re-plays the pop. Purely
 * decorative → aria-hidden; the tray button carries the accessible label.
 */
export function AvatarEmoteBubble({
  active,
  className,
}: AvatarEmoteBubbleProps): React.ReactElement | null {
  if (!active) return null;
  const meta = getLobbyEmote(active.emote);
  if (!meta) return null;

  return (
    <div
      key={active.nonce}
      aria-hidden="true"
      data-testid="avatar-emote-bubble"
      className={
        'pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 ' +
        'animate-neo-pop select-none text-2xl leading-none drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)] ' +
        (className ?? '')
      }
    >
      {meta.emoji}
    </div>
  );
}

export default AvatarEmoteBubble;
