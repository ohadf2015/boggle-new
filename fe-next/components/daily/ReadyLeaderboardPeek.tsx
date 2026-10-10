import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ReadyLeaderboardPeekProps {
  t: (key: string) => string;
  children: React.ReactNode;
}

export default function ReadyLeaderboardPeek({ t, children }: ReadyLeaderboardPeekProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white font-bold text-sm shadow-hard-xs active:shadow-hard-pressed active:translate-x-px active:translate-y-px"
      >
        <span>{open ? t('wordWheel.climb.hideBoard') : t('wordWheel.climb.showBoard')}</span>
        <ChevronDown
          className={open ? 'w-4 h-4 rotate-180 transition-transform' : 'w-4 h-4 transition-transform'}
          aria-hidden
        />
      </button>
      {open && <div id={panelId} className="mt-2">{children}</div>}
    </div>
  );
}
