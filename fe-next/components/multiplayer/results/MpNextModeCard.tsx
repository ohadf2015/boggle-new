'use client';

import { getModePresentation, type ModeColorFamily } from '@/lib/multiplayer/modePresentation';
import type { GameModeOption } from '@/components/GameModeSelector';
import { FALLBACK_MODE_ICON, MODE_ICONS } from '../round/roundModes';
import { PressSurface } from '@/components/motion/PressSurface';
import { PopIn } from '@/components/motion/PopIn';
import { cn } from '@/lib/utils';

type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Whole class strings per colour family (Tailwind must see them in source). */
export const MODE_TONE: Record<ModeColorFamily, { card: string; icon: string; text: string }> = {
  lime: { card: 'border-neo-lime', icon: 'bg-neo-lime text-neo-black', text: 'text-neo-lime' },
  pink: { card: 'border-neo-pink', icon: 'bg-neo-pink text-neo-black', text: 'text-neo-pink' },
  cyan: { card: 'border-neo-cyan', icon: 'bg-neo-cyan text-neo-black', text: 'text-neo-cyan' },
  purple: { card: 'border-neo-purple', icon: 'bg-neo-purple text-neo-white', text: 'text-neo-purple' },
  orange: { card: 'border-neo-orange', icon: 'bg-neo-orange text-neo-black', text: 'text-neo-orange' },
};

export interface NextModeOption {
  id: string;
  color: ModeColorFamily;
  icon: string;
  labelKey: string;
}

/** The next-round modes a host can pick from results; the server relay accepts exactly these. */
export const NEXT_MODES: GameModeOption[] = ['word-hunt', 'classic', 'wheel-rush', 'blast', 'random'];

export const BOARD_NEXT_OPTIONS: NextModeOption[] = NEXT_MODES.map((id) => {
  const p = getModePresentation(id);
  return { id, color: p.color, icon: p.icon, labelKey: p.labelKey };
});

export interface MpNextModeCardProps {
  /** The upcoming mode; null for a joiner before the host's pick arrives. */
  mode: string | null;
  options?: NextModeOption[];
  /** Host (or teacher): pick with one tap. Without it the viewer just sees the pick. */
  onChange?: (mode: string) => void;
  t: TFn;
  className?: string;
}

/** Host: one row of mode chips above START. Joiner: the pick, popping in each time it changes. */
export function MpNextModeCard({ mode, options = BOARD_NEXT_OPTIONS, onChange, t, className }: MpNextModeCardProps) {
  if (onChange) {
    return (
      <div data-testid="mp-next-mode" data-mode={mode ?? ''} className={cn('flex flex-col gap-[calc(6px*var(--mp-u,1))]', className)}>
        <span id="mp-next-mode-label" className="text-center font-neo-display text-[calc(11px*var(--mp-u,1))] font-bold uppercase tracking-widest text-neo-white/60">
          {t('mpUi.results.nextLabel')}
        </span>
        <div role="radiogroup" aria-labelledby="mp-next-mode-label" className="relative flex gap-[calc(6px*var(--mp-u,1))] overflow-x-auto px-0.5 pb-1.5 pt-0.5 [scrollbar-width:none]">
          {options.map((o) => {
            const active = o.id === mode;
            const Icon = MODE_ICONS[o.icon] ?? FALLBACK_MODE_ICON;
            return (
              <PressSurface
                key={o.id}
                role="radio"
                aria-checked={active}
                data-testid={`mp-next-mode-option-${o.id}`}
                lip={active ? 4 : 2}
                onClick={() => onChange(o.id)}
                className={cn(
                  'flex-1 shrink-0 min-w-[calc(62px*var(--mp-u,1))] flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 py-[calc(6px*var(--mp-u,1))]',
                  active ? cn(MODE_TONE[o.color].icon, 'border-neo-black') : 'border-neo-cream/25 bg-neo-navy-light text-neo-white/80 shadow-neo-black/60',
                )}
              >
                <Icon aria-hidden="true" className="w-[calc(20px*var(--mp-u,1))] h-[calc(20px*var(--mp-u,1))]" />
                <span className="max-w-full line-clamp-2 break-words text-center font-neo-display text-[calc(10px*var(--mp-u,1))] font-bold uppercase leading-[1.1]">{t(o.labelKey)}</span>
              </PressSurface>
            );
          })}
        </div>
      </div>
    );
  }

  const o = options.find((x) => x.id === mode);
  const Icon = o ? MODE_ICONS[o.icon] ?? FALLBACK_MODE_ICON : FALLBACK_MODE_ICON;
  return (
    <div data-testid="mp-next-mode" data-mode={mode ?? ''} role="status" aria-live="polite" className={cn('flex justify-center', className)}>
      <PopIn
        key={mode ?? 'pending'}
        className={cn(
          'inline-flex items-center max-w-full min-w-0 rounded-full border-2 bg-neo-navy-light ps-1 pe-3 h-[calc(32px*var(--mp-u,1))] gap-[calc(6px*var(--mp-u,1))] text-[calc(12px*var(--mp-u,1))] font-bold uppercase',
          o ? MODE_TONE[o.color].card : 'border-neo-cream/30',
        )}
      >
        <span className={cn('shrink-0 grid place-items-center rounded-full border-2 border-neo-black w-[calc(24px*var(--mp-u,1))] h-[calc(24px*var(--mp-u,1))]', o ? MODE_TONE[o.color].icon : 'bg-neo-navy text-neo-white/70')}>
          <Icon aria-hidden="true" className="w-[calc(14px*var(--mp-u,1))] h-[calc(14px*var(--mp-u,1))]" />
        </span>
        <span className="shrink-0 tracking-wider text-neo-white/70">{t('mpUi.results.nextUp')}</span>
        <span className={cn('font-neo-display truncate', o ? MODE_TONE[o.color].text : 'text-neo-white/70')}>
          {o ? t(o.labelKey) : t('mpUi.results.hostPicking')}
        </span>
      </PopIn>
    </div>
  );
}
