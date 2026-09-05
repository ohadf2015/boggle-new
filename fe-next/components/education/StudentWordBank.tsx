'use client';

/**
 * StudentWordBank — live-game scaffolding driven by the student's classroom level.
 *
 *   support   → collapsible bottom-sheet "Word bank (N)" listing the lesson words
 *               embedded in the board (large type, tap to expand; collapsed by default
 *               so it never covers the grid unasked).
 *   challenge → small badge: "Challenge: aim for 5+ letter words".
 *   core      → renders nothing.
 *
 * Both `level` and `words` come from the server's per-socket `classroomContext`
 * (see useMultiplayerSocket). The board is shared, so this changes what the
 * student SEES, never what the board contains.
 *
 * Dark-only surface → hardcoded `bg-neo-navy` (no `bg-neo-cream dark:` pair; see
 * pitfalls class 5). No entrance opacity tween: it appears statically.
 */
import { useState } from 'react';
import { BookOpen, ChevronUp, Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { VocabularyLevel } from '@/lib/supabase/education/types';

export interface StudentWordBankProps {
  level: VocabularyLevel;
  /** Lesson vocabulary embedded in this game's board. */
  words: string[];
  /** Longer-word target shown to challenge students. */
  challengeMinLength?: number;
  className?: string;
}

export const DEFAULT_CHALLENGE_MIN_LENGTH = 5;

export function StudentWordBank({
  level,
  words,
  challengeMinLength = DEFAULT_CHALLENGE_MIN_LENGTH,
  className,
}: StudentWordBankProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const isRTL = language === 'he';

  if (level === 'challenge') {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-neo border-2 border-black bg-neo-orange text-black',
          'text-xs font-neo-display font-black uppercase tracking-wide shadow-hard-sm',
          className
        )}
      >
        <Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t('education.wordBank.challengeBadge', { min: challengeMinLength })}</span>
      </div>
    );
  }

  if (level !== 'support' || words.length === 0) return null;

  const panelId = 'student-word-bank-panel';

  return (
    <div
      data-testid="student-word-bank"
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        // Bottom sheet: pinned to the viewport bottom, above the board, safe-area aware.
        'fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-lg',
        'border-3 border-b-0 border-black rounded-t-neo bg-neo-navy text-white shadow-hard',
        'pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between gap-3 min-h-[52px] px-4',
          'font-neo-display font-black text-base uppercase tracking-wide',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-inset'
        )}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-neo-cyan shrink-0" aria-hidden="true" />
          <span>{t('education.wordBank.title', { count: words.length })}</span>
        </span>
        <ChevronUp
          className={cn('w-5 h-5 shrink-0 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="border-t-3 border-black px-4 pt-3 pb-4 max-h-[40vh] overflow-y-auto">
          <p className="text-xs font-bold text-white/70 mb-2">{t('education.wordBank.hint')}</p>
          <ul className="grid grid-cols-2 gap-2">
            {words.map((word) => (
              <li
                key={word}
                className="text-xl font-neo-display font-black tracking-wide uppercase px-3 py-2 rounded-neo border-2 border-black bg-neo-cream text-black shadow-hard-sm break-words"
              >
                {word}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default StudentWordBank;
