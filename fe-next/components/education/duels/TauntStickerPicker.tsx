'use client';

/**
 * TauntStickerPicker — four mascot stickers you can throw at the classmate
 * whose turn you are waiting on.
 *
 * Stickers, not free text: the socket carries an id from a server-side
 * allowlist (backend/handlers/duel/taunt.ts), so there is nothing for a teacher
 * to moderate and nothing a kid can type that another kid should not read.
 *
 * One taunt per duel per device — once a sticker is sent the row locks and
 * shows which one went out.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { DUEL_TAUNTS, type DuelTauntId } from '@/lib/education/duelTaunts';
import { cn } from '@/lib/utils';

export interface TauntStickerPickerProps {
  onSelect: (tauntId: DuelTauntId) => void;
  /** The sticker already sent for this duel, if any. */
  selected?: DuelTauntId | null;
  disabled?: boolean;
  className?: string;
}

export function TauntStickerPicker({
  onSelect,
  selected = null,
  disabled = false,
  className,
}: TauntStickerPickerProps) {
  const { t } = useLanguage();
  const locked = disabled || selected !== null;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p className="font-neo-body text-[10px] font-black uppercase tracking-widest text-neo-white/60">
        {selected ? t('education.duels.tauntSent') : t('education.duels.tauntPrompt')}
      </p>
      <div className="flex items-center gap-2" role="group" aria-label={t('education.duels.tauntPrompt')}>
        {DUEL_TAUNTS.map((taunt) => {
          const isSelected = selected === taunt.id;
          return (
            <button
              key={taunt.id}
              type="button"
              data-testid="duel-taunt-option"
              data-taunt={taunt.id}
              aria-pressed={isSelected}
              aria-label={t(taunt.labelKey)}
              title={t(taunt.labelKey)}
              onClick={() => {
                if (locked) return;
                onSelect(taunt.id);
              }}
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo shadow-hard-sm transition-all duration-100',
                taunt.accentClass,
                isSelected && 'ring-4 ring-neo-yellow',
                locked && !isSelected && 'opacity-40',
                !locked &&
                  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed'
              )}
            >
              <img
                data-testid="duel-taunt-image"
                src={taunt.src}
                alt=""
                aria-hidden="true"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
