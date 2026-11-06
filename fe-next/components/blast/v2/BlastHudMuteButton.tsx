'use client';
// The global in-game audio FAB stands down on blast screens, so the Blast HUD carries its own mute.
import { Volume2, VolumeX } from 'lucide-react';
import { useMasterMute } from '@/hooks/useMasterMute';
import { cn } from '@/lib/utils';

export function BlastHudMuteButton({ className }: { className?: string } = {}) {
  const { allMuted, toggle, label, title } = useMasterMute();
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="blast-mute-btn"
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className={cn('self-center h-9 w-9 shrink-0 rounded-lg inline-flex items-center justify-center transition-transform active:scale-95', className)}
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
