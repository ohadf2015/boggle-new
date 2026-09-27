'use client';
import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';

type Props = {
  modeColor: string;
  levelNumber: number;
  themeWordCount: number;
  /** Theme words the player managed to find before running out of guesses. */
  wordsFound: number;
  onRetry: () => void;
  /** Optional escape to the home screen. Omitted = no Home button (back-compat). */
  onHome?: () => void;
};

/**
 * Shown when the player exhausts the level's strike budget (the lose condition).
 *
 * Deliberately NOT a celebration: no confetti, no stars, no coins. The tone is
 * "so close — go again", never punitive. A loss never advances the campaign, so
 * the only action is Try Again (re-mounts the same level fresh).
 */
export function BlastLevelFailedCard({
  modeColor,
  levelNumber,
  themeWordCount,
  wordsFound,
  onRetry,
  onHome,
}: Props) {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce || !cardRef.current) return;
    // A gentle, non-triumphant settle — drops in and steadies. No bounce, no
    // pop; the motion language for a loss is "regroup", not "party".
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { y: -24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' },
      );
    }, cardRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1530]/95 px-6">
      <div
        ref={cardRef}
        data-testid="failed-card"
        className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-7 text-center shadow-hard-lg"
      >
        <div className="relative mx-auto mb-4 h-28 w-28 animate-neo-wobble">
          <Image
            src="/mascot/waiting.webp"
            alt=""
            fill
            sizes="112px"
            className="object-contain drop-shadow-[3px_3px_0_#000]"
          />
        </div>

        <h2 className="font-neo-display text-2xl leading-tight text-neo-white">
          {t('blast.failed.title', 'Out of guesses!')}
        </h2>
        <p className="mt-2 font-neo-body text-sm text-neo-cream/80">
          {t('blast.failed.subtitle', 'So close — give it another shot.')}
        </p>

        <div
          data-testid="failed-progress"
          className="mx-auto mt-5 inline-flex items-center gap-2 rounded-neo border-neo border-black bg-neo-navy px-4 py-2 font-neo-display text-lg text-neo-white"
        >
          <span style={{ color: modeColor }}>{wordsFound}</span>
          <span className="text-neo-cream/50">/</span>
          <span>{themeWordCount}</span>
          <span className="ml-1 font-neo-body text-xs uppercase tracking-wide text-neo-cream/60">
            {t('blast.failed.wordsLabel', 'words')}
          </span>
        </div>

        <button
          type="button"
          onClick={onRetry}
          data-testid="retry-btn"
          className="mt-7 w-full rounded-neo border-neo-thick border-black px-8 py-3 font-neo-display text-lg uppercase tracking-wide text-black shadow-hard transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-hard-pressed"
          style={{ background: modeColor }}
        >
          {t('blast.failed.retry', 'Try Again')}
        </button>

        {onHome && (
          <button
            type="button"
            onClick={onHome}
            data-testid="failed-home-btn"
            className="mt-3 w-full rounded-neo border-neo border-black bg-transparent px-8 py-2 font-neo-body text-sm uppercase tracking-wide text-neo-cream/80 transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            {t('blast.failed.home', 'Home')}
          </button>
        )}

        <p className="mt-3 font-neo-body text-xs text-neo-cream/50">
          {t('blast.failed.progressSafe', 'Your progress is safe — level {n}').replace(
            '{n}',
            String(levelNumber),
          )}
        </p>
      </div>
    </div>
  );
}
