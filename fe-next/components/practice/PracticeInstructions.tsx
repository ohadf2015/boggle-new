'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, HelpCircle } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

const ACCENT_BORDER: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan',
  wordHunt: 'border-neo-lime',
  wheelRush: 'border-neo-purple',
};

const ACCENT_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-cyan',
  wordHunt: 'text-neo-lime',
  wheelRush: 'text-neo-purple',
};

const ACCENT_BG: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan',
  wordHunt: 'bg-neo-lime',
  wheelRush: 'bg-neo-purple',
};

const HERO_SRC: Record<PracticeMode, string> = {
  classic: '/practice/help/practice-help-classic.jpg',
  wordHunt: '/practice/help/practice-help-wordhunt.jpg',
  wheelRush: '/practice/help/practice-help-wheelrush.jpg',
};

// Tip copy lives under practice.tips.<mode>.line* (populated in all 5 locales).
// practice.instructions.* only holds title + cta — pointing tips there made every
// line fall through to a "Translation missing" Sentry log (JAVASCRIPT-NEXTJS-151/152/154).
// Only the two essential lines per mode show — line3 was the obvious/filler tip
// ("find as many as you can" / "beat the clock") and was dropped to cut word count.
const TIPS_KEYS: Record<PracticeMode, [string, string]> = {
  classic: [
    'practice.tips.classic.line1',
    'practice.tips.classic.line2',
  ],
  wordHunt: [
    'practice.tips.wordHunt.line1',
    'practice.tips.wordHunt.line2',
  ],
  wheelRush: [
    'practice.tips.wheelRush.line1',
    'practice.tips.wheelRush.line2',
  ],
};

const STORAGE_KEY = (mode: PracticeMode) => `lc_practice_help_dismissed_${mode}`;

interface Props {
  mode: PracticeMode;
  /**
   * When false, the help panel stays closed on mount and only the "?" pill
   * shows — the player lands straight on the interactive board and learns by
   * doing. The sandboxes pass false so they don't gate play behind a second
   * modal after the pre-game tutorial sheet has already taught the mode.
   */
  autoOpen?: boolean;
}

/**
 * Practice help modal — full-screen backdrop + opaque panel so the modal
 * never visually competes with the underlying live-mode UI (was a coach-mark
 * card that bled into the grid). Shows mode mechanic illustration + 2 "How
 * to play" lines + a "Got it" CTA. Dismissal persists per-mode in
 * localStorage, with a re-open "?" pill in the corner.
 */
export default function PracticeInstructions({ mode, autoOpen = true }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY(mode));
      if (dismissed === '1') setOpen(false);
    } catch { /* ignore */ }
  }, [mode]);

  // ESC closes the modal (a11y standard for dialogs).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try { window.localStorage.setItem(STORAGE_KEY(mode), '1'); } catch { /* ignore */ }
  };

  const reopen = () => setOpen(true);

  const tips = TIPS_KEYS[mode];

  if (!open) {
    return (
      <button
        type="button"
        data-testid="practice-instructions-toggle"
        onClick={reopen}
        aria-label={t('practice.instructions.title')}
        className="fixed top-3 end-3 z-30 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-neo-black bg-neo-cream text-neo-black shadow-hard-sm hover:scale-105 active:translate-y-px transition-transform"
      >
        <HelpCircle className="w-5 h-5" aria-hidden />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('practice.instructions.title')}
    >
      {/* Backdrop — tap-to-dismiss, blocks clicks on the live mode underneath. */}
      <button
        type="button"
        data-testid="practice-instructions-backdrop"
        aria-label="dismiss"
        onClick={dismiss}
        className="absolute inset-0 bg-neo-navy/85 backdrop-blur-sm cursor-default"
      />

      <AdaptiveMotion.div
        data-testid="practice-instructions"
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`relative w-full max-w-sm rounded-neo border-3 border-neo-black ${ACCENT_BORDER[mode]} bg-neo-navy-light shadow-hard-lg max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col`}
      >
        {/* Mode-color bar at the top — same chunky brand language as the live HUD. */}
        <div className={`h-1.5 ${ACCENT_BG[mode]}`} aria-hidden />

        <button
          type="button"
          data-testid="practice-instructions-dismiss"
          onClick={dismiss}
          aria-label="dismiss"
          className="absolute top-2 end-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-neo-white hover:text-neo-white hover:bg-neo-cream/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Hero illustration. Capped height so the 2 tips + CTA always fit on
              short phones (iPhone SE, fold-front) without forcing scroll. */}
          <div className="relative w-full aspect-[4/3] max-h-[28vh] sm:max-h-[32vh] rounded-neo overflow-hidden border-2 border-neo-black flex-shrink-0">
            <Image
              src={HERO_SRC[mode]}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 384px"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col gap-3 text-neo-white">
            <h2
              className={`text-base font-neo-display font-black uppercase tracking-wider ${ACCENT_TEXT[mode]}`}
            >
              {t('practice.instructions.title')}
            </h2>

            <ul
              data-testid="practice-instructions-list"
              className="flex flex-col gap-2 text-[15px] font-neo-body leading-snug"
            >
              {tips.map((tipKey) => (
                <li key={tipKey} className="flex items-start gap-2">
                  <span aria-hidden className={`mt-0.5 font-black ${ACCENT_TEXT[mode]}`}>›</span>
                  <span>{t(tipKey)}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            data-testid="practice-instructions-cta"
            onClick={dismiss}
            className={`w-full inline-flex items-center justify-center rounded-neo border-3 border-neo-black ${ACCENT_BG[mode]} text-neo-black py-3 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed`}
          >
            {t('practice.instructions.cta')}
          </button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}
