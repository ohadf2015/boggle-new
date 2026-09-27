'use client';

/**
 * BlastMascotHud — circular HUD-mounted mascot for Blast Mode.
 *
 * The frame stays fixed; the inner `<img>` swaps on state change. Animated
 * states use transparent -nobg.gif so the round clip stays clean. State change
 * triggers a brief scale pop via the `key={state}` remount + CSS animation.
 *
 * When `enabled=false` (muted) the HUD still renders — at reduced opacity with
 * a "muted" overlay — so the user can click it to re-enable. Click anywhere on
 * the frame fires `onToggle`. Disabled state forces the idle pose so no GIF
 * motion plays while the player has chosen quiet.
 *
 * Reduced-motion users get the swap with no entry pop.
 */
import React from 'react';
import { VolumeX } from 'lucide-react';
import { MASCOT_GIF_PATHS, type MascotState } from '@/lib/blast/mascotState';

interface BlastMascotHudProps {
  state: MascotState;
  /** When false, frame renders muted (still clickable to re-enable). Default true. */
  enabled?: boolean;
  /** Click handler — typically toggles enabled. Optional. */
  onToggle?: () => void;
  /** Extra wrapper classes (positioning, etc.). */
  className?: string;
}

export function BlastMascotHud({
  state,
  enabled = true,
  onToggle,
  className = '',
}: BlastMascotHudProps) {
  // When muted, force idle pose so no GIF motion plays.
  const effectiveState: MascotState = enabled ? state : 'idle';
  const src = MASCOT_GIF_PATHS[effectiveState];

  const Tag = onToggle ? 'button' : 'div';
  const interactiveProps = onToggle
    ? {
        onClick: onToggle,
        type: 'button' as const,
        'aria-label': enabled ? 'Mute mascot reactions' : 'Unmute mascot reactions',
      }
    : {};

  return (
    <Tag
      data-testid="blast-mascot-hud"
      data-state={effectiveState}
      data-enabled={String(enabled)}
      {...interactiveProps}
      className={[
        'pointer-events-auto relative w-20 h-20 rounded-full overflow-hidden',
        'border-2 border-black bg-neo-cyan',
        'shadow-hard-lg',
        'motion-safe:transition-transform motion-safe:duration-200',
        enabled ? 'opacity-100' : 'opacity-50',
        onToggle ? 'cursor-pointer hover:scale-105 active:scale-95' : '',
        className,
      ].join(' ')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={effectiveState}
        data-testid="blast-mascot-img"
        src={src}
        alt=""
        aria-hidden="true"
        width={80}
        height={80}
        className="absolute inset-0 w-full h-full object-cover motion-safe:animate-neo-pop"
      />
      {!enabled && (
        <span
          data-testid="blast-mascot-muted-indicator"
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <VolumeX className="w-7 h-7 text-white" strokeWidth={3} />
        </span>
      )}
    </Tag>
  );
}
