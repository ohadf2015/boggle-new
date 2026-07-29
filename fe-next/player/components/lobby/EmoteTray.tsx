'use client';

import React from 'react';
import { LOBBY_EMOTES, type LobbyEmoteId } from '@/lib/lobby/lobbyEmotes';
import { cn } from '@/lib/utils';

interface EmoteTrayProps {
  /** Fire an emote to the room. */
  onEmote: (id: LobbyEmoteId) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** True during the post-send cooldown — greys + blocks the whole tray. */
  disabled?: boolean;
  className?: string;
}

/**
 * Lobby emote picker — a neo-brutalist row of emoji the waiting player can fling
 * onto their own avatar for everyone in the room to see. Sibling-toy to
 * LobbyReactions; this one drives avatar face-expressions (angry/wink/silly…).
 *
 * Each button is keyboard-focusable with a translated aria-label (the emoji alone
 * isn't a reliable accessible name). 44px min touch target.
 */
export function EmoteTray({
  onEmote,
  t,
  disabled = false,
  className,
}: EmoteTrayProps): React.ReactElement {
  return (
    <div
      data-testid="emote-tray"
      className={cn(
        'flex flex-wrap items-center justify-center gap-2',
        disabled && 'opacity-50',
        className,
      )}
    >
      {LOBBY_EMOTES.map((e) => (
        <button
          key={e.id}
          type="button"
          disabled={disabled}
          aria-label={t(e.labelKey)}
          title={t(e.labelKey)}
          onClick={() => onEmote(e.id)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-neo border-neo border-neo-black',
            'bg-neo-navy-light text-2xl leading-none shadow-hard-sm transition-transform',
            'hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
            'disabled:cursor-not-allowed disabled:hover:translate-y-0',
          )}
        >
          <span aria-hidden="true" className="select-none">
            {e.emoji}
          </span>
        </button>
      ))}
    </div>
  );
}

export default EmoteTray;
