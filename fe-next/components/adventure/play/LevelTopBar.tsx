'use client';

/**
 * Adventure level top bar — back button, world name, timer.
 * Fires adventure_exit when back is clicked.
 */
import { ArrowLeft, Timer } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

interface Props {
  worldName: string;
  levelLabel: string;
  secs: number;
  urgent: boolean;
  onExit: () => void;
  world: number;
}

export default function LevelTopBar({ worldName, levelLabel, secs, urgent, onExit, world }: Props) {
  const { t } = useLanguageSafe();

  const handleExit = () => {
    trackGrowthEvent('adventure_exit', { from: 'level', world });
    onExit();
  };

  return (
    <div data-adv-slot="bar" className="flex items-center gap-2 pe-11">
      <button
        type="button"
        onClick={handleExit}
        aria-label={t('adventurePlay.backToMap')}
        className="rounded-xl border-[3px] border-black bg-neo-cream text-black p-2 shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none"
      >
        <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
      </button>
      <div className="flex-1 min-w-0 rounded-xl border-[3px] border-black bg-black/60 px-3 py-1.5">
        <div className="text-[11px] uppercase tracking-wider opacity-80 truncate">{worldName}</div>
        <div className="font-neo-display font-bold leading-tight">{levelLabel}</div>
      </div>
      <div
        className={cn(
          'rounded-xl border-[3px] border-black px-3 py-2 font-neo-display font-bold tabular-nums inline-flex items-center gap-1 shadow-[3px_3px_0_#000]',
          urgent ? 'bg-neo-pink text-black animate-pulse' : 'bg-neo-yellow text-black'
        )}
      >
        <Timer className="w-4 h-4" /> {secs}
      </div>
    </div>
  );
}
