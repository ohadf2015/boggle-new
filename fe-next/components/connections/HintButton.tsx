'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Lightbulb, Play, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { useRewardedFeatureUnlock } from '@/hooks/useRewardedFeatureUnlock';
import { freeHintsRemaining, consumeFreeHint } from '@/lib/connections/freeHints';

interface HintButtonProps {
  hasHint: boolean;
  hintRevealed: boolean;
  isAdmin: boolean;
  disabled: boolean;
  wrongAttempts: number;
  onRevealHint: () => void;
  adContext: Record<string, unknown>;
}

// before: a 44px-tall tap target centred on the h-9 pill (sized, not inset, so the border cannot shrink it).
const HINT_BTN =
  'relative inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 rounded-full border-2 border-neo-black bg-neo-yellow px-3 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm transition-[transform,box-shadow] duration-100 before:absolute before:inset-x-0 before:top-1/2 before:h-11 before:-translate-y-1/2 active:translate-y-px active:shadow-hard-pressed disabled:opacity-60';
const ICON = 'h-4 w-4 shrink-0';

/** One free hint a day; after that a short rewarded ad (native AdMob or the web provider). */
export default function HintButton({
  hasHint,
  hintRevealed,
  isAdmin,
  disabled,
  wrongAttempts,
  onRevealHint,
  adContext,
}: HintButtonProps) {
  const { t } = useLanguage();
  const [freeHints, setFreeHints] = useState(() => freeHintsRemaining());
  // The transient `disabled` prop stays off the hook: it would reset the offered latch and re-fire the event.
  const adButtonShown = !(isAdmin || hintRevealed || !hasHint || freeHints > 0);
  const ad = useRewardedFeatureUnlock({
    placement: 'connections_reveal_hint',
    surface: 'hint',
    onUnlock: onRevealHint,
    disabled: !adButtonShown,
    context: adContext,
  });
  const { variant, trackExposure } = useExperiment('exp-connections-hint-gate-v1');
  const showFallbackHint = variant === 'after-3-wrong' && wrongAttempts >= 3 && !isAdmin;
  useEffect(() => {
    if (showFallbackHint && hasHint && !hintRevealed) trackExposure();
  }, [showFallbackHint, hasHint, hintRevealed, trackExposure]);

  if (!hasHint || hintRevealed) return null;

  if (isAdmin || freeHints > 0) {
    return (
      <m.button
        type="button"
        data-testid="hint-free"
        onClick={() => {
          if (!isAdmin) setFreeHints(consumeFreeHint());
          onRevealHint();
        }}
        disabled={disabled}
        whileTap={{ scale: 0.95 }}
        className={HINT_BTN}
      >
        <Lightbulb className={ICON} strokeWidth={2.75} aria-hidden="true" />
        <span className="truncate">{isAdmin ? t('connections.revealHint') : t('connections.freeHint', { count: freeHints })}</span>
      </m.button>
    );
  }

  if (ad.canShowAd) {
    const busy = ad.status === 'loading' || ad.status === 'showing';
    return (
      <m.button
        type="button"
        data-testid="hint-ad"
        onClick={ad.offer}
        disabled={disabled || busy}
        whileTap={{ scale: 0.95 }}
        className={HINT_BTN}
      >
        {busy ? (
          <Loader2 className={`${ICON} animate-spin`} aria-hidden="true" />
        ) : (
          <Play className={`${ICON} fill-neo-navy`} strokeWidth={2.75} aria-hidden="true" />
        )}
        <span className="truncate">{t('connections.revealHintAd')}</span>
      </m.button>
    );
  }

  if (showFallbackHint) {
    return (
      <m.button type="button" onClick={onRevealHint} disabled={disabled} whileTap={{ scale: 0.95 }} className={HINT_BTN}>
        <Lightbulb className={ICON} strokeWidth={2.75} aria-hidden="true" />
        <span className="truncate">{t('connections.revealHint')}</span>
      </m.button>
    );
  }

  return (
    <span
      data-testid="hint-tomorrow"
      title={t('connections.hintTomorrow')}
      className="inline-flex h-9 min-w-0 max-w-full items-center gap-1.5 rounded-full border-2 border-neo-cream/40 px-2.5 font-neo-body text-xs font-bold text-neo-white/70"
    >
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{t('connections.hintTomorrow')}</span>
    </span>
  );
}
