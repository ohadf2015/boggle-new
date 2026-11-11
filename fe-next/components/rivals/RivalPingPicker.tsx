'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { RIVAL_PING_IDS, RIVAL_PINGS, type RivalPingId } from '@/lib/rivals/pings';

interface RivalPingPickerProps {
  onPick: (id: RivalPingId) => void;
  title?: string;
}

export function RivalPingPicker({ onPick, title }: RivalPingPickerProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-2">
      {title && <p className="text-sm font-black text-neo-black">{title}</p>}
      <div className="grid grid-cols-2 gap-2">
        {RIVAL_PING_IDS.map((id) => {
          const label = t(RIVAL_PINGS[id].textKey);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              aria-label={label}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border-2 border-neo-black bg-neo-cream px-2 py-1 text-start text-sm font-bold text-neo-black shadow-hard-sm transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <span aria-hidden="true" className="text-xl leading-none">{RIVAL_PINGS[id].emoji}</span>
              <span className="min-w-0 flex-1 leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RivalPingPicker;
