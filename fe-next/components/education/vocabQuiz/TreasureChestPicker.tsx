/**
 * Treasure Chest Picker
 *
 * Displays three clickable chests for a student who answered correctly.
 * Server will resolve which outcome each chest has, so all three are equally
 * likely from the student's perspective. Large tap targets for mobile.
 *
 * Dark-only surface: uses bg-neo-navy, never `bg-neo-cream dark:bg-neo-navy`.
 * No entrance opacity tween (Class 5 pitfall).
 */

import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { cn } from '@/lib/utils';
import { ChestIcon } from './ChestIcon';

export interface TreasureChestPickerProps {
  onPick: (index: number) => void;
  disabled?: boolean;
  t: TranslateFn;
}

export function TreasureChestPicker({ onPick, disabled, t }: TreasureChestPickerProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-center font-neo-display font-bold text-neo-white">
        {t('vocabQuiz.treasure.prompt')}
      </p>

      <div className="flex gap-2 justify-center">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            onClick={() => onPick(index)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-center justify-center',
              'w-20 h-24 rounded-neo border-[2px] border-neo-cream',
              'bg-neo-navy-elevated shadow-hard',
              'transition-all duration-200',
              'active:scale-95 active:shadow-neo-inset',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !disabled && 'hover:bg-neo-navy-elevated hover:border-neo-yellow active:bg-neo-navy'
            )}
            aria-label={t('vocabQuiz.treasure.chestLabel', { number: index + 1 })}
          >
            <ChestIcon />
          </button>
        ))}
      </div>
    </div>
  );
}
