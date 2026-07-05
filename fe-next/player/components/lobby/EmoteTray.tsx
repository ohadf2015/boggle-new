'use client';

import React, { useState } from 'react';
import { Smile, X } from 'lucide-react';
import { LOBBY_EMOTES, type LobbyEmoteId } from '@/lib/lobby/lobbyEmotes';
import { cn } from '@/lib/utils';

interface EmoteTrayProps {
  /** Fire an emote to the room. */
  onEmote: (id: LobbyEmoteId) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  /** True during the post-send cooldown — greys + blocks the whole tray. */
  disabled?: boolean;
  /**
   * Compact mode: collapses to a single emoji trigger button that expands the
   * emote row inline on tap (and closes after sending). Keeps the lobby quiet —
   * the full 11-emoji row no longer claims a permanent labelled section.
   */
  compact?: boolean;
  className?: string;
}

const buttonClass = cn(
  'flex h-11 w-11 items-center justify-center rounded-neo border-neo border-neo-black',
  'bg-neo-navy-light text-2xl leading-none shadow-hard-sm transition-transform',
  'hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
  'disabled:cursor-not-allowed disabled:hover:translate-y-0',
);

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
  compact = false,
  className,
}: EmoteTrayProps): React.ReactElement {
  const [open, setOpen] = useState(false);

  const emoteButtons = LOBBY_EMOTES.map((e) => (
    <button
      key={e.id}
      type="button"
      disabled={disabled}
      aria-label={t(e.labelKey)}
      title={t(e.labelKey)}
      onClick={() => {
        onEmote(e.id);
        if (compact) setOpen(false);
      }}
      className={buttonClass}
    >
      <span aria-hidden="true" className="select-none">
        {e.emoji}
      </span>
    </button>
  ));

  if (!compact) {
    return (
      <div
        data-testid="emote-tray"
        className={cn(
          'flex flex-wrap items-center justify-center gap-2',
          disabled && 'opacity-50',
          className,
        )}
      >
        {emoteButtons}
      </div>
    );
  }

  return (
    <div data-testid="emote-tray" className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        data-testid="emote-trigger"
        aria-label={t('lobby.emote.title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          buttonClass,
          open && 'bg-neo-pink text-neo-black -translate-y-0.5',
        )}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Smile className="h-5 w-5 text-neo-pink" aria-hidden="true" />}
      </button>
      {open && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            disabled && 'opacity-50',
          )}
        >
          {emoteButtons}
        </div>
      )}
    </div>
  );
}

export default EmoteTray;
