'use client';

import { memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useMasterMute } from '@/hooks/useMasterMute';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { cn } from '../../../lib/utils';

/**
 * LobbyAudioButton — in-header mute control for the MP host lobby.
 *
 * The lobby keeps its own visible header (language / invite / settings / exit),
 * so a floating global mute FAB on top of it is redundant clutter. This button
 * lives inside that header and, while mounted, registers an in-header audio
 * control so the global InGameAudioButton stands down (no double control).
 *
 * Behaviour is the shared master mute (useMasterMute): one tap silences or
 * restores both music and SFX, matching every other audio control in the app.
 */
export const LobbyAudioButton = memo(function LobbyAudioButton() {
  useRegisterHeaderAudioControl();
  const { allMuted, toggle, label, title } = useMasterMute();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      data-testid="lobby-audio-button"
      className={cn(
        // Same 40px icon-button as the rest of the MP lobby header (×1.5 on TV via --mp-u).
        'w-[calc(40px*var(--mp-u,1))] h-[calc(40px*var(--mp-u,1))] flex items-center justify-center shrink-0 rounded-neo border-2 border-neo-black shadow-hard-sm transition-transform',
        'active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-neo-cyan',
        allMuted ? 'bg-neo-navy-light text-neo-white/50' : 'bg-neo-navy-light text-neo-white',
      )}
    >
      {allMuted
        ? <VolumeX className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
        : <Volume2 className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
});

export default LobbyAudioButton;
