import React from 'react';
import { m } from 'framer-motion';
import { Delete, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WheelActionBarProps {
  t: T;
  hasLetters: boolean;
  canSubmit: boolean;
  isValidating: boolean;
  onClear: () => void;
  onSubmit: () => void;
  onBackspace: () => void;
}

const ICON_BUTTON = cn(
  'p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard',
  'hover:bg-neo-navy active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
  'disabled:opacity-30 disabled:cursor-not-allowed',
);

/** Clear, submit and backspace under the wheel. */
const WheelActionBar: React.FC<WheelActionBarProps> = ({
  t, hasLetters, canSubmit, isValidating, onClear, onSubmit, onBackspace,
}) => (
  <div
    data-testid="word-wheel-action-bar"
    // These are tapped rapidly in normal play; keep them out of rage-click detection.
    data-feedback-ignore-rage=""
    data-gr-no-rage=""
    className="w-full flex items-center justify-center gap-3 mt-1 short:mt-0"
  >
    <m.button
      type="button"
      onClick={onClear}
      disabled={!hasLetters}
      className={ICON_BUTTON}
      whileTap={{ scale: 0.9 }}
      aria-label={t('wordWheel.clear')}
    >
      <RotateCcw className="w-5 h-5" />
    </m.button>

    <m.button
      type="button"
      onClick={onSubmit}
      disabled={isValidating || !canSubmit}
      className={cn(
        'px-8 py-3 rounded-neo border-3 border-neo-black font-neo-display font-black text-lg',
        canSubmit
          ? 'bg-linear-to-r from-neo-lime to-neo-cyan text-neo-black shadow-[3px_3px_0px_black,0_0_16px_rgba(191,255,0,0.3)] hover:shadow-[3px_3px_0px_black,0_0_22px_rgba(0,255,255,0.4)]'
          : 'bg-neo-navy-light text-neo-white shadow-hard-lg',
        'active:shadow-hard-pressed active:translate-x-px active:translate-y-px',
        'disabled:cursor-not-allowed',
      )}
      whileTap={canSubmit ? { scale: 0.92 } : {}}
      animate={isValidating ? { opacity: [1, 0.6, 1] } : {}}
      transition={isValidating ? { duration: 0.6, repeat: Infinity } : {}}
    >
      {t('wordWheel.submit')}
    </m.button>

    <m.button
      type="button"
      onClick={onBackspace}
      disabled={!hasLetters}
      className={ICON_BUTTON}
      whileTap={{ scale: 0.9 }}
      aria-label={t('wordWheel.removeLetter')}
    >
      <Delete className="w-5 h-5" />
    </m.button>
  </div>
);

export default WheelActionBar;
