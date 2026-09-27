'use client';
// Mute toggle rendered inside the Blast HUD header band (top-left corner).
// Exists so Wordfall has a dedicated audio control: the global in-game audio
// FAB stands down on blast screens via useRegisterHeaderAudioControl, and the
// corner it used to occupy is taken by the chest badge.
import { Volume2, VolumeX } from 'lucide-react';
import { useMasterMute } from '@/hooks/useMasterMute';

export function BlastHudMuteButton() {
  const { allMuted, toggle, label, title } = useMasterMute();
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="blast-mute-btn"
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="self-center h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center transition-transform active:scale-95"
      style={{
        background: 'rgba(0,0,0,0.45)',
        border: '2px solid rgba(255,255,255,0.65)',
        boxShadow: '2px 2px 0 #0b1530',
        color: '#fff',
      }}
    >
      {allMuted
        ? <VolumeX className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
        : <Volume2 className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />}
    </button>
  );
}
