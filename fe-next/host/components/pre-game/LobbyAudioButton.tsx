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
        'w-8 h-8 flex items-center justify-center shrink-0 rounded-neo border-2 transition-all',
        'active:translate-y-0.5 active:shadow-none',
        allMuted
          ? 'border-neo-white/20 bg-white/5 text-neo-cream/50 hover:bg-white/10'
          : 'border-neo-white/20 bg-white/5 text-neo-cream/70 hover:bg-white/10',
      )}
    >
      {allMuted
        ? <VolumeX className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
        : <Volume2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
});

export default LobbyAudioButton;
