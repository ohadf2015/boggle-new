import { Volume2, VolumeX } from 'lucide-react';
import { useMasterMute } from '@/hooks/useMasterMute';

export function ResultsMute() {
  const { allMuted, toggle, label, title } = useMasterMute();
  return (
    <button
      type="button"
      data-testid="v2-results-mute"
      onClick={toggle}
      aria-label={label}
      aria-pressed={!allMuted}
      title={title}
      className="absolute start-3 top-[max(0.75rem,env(safe-area-inset-top))] flex h-8 w-8 items-center justify-center rounded-neo border-neo border-black bg-neo-cream text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
    >
      {allMuted
        ? <VolumeX className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        : <Volume2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />}
    </button>
  );
}
