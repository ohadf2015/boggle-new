'use client';

import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFirstRunSeen } from '@/hooks/useFirstRunSeen';

interface HowToPlayCardProps {
  /** Unique per game — namespaces the "seen" flag in localStorage. */
  storageKey: string;
  title: string;
  /** 2–4 short, skimmable rule bullets (already translated). */
  steps: string[];
  /** Dismiss button label (already translated). */
  cta: string;
  /** Neo accent family for the panel border + button. */
  accent?: 'lime' | 'cyan' | 'pink' | 'purple';
}

const ACCENT: Record<NonNullable<HowToPlayCardProps['accent']>, { border: string; btn: string }> = {
  lime: { border: 'border-neo-lime', btn: 'bg-neo-lime text-neo-black' },
  cyan: { border: 'border-neo-cyan', btn: 'bg-neo-cyan text-neo-black' },
  pink: { border: 'border-neo-pink', btn: 'bg-neo-pink text-neo-white' },
  purple: { border: 'border-neo-purple', btn: 'bg-neo-purple text-neo-white' },
};

/**
 * First-run "How to play" overlay. Renders once per game per device, then never
 * again (localStorage). Skimmable 3-bullet rule reminder so first-time
 * playtesters never freeze on a blank board. RTL-aware via the active locale.
 */
export function HowToPlayCard({ storageKey, title, steps, cta, accent = 'cyan' }: HowToPlayCardProps) {
  const { seen, markSeen } = useFirstRunSeen(storageKey);
  const { language } = useLanguage();
  const reduced = useReducedMotion();
  const a = ACCENT[accent];

  if (seen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/80 backdrop-blur-sm p-4"
      dir={language === 'he' ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <m.div
        initial={reduced ? false : { scale: 0.9, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className={cn(
          'w-full max-w-sm rounded-neo border-neo-thick bg-neo-navy-light shadow-hard-lg p-6 flex flex-col gap-5',
          a.border,
        )}
      >
        <h2 className="text-2xl font-black uppercase font-neo-display text-neo-cream text-center tracking-tight">
          {title}
        </h2>
        <ul className="flex flex-col gap-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-neo-cream/90 font-neo-body text-base">
              <span className={cn('shrink-0 w-7 h-7 rounded-neo border-neo flex items-center justify-center font-black text-sm', a.btn)}>
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={markSeen}
          className={cn(
            'mt-1 w-full rounded-neo border-neo-thick border-black py-3 font-black uppercase font-neo-display shadow-hard',
            'active:translate-y-0.5 active:shadow-hard-pressed transition-transform',
            a.btn,
          )}
        >
          {cta}
        </button>
      </m.div>
    </div>
  );
}
