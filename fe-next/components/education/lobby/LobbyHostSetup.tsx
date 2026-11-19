'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { LobbyPresetCards } from './LobbyPresetCards';

export interface LobbyHostSetupProps {
  flowStrip?: ReactNode;
  lessonStep: ReactNode;
  activePreset: ClassroomPresetId | null;
  onApplyPreset: (id: ClassroomPresetId) => void;
  /** The one Game options door with its summary line. */
  options: ReactNode;
  gamesOpen: boolean;
  onGamesOpenChange: (open: boolean) => void;
  /** Mounted only while the fold is open, so nothing in it counts as seen before the teacher asks. */
  modeGrid: ReactNode;
}

/** The host lobby's setup: one class and list line, and one More options fold holding presets, Game options and every game. */
export function LobbyHostSetup({ flowStrip, lessonStep, activePreset, onApplyPreset, options, gamesOpen, onGamesOpenChange, modeGrid }: LobbyHostSetupProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(gamesOpen);

  useEffect(() => {
    const el = panelRef.current;
    if (gamesOpen && !wasOpen.current && el && typeof el.scrollIntoView === 'function') {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
    }
    wasOpen.current = gamesOpen;
  }, [gamesOpen]);

  return (
    <div data-testid="lobby-host-setup" data-lobby-expanded={gamesOpen || undefined} className="@container/setup flex flex-col gap-3 @4xl/setup:gap-4">
      {flowStrip}
      <div className="flex flex-col gap-2 @2xl/setup:flex-row @2xl/setup:items-start">
        <div className="min-w-0 flex-1">{lessonStep}</div>
        <button
          type="button"
          data-testid="lobby-more-games"
          aria-expanded={gamesOpen}
          aria-controls="lobby-more-games-panel"
          onClick={() => onGamesOpenChange(!gamesOpen)}
          className={cn(
            'flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-neo-lg border-[3px] border-dashed border-neo-cream/45 px-4 text-start',
            'font-neo-body text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream/80 motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
          )}
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            {t('eduShell.host.moreGames')}
          </span>
          <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', gamesOpen && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      {gamesOpen ? (
        <div ref={panelRef} id="lobby-more-games-panel" data-testid="lobby-more-games-panel" className="flex scroll-mt-2 flex-col gap-3 @4xl/setup:gap-4">
          <LobbyPresetCards active={activePreset} onApply={onApplyPreset} />
          {options}
          {modeGrid}
        </div>
      ) : null}
    </div>
  );
}

export default LobbyHostSetup;
