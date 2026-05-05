'use client';

import { useEffect, useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import PracticeMiniDemo from './PracticeMiniDemo';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const ACCENT: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan bg-neo-navy-light/95',
  wordHunt: 'border-neo-lime bg-neo-navy-light/95',
  wheelRush: 'border-neo-purple bg-neo-navy-light/95',
};

const TIPS_KEYS: Record<PracticeMode, [string, string, string]> = {
  classic: [
    'practice.instructions.classic.line1',
    'practice.instructions.classic.line2',
    'practice.instructions.classic.line3',
  ],
  wordHunt: [
    'practice.instructions.wordHunt.line1',
    'practice.instructions.wordHunt.line2',
    'practice.instructions.wordHunt.line3',
  ],
  wheelRush: [
    'practice.instructions.wheelRush.line1',
    'practice.instructions.wheelRush.line2',
    'practice.instructions.wheelRush.line3',
  ],
};

const MODE_ACCENT_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-cyan',
  wordHunt: 'text-neo-lime',
  wheelRush: 'text-neo-purple',
};

const STORAGE_KEY = (mode: PracticeMode) => `lc_practice_help_dismissed_${mode}`;

interface Props {
  mode: PracticeMode;
}

/**
 * Floating help overlay — sits on top of the real game-mode UI so practice
 * looks 95% like production (the underlying GridComponent / WheelLetter
 * dominates the screen). The overlay shows: the mode mechanic illustration
 * (PracticeMiniDemo, static), a 3-line rule list, and a × dismiss button.
 *
 * Dismissal persists per-mode in localStorage. A small floating "?" button
 * stays in the corner so the player can re-open the help anytime.
 *
 * Design intent: the player should feel they're playing the real game, with
 * a thin coach mark guiding them — not a bespoke "practice UI".
 */
export default function PracticeInstructions({ mode }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(true);

  // Hydrate dismissal preference from localStorage on mount.
  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY(mode));
      if (dismissed === '1') setOpen(false);
    } catch { /* ignore */ }
  }, [mode]);

  const dismiss = () => {
    setOpen(false);
    try { window.localStorage.setItem(STORAGE_KEY(mode), '1'); } catch { /* ignore */ }
  };

  const reopen = () => setOpen(true);

  const tips = TIPS_KEYS[mode];

  if (!open) {
    // Compact help-toggle: floating "?" pill, top-right of the surface.
    return (
      <button
        type="button"
        data-testid="practice-instructions-toggle"
        onClick={reopen}
        aria-label={t('practice.instructions.title')}
        className="fixed top-3 end-3 z-30 inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm hover:scale-105 active:translate-y-px transition-transform"
      >
        <HelpCircle className="w-5 h-5" aria-hidden />
      </button>
    );
  }

  return (
    <AdaptiveMotion.div
      data-testid="practice-instructions"
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="dialog"
      aria-label={t('practice.instructions.title')}
      className={`fixed top-3 left-1/2 -translate-x-1/2 z-30 w-[min(22rem,calc(100vw-1.5rem))] rounded-neo border-3 border-neo-black ${ACCENT[mode]} shadow-hard backdrop-blur-sm`}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Static mechanic illustration — locale-aware, finals-free Hebrew. */}
        <div className="shrink-0 w-20 h-20 -ml-1 -mt-1 scale-75 origin-top-left">
          <PracticeMiniDemo mode={mode} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] uppercase tracking-wider font-neo-display font-black ${MODE_ACCENT_TEXT[mode]}`}>
            {t('practice.instructions.title')}
          </p>
          <ul
            data-testid="practice-instructions-list"
            className="mt-1 flex flex-col gap-0.5 text-[12px] font-neo-body text-neo-cream/90 leading-snug"
          >
            {tips.map((tipKey) => (
              <li key={tipKey} className="flex items-start gap-1">
                <span aria-hidden className={`mt-0.5 ${MODE_ACCENT_TEXT[mode]}`}>›</span>
                <span>{t(tipKey)}</span>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          data-testid="practice-instructions-dismiss"
          onClick={dismiss}
          aria-label="dismiss"
          className="shrink-0 -m-1 inline-flex items-center justify-center w-7 h-7 rounded-full text-neo-cream/70 hover:text-neo-cream hover:bg-neo-cream/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </AdaptiveMotion.div>
  );
}
