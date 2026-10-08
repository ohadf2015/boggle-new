'use client';

import type { PuzzleLocale } from '@/lib/crossword/types';
import { CrosswordKeyboard } from './CrosswordKeyboard';
import { CrosswordImeInput } from './CrosswordImeInput';

export interface CrosswordInputDockProps {
  locale: PuzzleLocale;
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
  /** Active cell + direction; the ja IME input refocuses when it changes. */
  activeKey: string;
  t: (key: string) => string;
  className?: string;
}

/**
 * On-screen keyboard (touch only — desktop uses the physical keyboard), plus for ja the hidden IME
 * input and the kana keys on desktop too, since many desktops have no Japanese IME.
 */
export function CrosswordInputDock({ locale, onLetter, onBackspace, disabled, activeKey, t, className = '' }: CrosswordInputDockProps) {
  const isJa = locale === 'ja';
  return (
    <>
      <div className={`${className} ${isJa ? '' : 'lg:hidden'}`}>
        <CrosswordKeyboard
          locale={locale}
          onLetter={onLetter}
          onBackspace={onBackspace}
          disabled={disabled}
          backspaceLabel={t('crossword.backspace')}
          voicedLabel={t('crossword.kanaVoiced')}
          basicLabel={t('crossword.kanaBasic')}
        />
      </div>
      {isJa && <CrosswordImeInput onLetter={onLetter} focusKey={activeKey} label={t('crossword.kanaInput')} disabled={disabled} />}
    </>
  );
}
