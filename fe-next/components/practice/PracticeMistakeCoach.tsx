'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

export type MistakeCoachKind =
  | 'notAWord'
  | 'notAdjacent'
  | 'diagonalsOk'
  | 'needsCenter';

const IMAGE_FOR_KIND: Record<MistakeCoachKind, string> = {
  notAWord: '/practice/mistakes/not-a-word.png',
  notAdjacent: '/practice/mistakes/not-adjacent.png',
  diagonalsOk: '/practice/mistakes/diagonals-ok.png',
  needsCenter: '/practice/mistakes/needs-center.png',
};

const ACCENT_BORDER: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan',
  wordHunt: 'border-neo-lime',
  wheelRush: 'border-neo-purple',
};

const ACCENT_BG: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan',
  wordHunt: 'bg-neo-lime',
  wheelRush: 'bg-neo-purple',
};

const ACCENT_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-cyan',
  wordHunt: 'text-neo-lime',
  wheelRush: 'text-neo-purple',
};

interface Props {
  kind: MistakeCoachKind | null;
  mode: PracticeMode;
  onClose: () => void;
}

/**
 * Friendly contextual coach popup. Shown mid-game when the player makes a
 * common mistake (not a word, missing center letter, etc) — once per kind
 * per session so it never nags. Feels like a helpful buddy, not a teacher.
 */
export default function PracticeMistakeCoach({ kind, mode, onClose }: Props) {
  const { t } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();

  // ESC closes (a11y standard for dialogs).
  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, onClose]);

  const handleDismiss = useCallback(() => {
    playButtonClickSound();
    haptics.tap();
    onClose();
  }, [onClose, playButtonClickSound]);

  if (!kind) return null;

  // CSS-only entrance (no Framer): the panel's resting state is visible, so it
  // can never stay stuck invisible behind the backdrop — the bug that showed
  // these popups as a bare black overlay on RTL/Hebrew.
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('practice.mistakeCoach.ariaLabel')}
      data-testid="practice-mistake-coach"
    >
      {/* Backdrop — tap-to-dismiss with soft fade. */}
      <button
        type="button"
        data-testid="practice-mistake-coach-backdrop"
        aria-label={t('practice.mistakeCoach.cta')}
        onClick={handleDismiss}
        className="absolute inset-0 bg-neo-navy/90 backdrop-blur-sm cursor-default animate-fadeIn"
      />

      {/* Modal panel. */}
      <div
        data-testid={`practice-mistake-coach-panel-${kind}`}
        className={`relative w-full max-w-sm rounded-neo border-3 border-neo-black ${ACCENT_BORDER[mode]} bg-neo-navy-light shadow-hard-lg max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col animate-pop-in`}
      >
        {/* Mode-color accent bar at top — matches help modal language. */}
        <div className={`h-1.5 ${ACCENT_BG[mode]}`} aria-hidden />

        <button
          type="button"
          data-testid="practice-mistake-coach-dismiss"
          onClick={handleDismiss}
          aria-label={t('practice.mistakeCoach.cta')}
          className="absolute top-2 end-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full text-neo-white hover:text-neo-white hover:bg-neo-cream/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {/* Hero illustration — the visual story carries the lesson.
              Capped height (4:3 + max-vh) so body text + CTA always fit
              on short phones without forcing modal scroll. */}
          <div className="relative w-full aspect-[4/3] max-h-[28vh] sm:max-h-[32vh] rounded-neo overflow-hidden border-2 border-neo-black flex-shrink-0">
            <Image
              src={IMAGE_FOR_KIND[kind]}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 384px"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col gap-2 text-neo-white text-center">
            <h2
              className={`text-lg font-neo-display font-black ${ACCENT_TEXT[mode]}`}
            >
              {t(`practice.mistakeCoach.${kind}.title`)}
            </h2>
            <p className="text-sm font-neo-body text-neo-white leading-snug">
              {t(`practice.mistakeCoach.${kind}.body`)}
            </p>
          </div>

          <button
            type="button"
            data-testid="practice-mistake-coach-cta"
            onClick={handleDismiss}
            className={`w-full inline-flex items-center justify-center rounded-neo border-3 border-neo-black ${ACCENT_BG[mode]} text-neo-black py-3 font-neo-display font-black text-base shadow-hard active:translate-y-px active:shadow-hard-pressed`}
          >
            {t('practice.mistakeCoach.cta')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook that owns mistake-coach state for a practice session.
 *
 * - `active`: the currently-shown coach kind (or null).
 * - `trigger(kind)`: queues a coach popup. Each kind only shows once per
 *   hook instance (per-session, not per-tab). Pass-through if already shown.
 * - `openManual(kind)`: forces the popup open (used by the "?" help menu so
 *   players can browse coaching cards proactively).
 * - `close()`: closes the popup.
 *
 * Per-session dedup matches the friendly tone — we don't want to nag, but
 * we DO want fresh players to see each tip the first time it's relevant.
 */
export function usePracticeMistakeCoach() {
  const [active, setActive] = useState<MistakeCoachKind | null>(null);
  const seen = useRef<Set<MistakeCoachKind>>(new Set());

  const trigger = useCallback((kind: MistakeCoachKind) => {
    if (seen.current.has(kind)) return;
    seen.current.add(kind);
    setActive(kind);
  }, []);

  const openManual = useCallback((kind: MistakeCoachKind) => {
    setActive(kind);
  }, []);

  const close = useCallback(() => setActive(null), []);

  return { active, trigger, openManual, close };
}
