'use client';

import { memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { useMasterMute } from '@/hooks/useMasterMute';

/**
 * Mute, sitting in the daily nav row beside "how to play". Registering a header
 * audio control stands the global floating mute button down: on a phone it was
 * nudged below the nav pills and landed on top of the quest title.
 */
function DailyFlowMuteImpl() {
  useRegisterHeaderAudioControl();
  const { allMuted, toggle, label, title } = useMasterMute();
  const Icon = allMuted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      data-testid="daily-flow-mute"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neo-black bg-neo-navy/90 text-neo-white shadow-hard-sm backdrop-blur before:absolute before:left-1/2 before:top-1/2 before:size-11 before:-translate-1/2 active:translate-y-px active:shadow-hard-pressed"
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
    </button>
  );
}

export const DailyFlowMute = memo(DailyFlowMuteImpl);
DailyFlowMute.displayName = 'DailyFlowMute';
