'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { X, HelpCircle, Sparkles, Swords, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isReducedMotionPreferred } from '@/utils/accessibility';

// v2: the Conquest rules replaced the Scrabble tutorial (center star + premium
// squares). Bumping the key re-shows the how-to once to returning players.
const STORAGE_KEY = 'wc_tutor_dismissed_v2';

export interface WordCraftTutorLabels {
  title: string;
  step1: string;
  step2: string;
  step3: string;
  tipFirst: string;
  tipScore: string;
  dismiss: string;
  show: string;
}

export interface WordCraftTutorProps {
  labels: WordCraftTutorLabels;
  isRTL?: boolean;
}

/**
 * Tutor renders as:
 *  - Always: a small "How to play" pill (inline in topbar).
 *  - First visit (no dismiss flag): an overlay card on top of the game so
 *    the underlying layout never has to expand for the tutor. Keeps the
 *    no-scroll viewport contract intact.
 *  - Click pill OR re-open via button: same overlay card returns.
 */
export function WordCraftTutor({ labels, isRTL }: WordCraftTutorProps) {
  // null = SSR / pre-hydration; we don't render the overlay until we know.
  const [open, setOpen] = useState<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open || !cardRef.current) return;
    if (isReducedMotionPreferred()) return;
    // Compositor-only entrance (transform + opacity) per animate-ai principles.
    gsap.fromTo(
      cardRef.current,
      { y: 24, opacity: 0, scale: 0.96 },
      { y: 0, opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' },
    );
    const steps = cardRef.current.querySelectorAll('[data-tutor-step]');
    gsap.fromTo(
      steps,
      { x: isRTL ? 12 : -12, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.22, stagger: 0.06, delay: 0.08, ease: 'power2.out' },
    );
  }, [open, isRTL]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    setOpen(false);
  };

  const reopen = () => setOpen(true);

  return (
    <>
      {/* Pill always visible in topbar */}
      <button
        type="button"
        onClick={reopen}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-neo border-2 border-black',
          'bg-neo-cyan-muted text-neo-navy text-[10px] font-neo-display font-black uppercase tracking-wider',
          'shadow-hard-sm hover:-translate-y-px transition-transform',
        )}
        aria-label={labels.show}
      >
        <HelpCircle className="w-3 h-3" />
        <span className="hidden sm:inline">{labels.show}</span>
      </button>

      {/* Overlay card */}
      {open === true && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={dismiss}
        >
          <div
            ref={cardRef}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'relative bg-neo-navy-light border-neo-thick border-black rounded-neo shadow-hard-lg',
              'w-full max-w-sm p-5 space-y-4',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-neo-display font-black uppercase tracking-wider text-neo-white text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-neo-yellow" aria-hidden />
                {labels.title}
              </h3>
              <button
                type="button"
                onClick={dismiss}
                aria-label={labels.dismiss}
                className="p-1.5 rounded-neo border-2 border-black bg-neo-navy text-neo-white hover:bg-neo-red hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-neo-white">
              <li data-tutor-step className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-neo-lime text-neo-navy font-neo-display font-black flex items-center justify-center border-2 border-black shadow-hard-sm">1</span>
                <span className="flex-1 pt-1">{labels.step1}</span>
              </li>
              <li data-tutor-step className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-neo-cyan text-neo-navy font-neo-display font-black flex items-center justify-center border-2 border-black shadow-hard-sm">2</span>
                <span className="flex-1 pt-1">{labels.step2}</span>
              </li>
              <li data-tutor-step className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-neo-pink text-white font-neo-display font-black flex items-center justify-center border-2 border-black shadow-hard-sm">3</span>
                <span className="flex-1 pt-1">{labels.step3}</span>
              </li>
            </ol>

            <div className="grid grid-cols-1 gap-2 text-[11px] text-neo-white pt-3 border-t border-black/30">
              <div className="flex items-center gap-2">
                <Swords className="w-4 h-4 text-neo-pink shrink-0" aria-hidden />
                <span>{labels.tipFirst}</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-neo-cyan shrink-0" aria-hidden />
                <span>{labels.tipScore}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={dismiss}
              className="w-full mt-2 h-10 rounded-neo border-neo-thick border-black bg-neo-lime text-neo-navy font-neo-display font-black uppercase tracking-wider shadow-hard hover:-translate-y-px active:translate-y-0 transition-transform"
            >
              {labels.dismiss}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
