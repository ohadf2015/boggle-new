'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { LobbyPresetCards } from './LobbyPresetCards';
import { catalogueModes } from '../ClassroomModeCatalogueData';

const COVERS = catalogueModes().slice(0, 5).map((m) => m.cover);

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
            'flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-neo-lg border-[3px] border-dashed border-edu-line px-3 py-1.5 text-start',
            'font-neo-body text-sm font-bold text-edu-ink transition-colors hover:border-edu-line motion-reduce:transition-none',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-edu-line focus-visible:ring-offset-2 focus-visible:ring-offset-edu-surface',
          )}
        >
          <span className="inline-flex items-center gap-3">
            <span data-testid="lobby-more-games-covers" aria-hidden="true" className="flex shrink-0 -space-x-3">
              {COVERS.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the grid
                <img
                  key={src}
                  src={src}
                  alt=""
                  className={cn(
                    'size-9 rounded-neo border-2 border-neo-black object-cover object-[50%_28%] shadow-hard-sm',
                    i % 2 ? 'rotate-3' : '-rotate-3',
                  )}
                />
              ))}
            </span>
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
