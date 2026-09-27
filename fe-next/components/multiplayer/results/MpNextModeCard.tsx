'use client';

import { useState } from 'react';
import { Building2, Gavel, Grid2x2, Grid3x3, RotateCw, Search, Shuffle, Target, Zap, type LucideIcon } from 'lucide-react';
import { MpSheet } from '../shell/MpSheet';
import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';
import type { GameModeOption } from '@/components/GameModeSelector';
import { cn } from '@/lib/utils';

type TFn = (key: string, params?: Record<string, string | number>) => string;

const ICONS: Record<string, LucideIcon> = { Search, Zap, Target, RotateCw, Building2, Gavel, Grid3x3, Grid2x2, Shuffle };

/** Whole class strings per colour family (Tailwind must see them in source). */
export const MODE_TONE: Record<ModeColorFamily, { card: string; icon: string; text: string }> = {
  lime: { card: 'border-neo-lime', icon: 'bg-neo-lime text-neo-black', text: 'text-neo-lime' },
  pink: { card: 'border-neo-pink', icon: 'bg-neo-pink text-neo-black', text: 'text-neo-pink' },
  cyan: { card: 'border-neo-cyan', icon: 'bg-neo-cyan text-neo-black', text: 'text-neo-cyan' },
  purple: { card: 'border-neo-purple', icon: 'bg-neo-purple text-neo-white', text: 'text-neo-purple' },
  orange: { card: 'border-neo-orange', icon: 'bg-neo-orange text-neo-black', text: 'text-neo-orange' },
};

/** The next-round modes a host can pick from results (same set the legacy bar offered). */
export const NEXT_MODES: GameModeOption[] = ['word-hunt', 'classic', 'wheel-rush', 'blast', 'random'];

export interface MpNextModeCardProps {
  /** The upcoming mode; null for a joiner who can't know it yet (host picks). */
  mode: GameModeOption | null;
  /** Host only: change it (opens a picker sheet). */
  onChange?: (mode: GameModeOption) => void;
  /** The picker sheet opened/closed (the screen pauses its auto-advance). */
  onPickerOpenChange?: (open: boolean) => void;
  t: TFn;
  className?: string;
}

/**
 * NEXT MODE — in the mode's electric colour (modePresentation), so the format
 * change never lands as a surprise. The host taps it to swap the mode.
 */
export function MpNextModeCard({ mode, onChange, onPickerOpenChange, t, className }: MpNextModeCardProps) {
  const [picking, setPickingState] = useState(false);
  const setPicking = (open: boolean) => {
    setPickingState(open);
    onPickerOpenChange?.(open);
  };
  const p = getModePresentation(mode);
  const tone = MODE_TONE[mode ? p.color : 'purple'];
  const Icon = ICONS[p.icon] ?? Shuffle;
  const Tag = onChange ? 'button' : 'div';

  return (
    <>
      <Tag
        type={onChange ? 'button' : undefined}
        onClick={onChange ? () => setPicking(true) : undefined}
        data-testid="mp-next-mode"
        data-mode={mode ?? ''}
        className={cn(
          'flex items-center min-w-0 w-full text-start rounded-neo-lg border-[3px] bg-neo-navy-light shadow-hard-sm',
          'gap-[calc(10px*var(--mp-u,1))] p-[calc(8px*var(--mp-u,1))]',
          tone.card,
          onChange && 'active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
          className,
        )}
      >
        <span className={cn('shrink-0 grid place-items-center rounded-neo border-2 border-neo-black w-[calc(40px*var(--mp-u,1))] h-[calc(40px*var(--mp-u,1))]', tone.icon)}>
          <Icon aria-hidden="true" className="w-[calc(22px*var(--mp-u,1))] h-[calc(22px*var(--mp-u,1))]" />
        </span>
        <span className="min-w-0 flex-1 flex flex-col leading-tight">
          <span className="text-[calc(10px*var(--mp-u,1))] font-bold uppercase tracking-widest text-neo-white/70">{t('mpUi.results.nextUp')}</span>
          <span className={cn('font-neo-display font-bold uppercase truncate text-[calc(17px*var(--mp-u,1))]', tone.text)}>
            {mode ? t(p.labelKey) : t('mpUi.results.hostPicking')}
          </span>
          {mode && <span className="truncate text-[calc(11px*var(--mp-u,1))] text-neo-white/80">{t(p.hookKey)}</span>}
        </span>
        {onChange && (
          <span className="shrink-0 rounded-full border-2 border-neo-black bg-neo-white px-2 py-0.5 text-[calc(10px*var(--mp-u,1))] font-bold uppercase text-neo-black">
            {t('mpUi.results.tapToChange')}
          </span>
        )}
      </Tag>
      {onChange && (
        <MpSheet open={picking} onClose={() => setPicking(false)} title={t('mpUi.results.chooseMode')} testId="mp-next-mode-sheet">
          <div className="grid grid-cols-2 gap-2">
            {NEXT_MODES.map((m) => {
              const mp = getModePresentation(m);
              const mt = MODE_TONE[mp.color];
              const MIcon = ICONS[mp.icon] ?? Shuffle;
              const active = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={active}
                  data-testid={`mp-next-mode-option-${m}`}
                  onClick={() => {
                    onChange(m);
                    setPicking(false);
                  }}
                  className={cn(
                    'flex items-center gap-2 min-w-0 rounded-neo border-[3px] p-2 text-start',
                    active ? cn(mt.card, 'bg-neo-navy shadow-hard-sm') : 'border-neo-black bg-neo-navy/60',
                    m === 'random' && 'col-span-2',
                  )}
                >
                  <span className={cn('shrink-0 grid place-items-center w-9 h-9 rounded-neo border-2 border-neo-black', mt.icon)}>
                    <MIcon aria-hidden="true" className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex flex-col leading-tight">
                    <span className={cn('font-neo-display font-bold uppercase truncate', mt.text)}>{t(mp.labelKey)}</span>
                    <span className="text-xs text-neo-white/80 truncate">{t(mp.hookKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </MpSheet>
      )}
    </>
  );
}
