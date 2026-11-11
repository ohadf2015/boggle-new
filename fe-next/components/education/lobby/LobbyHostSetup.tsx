'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ClassroomPresetId } from '@/lib/education/classroomPresets';
import { LobbyPresetCards } from './LobbyPresetCards';
import { catalogueModes } from '../ClassroomModeCatalogueData';

const covers = catalogueModes().map((m) => m.cover);

export interface LobbyHostSetupProps {
  flowStrip?: ReactNode;
  lessonStep: ReactNode;
  activePreset: ClassroomPresetId | null;
  onApplyPreset: (id: ClassroomPresetId) => void;
  /** The one Game options door with its summary line. */
  options: ReactNode;
  gamesOpen: boolean;
  onGamesOpenChange: (open: boolean) => void;
  /** Mounted only while open, so nothing in it counts as seen before the teacher asks. */
  modeGrid: ReactNode;
}

/** The host lobby's first frame: word list, three presets, one options line; every other game folds behind More games. */
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
    <div data-testid="lobby-host-setup" className="@container/setup flex flex-col gap-3 @4xl/setup:gap-4">
      {flowStrip}
      {lessonStep}
      <LobbyPresetCards active={activePreset} onApply={onApplyPreset} />
      {options}
      <button
        type="button"
        data-testid="lobby-more-games"
        aria-expanded={gamesOpen}
        aria-controls="lobby-more-games-panel"
        onClick={() => onGamesOpenChange(!gamesOpen)}
        className={cn(
          'flex min-h-14 w-full items-center gap-4 rounded-neo-lg border-[3px] border-dashed border-neo-cream/45 px-3 py-2 text-start',
          'font-neo-body text-sm font-bold text-neo-cream transition-colors hover:border-neo-cream/80 motion-reduce:transition-none',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        )}
      >
        <span aria-hidden="true" className="flex shrink-0 -space-x-3">
          {covers.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- static poster cover, same file as the grid
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                'size-9 rounded-neo border-2 border-neo-black object-cover object-[50%_28%] shadow-hard-sm @2xl/setup:size-11',
                i % 2 ? 'rotate-3' : '-rotate-3',
                i >= 4 && 'hidden @md/setup:block',
              )}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1">{t('eduShell.host.moreGames')}</span>
        <ChevronDown className={cn('size-5 shrink-0 transition-transform motion-reduce:transition-none', gamesOpen && 'rotate-180')} strokeWidth={3} aria-hidden="true" />
      </button>
      {gamesOpen ? (
        <div ref={panelRef} id="lobby-more-games-panel" data-testid="lobby-more-games-panel" className="scroll-mt-2">
          {modeGrid}
        </div>
      ) : null}
    </div>
  );
}

export default LobbyHostSetup;
