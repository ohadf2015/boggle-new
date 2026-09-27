'use client';

import { memo } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useRegisterHeaderAudioControl } from '@/contexts/NavigationContext';
import { useMasterMute } from '@/hooks/useMasterMute';

/**
 * Mute lives IN the round HUD. Registering a header audio control makes the
 * global floating InGameAudioButton stand down — it sat on top of the score
 * chip in the HUD's end corner.
 */
function MpRoundMuteImpl() {
  useRegisterHeaderAudioControl();
  const { allMuted, toggle, label, title } = useMasterMute();
  const Icon = allMuted ? VolumeX : Volume2;
  return (
    <button
      type="button"
      data-testid="mp-round-mute"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="inline-flex items-center justify-center shrink-0 w-9 h-9 lg:w-11 lg:h-11 tv:w-16 tv:h-16 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm active:translate-y-px"
    >
      <Icon aria-hidden="true" className="w-4 h-4 lg:w-5 lg:h-5 tv:w-7 tv:h-7" strokeWidth={2.5} />
    </button>
  );
}

export const MpRoundMute = memo(MpRoundMuteImpl);
MpRoundMute.displayName = 'MpRoundMute';
